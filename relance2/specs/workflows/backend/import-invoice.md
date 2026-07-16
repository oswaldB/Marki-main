# Workflow Backend : Import des Factures (Invoice)

## Objectifs
- Importer les factures (pièces) depuis la base SQLite externe
- Synchroniser les contacts depuis la source externe
- Créer/mettre à jour les impayés dans SQLite Marki
- Attribuer automatiquement les séquences de relance

## Base de données
- **Source** : SQLite externe (`SYNC_DB_PATH`)
- **Cible** : SQLite Marki (`backend/data/marki.db`)

## Process (méga-fonction)

La méga-fonction `importInvoicesMaster()` orchestre 8 étapes séquentielles.

### Étape 1 : Récupération des Pièces et Dossiers
Connexion à la base SQLite externe et récupération des factures mises à jour dans les dernières 24h.

### Étape 2 : Récupération des Statuts
Query la table `_ADN_DIAG__StatutDossier` depuis SQLite source.

### Étape 3 : Récupération des Employés
Query la table `_ADN_RG_Employe` depuis SQLite source.

### Étape 4 : Récupération des Interlocuteurs et Création des Contacts
Query les interlocuteurs liés aux dossiers via tables de liaison, puis création/mise à jour des contacts dans Marki DB.

### Étape 5 : Traitement et Sauvegarde des Impayés
Pour chaque pièce, crée/met à jour l'impayé dans SQLite avec mapping des champs.

### Étape 6 : Attribution des Séquences
Pour chaque impayé sans séquence attribuée, détermine la séquence appropriée selon les règles d'attribution.

### Étape 7 : Génération des Relances
Crée les relances pour les impayés nouvellement importés avec séquence attribuée.

---

## Data Models

### Tables SQLite Source (externe)

| Table | Description |
|-------|-------------|
| `_GCO__GcoPiece` | Pièces/Factures |
| `_ADN_DIAG__Dossier` | Dossiers clients |
| `_ADN_RG_Interlocuteur` | Interlocuteurs/Contacts |
| `_ADN_RG_RelInterlocuteurContact` | Relations entreprise-employés |

### Tables SQLite Marki (cible)

| Table | Description |
|-------|-------------|
| `contacts` | Contacts importés |
| `impayes` | Impayés créés/mis à jour |
| `sequences` | Séquences de relance |

---

## Requêtes SQL

### QUERY_PIECES (Étape 1)
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
        'intitule', m.intitule
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
```sql
SELECT idStatut, intitule FROM _ADN_DIAG__StatutDossier
```

### QUERY_EMPLOYES (Étape 3)
```sql
SELECT idEmploye, prenom, nom FROM _ADN_RG_Employe
```

### QUERY_INTERLOCUTEURS (Étape 4)
```sql
SELECT
  d.idDossier,
  di.idRole,
  di.idInterlocuteur as interlocuteur_id,
  iloc.typePersonne,
  iloc.nom,
  iloc.prenom,
  iloc.email,
  iloc.telephoneMobile as telephone,
  role.intitule as role
FROM _ADN_DIAG__Dossier d
LEFT JOIN _ADN_DIAG__DossierInterlocuteur di ON d.idDossier = di.idDossier
LEFT JOIN _ADN_RG_Interlocuteur iloc ON di.idInterlocuteur = iloc.idInterlocuteur
LEFT JOIN _ADN_DIAG__RoleInterlocuteurDossier role ON di.idRole = role.idRole
WHERE d.idDossier IN ({dossierIds})
```

---

## Code Workflow (SQLite)

### Initialisation
```javascript
const SQLiteDB = require('../lib/sqlite-db');
const db = new SQLiteDB();
const Database = require('better-sqlite3');

// Connexion base externe
const syncDb = new Database(process.env.SYNC_DB_PATH || '/path/to/sync.db');

// Logger
async function log(level, message, data = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    data,
    workflow: 'import-invoice'
  };
  console.log(JSON.stringify(entry));
}
```

### Étape 1 : Récupération Pièces
```javascript
const piecesRows = syncDb.prepare(QUERY_PIECES).all();
await log('info', `${piecesRows.length} pièces récupérées`);
```

### Étape 4 : Création/MàJ Contacts
```javascript
// Récupérer contacts existants
const existingContacts = db.search('contacts', { limit: 10000 });
const existingMap = new Map(existingContacts.data.map(c => [c.id, c]));

for (const interloc of interlocuteurs) {
  const id = `cont_${Date.now()}_${interloc.idInterlocuteur}`;
  const contactData = {
    id,
    nom: interloc.nom,
    prenom: interloc.prenom,
    email: interloc.email,
    telephone: interloc.telephone,
    type_personne: interloc.typePersonne || 'P',
    statut: 'actif',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  const existing = existingMap.get(interloc.idInterlocuteur);
  if (existing) {
    db.update('contacts', existing.id, contactData);
  } else {
    db.create('contacts', contactData);
  }
}
```

### Étape 5 : Création/MàJ Impayés
```javascript
for (const piece of piecesRows) {
  const impayeData = {
    payer_id: null, // à mapper depuis interlocuteurs
    contact_relance_id: null,
    nfacture: String(piece.nfacture),
    date_echeance: piece.dateecheance,
    montant_ttc: piece.totalttcnet,
    reste_a_payer: piece.resteapayer,
    statut: piece.facturesoldee ? 'paye' : 'impaye',
    facture_soldee: piece.facturesoldee ? 1 : 0,
    numero_dossier: piece.numero,
    adresse_bien: `${piece.adresse} ${piece.codePostal} ${piece.ville}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  // Chercher existant
  const existing = db.queryOne(
    'SELECT * FROM impayes WHERE nfacture = ? AND numero_dossier = ?',
    [impayeData.nfacture, impayeData.numero_dossier]
  );
  
  if (existing) {
    db.update('impayes', existing.id, impayeData);
  } else {
    const id = `imp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    db.create('impayes', { ...impayeData, id });
  }
}
```

### Étape 6 : Attribution Séquences
```javascript
// Impayés sans séquence
const impayesSansSequence = db.query(
  `SELECT * FROM impayes 
   WHERE sequence_id IS NULL 
   AND facture_soldee = 0 
   AND statut = 'impaye'`,
  []
);

for (const impaye of impayesSansSequence) {
  const sequence = determinerSequence(impaye); // logique métier
  if (sequence) {
    db.update('impayes', impaye.id, { sequence_id: sequence.id });
  }
}
```

### Étape 7 : Génération Relances
```javascript
// Appeler le workflow generate-relances
const generateRelances = require('../generate-relances');
await generateRelances(db);
```

---

## Route API

```bash
POST /api/import/invoices

# cURL
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  "http://localhost:5000/api/import/invoices"
```

---

## Output

```json
{
  "status": 200,
  "data": {
    "pieces_count": 1547,
    "contacts_created": 89,
    "contacts_updated": 445,
    "impayes_created": 234,
    "impayes_updated": 1313,
    "sequences_attribuees": 1547,
    "duration_ms": 45230
  }
}
```

---

## Error Handling

| Erreur | Gestion |
|--------|---------|
| SQLite Error | Log erreur, retry 3x |
| Connexion perdue | Reconnexion automatique |
| Données invalides | Skip + log warning |
