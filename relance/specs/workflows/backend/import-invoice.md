# Workflow Backend : Import des Factures (Invoice)

## Objectifs
- Importer les factures (pièces) depuis la base SQLite externe
- Synchroniser les contacts, employés, statuts depuis la source externe
- Créer/mettre à jour les impayés dans Parse
- Attribuer automatiquement les séquences de relance
- Déclencher la génération des relances

## Process (méga-fonction)

La méga-fonction `importInvoicesMaster()` orchestre 8 étapes séquentielles dans un seul fichier.

### Étape 1 : Récupération des Pièces et Dossiers
Connexion à la base SQLite externe (`SYNC_DB_PATH`) et récupération des factures mises à jour dans les dernières 24h.

### Étape 2 : Récupération des Statuts
Query la table `_ADN_DIAG__StatutDossier` depuis SQLite.

### Étape 3 : Récupération des Employés
Query la table `_ADN_RG_Employe` depuis SQLite.

### Étape 4 : Récupération des Interlocuteurs et Création des Contacts
Query les interlocuteurs liés aux dossiers via `_ADN_DIAG__DossierInterlocuteur` et `_ADN_RG_RelInterlocuteurContact`, puis création/mise à jour des contacts dans la base flat-file.

### Étape 5 : Traitement et Sauvegarde des Impayés
Pour chaque pièce, crée/met à jour l'impayé dans Parse avec mapping des champs SQLite.

### Étape 6 : Attribution des Séquences
Pour chaque impayé sans séquence attribuée, détermine la séquence appropriée selon les règles d'attribution.

### Étape 7 : Récupération des Impayés avec Séquence
Query les impayés qui ont une séquence attribuée et sépare en deux groupes : sans relance / avec relance.

### Étape 8 : Génération des Relances
Appel de la Cloud Function `generateRelances` avec les IDs des impayés.

---

## Requêtes SQL

### QUERY_PIECES (Étape 1)
Récupère les pièces/factures avec leurs dossiers et missions (agrégées en JSON).

```sql
SELECT
  p.idpiece,
  p.nfacture,
  p.datecre,
  p.datepiece,
  p.dateecheance,
  p.totalhtnet,
  p.totalttcnet,
  p.resteapayer,
  p.facturesoldee,
  p.commentaire as commentaire_piece,
  p.refpiece,
  pm.idmetier as dossier_id,
  d.idDossier,
  d.idStatut,
  d.contactPlace,
  d.reference,
  d.referenceExterne,
  d.numero,
  d.idEmployeIntervention,
  d.commentaire as commentaire_dossier,
  d.adresse,
  d.cptAdresse,
  d.codePostal,
  d.ville,
  d.numeroLot,
  d.etage,
  d.entree,
  d.escalier,
  d.porte,
  d.numVoie,
  d.cptNumVoie,
  d.typeVoie,
  d.dateDebutMission,
  d.idCadreMission,
  (
    SELECT json_group_array(
      json_object(
        'idMission', m.idMission,
        'idCategorieMission', m.idCategorieMission,
        'idTypeMission', m.idTypeMission,
        'intitule', m.intitule,
        'titreRapport', m.titreRapport,
        'dateDebut', m.dateDebut,
        'dateFin', m.dateFin,
        'conclusion', m.conclusion
      )
    )
    FROM _ADN_DIAG__Mission m
    WHERE m.idDossier = d.idDossier
  ) as missions_json
FROM _GCO__GcoPiece p
LEFT JOIN _GCO__GcoPieceMetier pm ON p.idpiece = pm.idpiece
LEFT JOIN _ADN_DIAG__Dossier d ON pm.idmetier = d.idDossier
WHERE p.nfacture IS NOT NULL
  AND p.datemaj >= datetime('now', '-24 hours')
  AND p.resteapayer >= 0
  AND p.valide = 1
ORDER BY p.datepiece DESC
```

### QUERY_STATUTS (Étape 2)
Récupère les statuts des dossiers.

```sql
SELECT idStatut, intitule FROM _ADN_DIAG__StatutDossier
```

### QUERY_EMPLOYES (Étape 3)
Récupère les employés.

```sql
SELECT idEmploye, prenom, nom FROM _ADN_RG_Employe
```

### QUERY_INTERLOCUTEURS (Étape 4)
Récupère les interlocuteurs par dossier avec leurs rôles et contacts associés.

```sql
SELECT
  d.idDossier,
  di.idRole,
  di.idInterlocuteur as interlocuteur_id,
  di.idContact as contact_id,
  iloc.idInterlocuteur,
  iloc.typePersonne,
  iloc.nom,
  iloc.prenom,
  iloc.email,
  iloc.telephoneMobile as telephone,
  ilocContact.idInterlocuteur as contact_interlocuteur_id,
  ilocContact.typePersonne as contact_typePersonne,
  ilocContact.nom as contact_nom,
  ilocContact.prenom as contact_prenom,
  ilocContact.email as contact_email,
  role.intitule as role
FROM _ADN_DIAG__Dossier d
LEFT JOIN _ADN_DIAG__DossierInterlocuteur di ON d.idDossier = di.idDossier
LEFT JOIN _ADN_RG_Interlocuteur iloc ON di.idInterlocuteur = iloc.idInterlocuteur
LEFT JOIN _ADN_RG_Interlocuteur ilocContact ON di.idContact = ilocContact.idInterlocuteur
LEFT JOIN _ADN_DIAG__RoleInterlocuteurDossier role ON di.idRole = role.idRole
WHERE d.idDossier IN ({dossierIds})
```

### QUERY_REL_INTERLOCUTEUR_CONTACT (Étape 4)
Récupère les relations entreprise-employés.

```sql
SELECT idInterlocuteur, idContact, typeContact FROM _ADN_RG_RelInterlocuteurContact
```

---

## Data Model

### Tables SQLite Source

#### `_GCO__GcoPiece` (Pièces/Factures)
| Champ | Type | Description |
|-------|------|-------------|
| `idpiece` | number | ID de la pièce |
| `nfacture` | string | Numéro de facture |
| `datepiece` | string | Date de la facture |
| `dateecheance` | string | Date d'échéance |
| `totalttcnet` | number | Montant TTC |
| `resteapayer` | number | Reste à payer |
| `facturesoldee` | boolean | Facture soldée |
| `refpiece` | string | Référence piece |
| `idDossier` | number | ID du dossier lié |

#### `_ADN_DIAG__Dossier` (Dossiers)
| Champ | Type | Description |
|-------|------|-------------|
| `idDossier` | number | ID du dossier |
| `numero` | string | Numéro de dossier |
| `adresse` | string | Adresse du bien |
| `codePostal` | string | Code postal |
| `ville` | string | Ville |

#### `_ADN_RG_Interlocuteur` (Contacts)
| Champ | Type | Description |
|-------|------|-------------|
| `idInterlocuteur` | number | ID de l'interlocuteur |
| `nom` | string | Nom |
| `prenom` | string | Prénom |
| `email` | string | Email |
| `telephoneMobile` | string | Téléphone |
| `typePersonne` | string | Type (Physique/Morale) |

#### `_ADN_RG_RelInterlocuteurContact` (Relations)
| Champ | Type | Description |
|-------|------|-------------|
| `idInterlocuteur` | number | ID entreprise |
| `idContact` | number | ID employé |
| `typeContact` | string | Type de relation |

### Collections Parse

#### `impayes`
| Champ | Type | Source | Description |
|-------|------|--------|-------------|
| `id` | string | généré | ID unique |
| `nfacture` | number | `nfacture` | Numéro de facture |
| `date_piece` | date | `datepiece` | Date facture |
| `date_echeance` | date | `dateecheance` | Date échéance |
| `total_ttc` | number | `totalttcnet` | Montant TTC |
| `reste_a_payer` | number | `resteapayer` | Reste dû |
| `facture_soldee` | boolean | `facturesoldee` | Soldée |
| `url_pdf` | string | calculé | Lien PDF |
| `payeur` | Pointer | Contact | Contact payeur |
| `apporteur` | Pointer | Contact | Contact apporteur |
| `sequence` | Pointer | Sequence | Séquence attribuée |

#### `contacts`
| Champ | Type | Source | Description |
|-------|------|--------|-------------|
| `id` | string | généré | ID unique |
| `externe_id` | string | `idInterlocuteur` | ID source SQLite |
| `source` | string | fixé | `"db_externe"` |
| `nom` | string | `nom` | Nom |
| `prenom` | string | `prenom` | Prénom |
| `email` | string | `email` | Email |
| `entreprise` | Pointer | Contact | Entreprise liée |

---

## Organisation des fichiers

```
/backend/
├── import-invoice/
│   ├── index.js              # Point d'entrée (méga-fonction)
│   ├── specs/
│   │   └── spec.md           # Documentation du workflow
│   └── logs/                 # Logs quotidiens
│       └── YYYY-MM-DD.log
```

**Chemin complet:** `/backend/import-invoice/`

---

## Start

### Route
```bash
POST /api/import/invoices

# cURL
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  "http://adti.api2.markidiags.com/api/import/invoices"
```

### Cron (toutes les heures)
```javascript
cron.schedule("0 * * * *", () => {
  importInvoicesMaster({ trigger: "cron" });
});
```

### CLI
```bash
node index.js --trigger manual
node index.js --trigger test
```

---

## Process

### index.js
**Objectif :** Méga-fonction qui encapsule tout le workflow d'import dans un seul fichier.

#### Operations

**Initialisation**
```javascript
const fs = require('fs').promises;
const path = require('path');
const Database = require("better-sqlite3");
const LOG_DIR = path.join(__dirname, 'logs');

async function log(level, message, data = {}) {
  await fs.mkdir(LOG_DIR, { recursive: true });
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    data,
    workflow: 'import-invoice'
  };
  const file = path.join(LOG_DIR, `${new Date().toISOString().split('T')[0]}.log`);
  await fs.appendFile(file, JSON.stringify(entry) + '\n');
}

// Vider les logs au démarrage (sauf en test)
if (trigger !== 'test') {
  // clear logs logic
}
```

**Étape 1 : Fetch Pièces et Dossiers (SQL)**
```javascript
const dbPath = process.env.SYNC_DB_PATH || "/home/arthur/adti/sync.db";
const db = new Database(dbPath);

const QUERY_PIECES = `
  SELECT
    p.idpiece, p.nfacture, p.datecre, p.datepiece, p.dateecheance,
    p.totalhtnet, p.totalttcnet, p.resteapayer, p.facturesoldee,
    p.commentaire as commentaire_piece, p.refpiece,
    pm.idmetier as dossier_id, d.idDossier, d.idStatut, d.contactPlace,
    d.reference, d.referenceExterne, d.numero, d.idEmployeIntervention,
    d.commentaire as commentaire_dossier, d.adresse, d.cptAdresse,
    d.codePostal, d.ville, d.numeroLot, d.etage, d.entree, d.escalier,
    d.porte, d.numVoie, d.cptNumVoie, d.typeVoie, d.dateDebutMission,
    d.idCadreMission,
    (SELECT json_group_array(json_object(...)) FROM _ADN_DIAG__Mission m WHERE m.idDossier = d.idDossier) as missions_json
  FROM _GCO__GcoPiece p
  LEFT JOIN _GCO__GcoPieceMetier pm ON p.idpiece = pm.idpiece
  LEFT JOIN _ADN_DIAG__Dossier d ON pm.idmetier = d.idDossier
  WHERE p.nfacture IS NOT NULL
    AND p.datemaj >= datetime('now', '-24 hours')
    AND p.resteapayer >= 0 AND p.valide = 1
  ORDER BY p.datepiece DESC
`;

const piecesRows = db.prepare(QUERY_PIECES).all();
await log('info', `${piecesRows.length} pièces récupérées`);
```

**Étape 2 : Fetch Statuts (SQL)**
```javascript
const QUERY_STATUTS = `SELECT idStatut, intitule FROM _ADN_DIAG__StatutDossier`;
const statutsRows = db.prepare(QUERY_STATUTS).all();
const statutsMap = {};
statutsRows.forEach(s => statutsMap[s.idStatut] = s.intitule);
```

**Étape 3 : Fetch Employés (SQL)**
```javascript
const QUERY_EMPLOYES = `SELECT idEmploye, prenom, nom FROM _ADN_RG_Employe`;
const employesRows = db.prepare(QUERY_EMPLOYES).all();
const employesMap = {};
employesRows.forEach(e => employesMap[e.idEmploye] = e);
```

**Étape 4 : Fetch Interlocuteurs (SQL)**
```javascript
const dossierIds = [...new Set(pieces.map(p => p.dossier_id || p.idDossier).filter(id => id != null))];

const interlocuteursRows = db.prepare(`
  SELECT d.idDossier, di.idRole, di.idInterlocuteur as interlocuteur_id,
    di.idContact as contact_id, iloc.idInterlocuteur, iloc.typePersonne,
    iloc.nom, iloc.prenom, iloc.email, iloc.telephoneMobile as telephone,
    ilocContact.idInterlocuteur as contact_interlocuteur_id,
    ilocContact.typePersonne as contact_typePersonne,
    ilocContact.nom as contact_nom, ilocContact.prenom as contact_prenom,
    ilocContact.email as contact_email, role.intitule as role
  FROM _ADN_DIAG__Dossier d
  LEFT JOIN _ADN_DIAG__DossierInterlocuteur di ON d.idDossier = di.idDossier
  LEFT JOIN _ADN_RG_Interlocuteur iloc ON di.idInterlocuteur = iloc.idInterlocuteur
  LEFT JOIN _ADN_RG_Interlocuteur ilocContact ON di.idContact = ilocContact.idInterlocuteur
  LEFT JOIN _ADN_DIAG__RoleInterlocuteurDossier role ON di.idRole = role.idRole
  WHERE d.idDossier IN (${dossierIds.join(",")})
`).all();

// Grouper par dossier
const interlocuteursByDossier = {};
interlocuteursRows.forEach(i => {
  if (!interlocuteursByDossier[i.idDossier]) {
    interlocuteursByDossier[i.idDossier] = [];
  }
  interlocuteursByDossier[i.idDossier].push(i);
});
```

**Étape 4 (suite) : Récupération Relations Entreprise-Employés (SQL)**
```javascript
const relRows = db.prepare(`
  SELECT idInterlocuteur, idContact, typeContact FROM _ADN_RG_RelInterlocuteurContact
`).all();

const relInterlocuteurContactMap = {};
relRows.forEach(row => {
  if (!relInterlocuteurContactMap[row.idInterlocuteur]) {
    relInterlocuteurContactMap[row.idInterlocuteur] = [];
  }
  relInterlocuteurContactMap[row.idInterlocuteur].push({
    idContact: row.idContact,
    typeContact: row.typeContact
  });
});
```

**Étape 4 (suite) : Créer/MàJ Contacts dans la base**
```javascript
// Récupérer contacts existants par externe_id
const existingContacts = await db.search('contacts', { 
  externe_id: { $in: Array.from(contactIdsToCheck) }
});
const existingContactsMap = new Map(existingContacts.map(c => [c.externe_id, c]));

// Préparer et sauvegarder les contacts
for (const interloc of allInterlocuteurs) {
  const externeId = String(interloc.idInterlocuteur);
  const existing = existingContactsMap.get(externeId);
  
  const contactData = {
    externe_id: externeId,
    nom: interloc.nom || null,
    prenom: interloc.prenom || null,
    email: interloc.email || null,
    telephone: interloc.telephoneMobile || null,
    type_personne: interloc.typePersonne || null,
    source: 'db_externe'
  };
  
  if (existing) {
    await db.update('contacts', existing.id, contactData);
    existingContactsMap.set(externeId, { ...existing, ...contactData });
  } else {
    const newContact = await db.create('contacts', {
      id: `cont_${Date.now()}_${interloc.idInterlocuteur}`,
      ...contactData
    });
    existingContactsMap.set(externeId, newContact);
  }
}

// Lier employés aux entreprises
for (const [idEntreprise, employes] of Object.entries(relInterlocuteurContactMap)) {
  const entreprise = existingContactsMap.get(String(idEntreprise));
  for (const emp of employes) {
    const employe = existingContactsMap.get(String(emp.idContact));
    if (employe && entreprise && employe.id !== entreprise.id) {
      await db.update('contacts', employe.id, { entreprise_id: entreprise.id });
    }
  }
}
```

**Étape 5 : Process et Save Impayés**
```javascript
const impayesToSave = [];

for (const piece of pieces) {
  const externeId = Number(piece.nfacture);
  const dossierNum = piece.numero || piece.idDossier;
  
  // Chercher impayé existant
  const existingImpayes = await db.search('impayes', { 
    nfacture: externeId,
    numero_dossier: dossierNum
  });
  const existing = existingImpayes[0];
  let isNew = !existing;
  
  const impayeData = {
    externe_id: externeId,
    nfacture: Number(piece.nfacture),
    date_piece: piece.datepiece ? new Date(piece.datepiece).toISOString() : null,
    date_echeance: piece.dateecheance ? new Date(piece.dateecheance).toISOString() : null,
    total_ttc: piece.totalttcnet != null ? Number(piece.totalttcnet) : null,
    reste_a_payer: piece.resteapayer != null ? Number(piece.resteapayer) : null,
    facture_soldee: Boolean(piece.facturesoldee),
    url_pdf: buildUrlPdf(piece.refpiece, piece.datecre),
    id_dossier: piece.idDossier ? String(piece.idDossier) : null,
    numero_dossier: piece.numero || null,
    adresse_bien: buildAdresse(piece),
    code_postal: piece.codePostal || null,
    ville: piece.ville || null,
    source: 'db_externe'
  };
  
  // Missions depuis JSON
  if (piece.missions_json) {
    try {
      const parsed = JSON.parse(piece.missions_json);
      impayeData.missions = Array.isArray(parsed) ? parsed.filter(m => m && m.idMission) : [];
    } catch (e) { 
      impayeData.missions = []; 
    }
  }
  
  // Mapping des rôles vers champs
  const roleToFieldPrefix = {
    Payeur: "payeur",
    "Apporteur d'affaire": "apporteur",
    "Donneur d'ordre": "donneur_ordre",
    Propriétaire: "proprietaire",
  };
  
  const interlocuteurs = interlocuteursByDossier[piece.idDossier] || [];
  for (const [role, prefix] of Object.entries(roleToFieldPrefix)) {
    const interloc = interlocuteurs.find(i => i.role === role);
    if (interloc) {
      impayeData[`${prefix}_nom`] = interloc.nom || null;
      impayeData[`${prefix}_prenom`] = interloc.prenom || null;
      impayeData[`${prefix}_email`] = interloc.email || null;
    }
  }
  
  // Références vers contacts
  const payeurData = interlocuteurs.find(i => i.role === "Payeur" && i.idInterlocuteur);
  if (payeurData) {
    const payeurContact = contactsMap.get(String(payeurData.idInterlocuteur));
    if (payeurContact) impayeData.payeur_id = payeurContact.id;
  }
  
  if (existing) {
    await db.update('impayes', existing.id, impayeData);
  } else {
    const newImpaye = await db.create('impayes', {
      id: `imp_${externeId}`,
      ...impayeData
    });
    impayesToSave.push(newImpaye);
  }
}
```

**Étape 6 : Attribution des Séquences**
```javascript
const impayesSansSequence = await db.search('impayes', { 
  sequence_id: null,
  facture_soldee: false
});

for (const impaye of impayesSansSequence) {
  const sequence = await appliquerReglesAttributionAutomatique(impaye);
  if (sequence) {
    await db.update('impayes', impaye.id, { sequence_id: sequence.id });
  }
}
```

**Étape 7 : Fetch Impayés avec Séquence**
```javascript
const impayesAvecSequence = await db.search('impayes', {
  facture_soldee: false,
  reste_a_payer: { $gt: 0 },
  sequence_id: { $ne: null }
});

// Charger les séquences séparément
const sequenceIds = [...new Set(impayesAvecSequence.map(i => i.sequence_id).filter(Boolean))];
const sequences = await Promise.all(sequenceIds.map(id => db.read('sequences', id)));
const sequencesMap = new Map(sequences.map(s => [s.id, s]));

// Filtrer ceux avec séquence valide
const impayesFiltres = impayesAvecSequence.filter(imp => sequencesMap.has(imp.sequence_id));

// Récupérer relances existantes
const allRelances = await db.search('relances', {});
const relancesParImpaye = new Map();
for (const relance of allRelances) {
  for (const impayeId of relance.impaye_ids || []) {
    if (!relancesParImpaye.has(impayeId)) {
      relancesParImpaye.set(impayeId, relance);
    }
  }
}

const sansRelance = [];
const avecRelance = [];
for (const impaye of impayesFiltres) {
  if (relancesParImpaye.has(impaye.id)) {
    avecRelance.push({ 
      impaye, 
      relance: relancesParImpaye.get(impaye.id) 
    });
  } else {
    sansRelance.push(impaye);
  }
}
```

**Étape 8 : Appel Generate Relances**
```javascript
try {
  const generateResult = await {
    sansRelanceIds: sansRelance.map(i => i.id),
    avecRelance: avecRelance.map(r => ({
      impayeId: r.impaye?.id || r.impaye,
      relanceId: r.relance?.id
    }))
  });
  
  await log('info', 'Generate relances terminé', {
    created: generateResult.stats.etape1?.relancesCreated || 0,
    generated: generateResult.stats.etape2?.processed || 0
  });
} catch (cloudErr) {
  await log('error', 'Erreur generateRelances', { error: cloudErr.message });
}
```

#### Output
```javascript
{
  "status": 200,
  "data": {
    "etape1": { "piecesCount": 1547 },
    "etape2": { "statutsCount": 12 },
    "etape3": { "employesCount": 45 },
    "etape4": { "dossiersCount": 892 },
    "etape5": { 
      "impayes_created": 234,
      "impayes_updated": 1313,
      "contacts_created": 89,
      "contacts_updated": 445
    },
    "etape6": {
      "impayesTraites": 1547,
      "sequencesAttribuees": 1547
    },
    "etape7": {
      "sansRelance": 89,
      "avecRelance": 1458
    },
    "generateRelances": {
      "relancesCreated": 89,
      "relancesGenerated": 89
    },
    "durationMs": 45230
  }
}
```

---

## Error Handling

| Code | Description |
|------|-------------|
| SQLite Error | Erreur connexion/requête → log erreur, retry 3x avec délai |
| Parse Error | Erreur création/mise à jour → log erreur, continue batch suivant |
| GenerateRelances | Erreur Cloud Function → log erreur, import terminé mais relances non générées |

### Gestion des erreurs
- Chaque étape est isolée avec try/catch
- Les erreurs sont accumulées dans `stats.errors`
- Mode batch avec `db.create()` et `db.update()` pour optimiser les performances
- Retry automatique sur erreurs SQLite (malformed database)
