# Fonctionnement de syncImpayes - Backend

## Table des matières
1. [Aperçu général](#aperçu-général)
2. [Données entrantes](#données-entrantes)
3. [Point d'entrée](#point-dentrée)
4. [Requêtes SQL](#requêtes-sql)
5. [Processus de traitement](#processus-de-traitement)
6. [Traitement des contacts](#traitement-des-contacts)
7. [Traitement des impayés](#traitement-des-impayés)
8. [Logging et traçabilité](#logging-et-traçabilité)
9. [Résultat](#résultat)
10. [Flux de données](#flux-de-données)
11. [Dépendances](#dépendances)
12. [Schéma des tables SQL](#schéma-des-tables-sql)

---

## Aperçu général

Le script **`syncImpayes`** synchronise les données d'impayés et de contacts depuis une base de données **SQLite externe** (Analyse Immo / ADN) vers **Parse Server**. 

**Objectif** : Importer les factures impayées, les dossiers associés et les interlocuteurs pour permettre la génération automatique des relances par email.

**Fréquence** : Exécuté régulièrement via un trigger (cron, manuel, ou workflow maître).

---

## Données entrantes

La fonction `syncImpayes` accepte un paramètre optionnel :

| Paramètre | Type | Obligatoire | Valeur par défaut | Description |
|----------|------|-------------|-------------------|-------------|
| `trigger` | String | ❌ Non | `'cron'` | Origine de l'exécution (cron, manual, test, api) |

### Exemple d'appel
```javascript
// Appel direct
await syncImpayes({ trigger: 'manual' });

// Appel via le workflow maître
await syncImpayes({ trigger: 'cron' });
```

---

## Point d'entrée

**Fichier** : `backend/cloud/workflows/import-invoice/01-syncImpayes.js`

**Export** :
```javascript
module.exports = syncImpayes;
```

**Intégration** : Appelé par `00-master.js` (workflow `importInvoicesMaster`) en étape 1/5.

---

## Requêtes SQL

Le script utilise **4 requêtes SQL principales** pour extraire les données depuis la base SQLite.

### Configuration de la base de données

```javascript
// Chemin de la base SQLite
const dbPath = process.env.NODE_ENV === 'test' && process.env.TEST_DB_PATH
  ? process.env.TEST_DB_PATH
  : '/home/arthur/adti/sync.db';

// Ouverture avec retry en cas de corruption
async function openDatabaseWithRetry(path, maxRetries = 3, retryDelayMs = 60000) {
  // Teste la connexion avant de retourner la DB
  const db = new Database(path);
  db.prepare('SELECT 1').get();  // Test de connexion
  return db;
}
```

---

### Requête 1 : Pièces + Dossiers (QUERY_PIECES)

**Objectif** : Récupérer toutes les pièces (factures) avec leurs dossiers associés.

```sql
SELECT
    p.idpiece,
    p.nfacture,
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
    d.dateDebutMission
  FROM _GCO__GcoPiece p
  LEFT JOIN _GCO__GcoPieceMetier pm ON p.idpiece = pm.idpiece
  LEFT JOIN _ADN_DIAG__Dossier d ON pm.idmetier = d.idDossier
  WHERE p.nfacture IS NOT NULL
    AND p.datepiece >= datetime('now', '-3 years')
    AND p.datepiece < datetime('now', '+1 day')
    AND p.valide = 1
    AND p.resteapayer >= 0
  ORDER BY p.datepiece DESC
```

**Filtres appliqués** :
- `p.nfacture IS NOT NULL` → Seules les pièces avec numéro de facture
- `p.datepiece >= datetime('now', '-3 years')` → Factures des 3 dernières années
- `p.datepiece < datetime('now', '+1 day')` → Exclut les factures futures
- `p.valide = 1` → Seules les pièces validées
- `p.resteapayer >= 0` → Seules les pièces avec un reste à payer positif ou nul

**Tri** : `ORDER BY p.datepiece DESC` (du plus récent au plus ancien)

---

### Requête 2 : Statuts des dossiers (QUERY_STATUTS)

**Objectif** : Récupérer la liste des statuts disponibles pour les dossiers.

```sql
SELECT idStatut, intitule FROM _ADN_DIAG__StatutDossier
```

**Résultat** : Mappé dans un objet `statutsMap` pour référence rapide :
```javascript
const statutsMap = {};
statutsRows.forEach(s => { 
  statutsMap[s.idStatut] = s.intitule; 
});
// Exemple: { "1": "En cours", "2": "Terminé", ... }
```

---

### Requête 3 : Employés (QUERY_EMPLOYES)

**Objectif** : Récupérer la liste des employés pour identifier l'intervenant.

```sql
SELECT idEmploye, prenom, nom FROM _ADN_RG_Employe
```

**Résultat** : Mappé dans un objet `employesMap` :
```javascript
const employesMap = {};
employesRows.forEach(e => { 
  employesMap[e.idEmploye] = e; 
});
// Exemple: { "123": { idEmploye: 123, prenom: "Jean", nom: "Dupont" }, ... }
```

---

### Requête 4 : Interlocuteurs par dossier (QUERY_INTERLOCUTEURS)

**Objectif** : Récupérer tous les interlocuteurs associés aux dossiers des pièces.

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
  WHERE d.idDossier IN (
    SELECT DISTINCT d2.idDossier 
    FROM _ADN_DIAG__Dossier d2 
    JOIN _GCO__GcoPieceMetier pm2 ON d2.idDossier = pm2.idmetier 
    JOIN _GCO__GcoPiece p2 ON pm2.idpiece = p2.idpiece 
    WHERE p2.nfacture IS NOT NULL 
      AND p2.datepiece >= datetime('now', '-3 years')
      AND p2.datepiece < datetime('now', '+1 day')
      AND p2.valide = 1 
      AND p2.resteapayer >= 0
  )
```

**Sous-requête** : La clause `WHERE d.idDossier IN (...)` utilise la même logique de filtrage que QUERY_PIECES pour ne récupérer que les interlocuteurs des dossiers pertinents.

**Résultat** : Regroupé par dossier dans `interlocuteursByDossier` :
```javascript
const interlocuteursByDossier = {};
interlocuteursRows.forEach(i => {
  if (!interlocuteursByDossier[i.idDossier]) {
    interlocuteursByDossier[i.idDossier] = [];
  }
  interlocuteursByDossier[i.idDossier].push(i);
});
```

---

## Processus de traitement

### Étapes principales

```
1. Initialisation
   ├─ Chargement des variables d'environnement
   ├─ Ouverture de la base SQLite
   └─ Initialisation du logger
   ↓
2. Exécution des requêtes SQL
   ├─ QUERY_PIECES → piecesRows[]
   ├─ QUERY_STATUTS → statutsMap{}
   ├─ QUERY_EMPLOYES → employesMap{}
   └─ QUERY_INTERLOCUTEURS → interlocuteursByDossier{}
   ↓
3. Boucle sur chaque pièce (piecesRows)
   ├─ 3.1. Récupération des interlocuteurs du dossier
   ├─ 3.2. Traitement des contacts (5 types)
   │   ├─ Payeur (entreprise + personne physique)
   │   ├─ Apporteur d'affaire (entreprise + personne physique)
   │   └─ Autres rôles (Propriétaire, Syndic, Notaire, etc.)
   └─ 3.3. Traitement de l'impayé
       ├─ Upsert dans Parse
       ├─ Mappage des champs SQL → Parse
       └─ Création de l Aktivite de log
   ↓
4. Finalisation
   ├─ Fermeture de la base SQLite
   └─ Retour des statistiques
```

---

## Traitement des contacts

### Fonction `upsertContact()`

Gère la création ou la mise à jour d'un contact dans Parse Server.

```javascript
async function upsertContact({ 
  externeId, 
  nom, 
  prenom, 
  email, 
  telephone, 
  typePersonne 
}) {
  if (!externeId || !nom) return null;

  let Contact = Parse.Object.extend('Contact');
  let q = new Parse.Query(Contact);
  q.equalTo('externe_id', String(externeId));
  let contact = await q.first({ useMasterKey: true });

  if (!contact) {
    contact = new Contact();
    contact.set('externe_id', String(externeId));
    contact.set('source', 'db_externe');
  }

  contact.set('nom', nom);
  contact.set('prenom', prenom || null);
  contact.set('type_personne', typePersonne || null);

  // Ne pas écraser email/telephone si déjà renseignés
  if (email && !contact.get('email'))         contact.set('email', email);
  if (telephone && !contact.get('telephone')) contact.set('telephone', telephone);

  await contact.save(null, { useMasterKey: true });
  return contact;
}
```

**Clé d'identification** : `externe_id` (ID provenant de la base SQLite)

**Source** : `source: 'db_externe'` pour tracer l'origine

**Règle de non-écrasement** : Les champs `email` et `telephone` ne sont pas mis à jour s'ils existent déjà dans Parse.

---

### Types de contacts traités

Le script traite **10 types d'interlocuteurs** différents :

| Type de rôle | Description | Champs stockés |
|-------------|-------------|----------------|
| `Payeur` | Entreprise ou personne qui doit payer | nom, prenom, email, telephone, typePersonne |
| `Apporteur d'affaire` | Intermédiaire commercial | nom, prenom, email, telephone, typePersonne |
| `Propriétaire` | Propriétaire du bien | nom, prenom, email, telephone, typePersonne |
| `Acquéreur` | Acheteur du bien | nom, prenom, email, telephone |
| `Donneur d'ordre` | Personne qui commande | nom, prenom, email, telephone |
| `Locataire entrant` | Locataire qui emménage | nom, prenom, email, telephone |
| `Locataire sortant` | Locataire qui quitte | nom, prenom, email, telephone |
| `Notaire` | Notaire impliqué | nom, prenom, email, telephone |
| `Syndic` | Syndic de copropriété | nom, prenom, email, telephone |

---

### Logique de traitement des contacts

Pour chaque pièce, le script :

1. **Identifie les interlocuteurs du dossier** :
   ```javascript
   const dossierId = pieceRow.dossier_id || pieceRow.idDossier;
   const interlocuteurs = interlocuteursByDossier[dossierId] || [];
   ```

2. **Extrait les interlocuteurs par rôle** :
   ```javascript
   const payeurContactData = getInterlocuteurDataByRole(interlocuteurs, 'Payeur');
   const payeurPersonneData = interlocuteurs.find(i => i.role === 'Payeur' && i.idContact);
   const apporteurContactData = getInterlocuteurDataByRole(interlocuteurs, 'Apporteur d\'affaire');
   const apporteurPersonneData = interlocuteurs.find(i => i.role === 'Apporteur d\'affaire' && i.idContact);
   ```

3. **Crée/met à jour chaque contact** :
   - **Personne physique** (si `idContact` existe)
   - **Entreprise/Contact principal** (si `idInterlocuteur` existe)
   - **Liaison employe-entreprise** via `lierEmployeEntreprise()`

4. **Incrémente les statistiques** :
   ```javascript
   if (isNew) stats.contacts_created++; 
   else stats.contacts_updated++;
   ```

---

## Traitement des impayés

### Création/Mise à jour d'un impayé

```javascript
// Convertir nfacture en Number pour externe_id
const externeId = Number(pieceRow.nfacture);

let Impaye = Parse.Object.extend('Impaye');
let qi = new Parse.Query(Impaye);
qi.equalTo('externe_id', externeId);
let impaye = await qi.first({ useMasterKey: true });
let isNewImpaye = !impaye;

if (!impaye) {
  impaye = new Impaye();
  impaye.set('externe_id', externeId);
  impaye.set('source', 'db_externe');
}
```

**Clé d'identification** : `externe_id` = `Number(pieceRow.nfacture)`

---

### Mappage des champs SQL → Parse

#### Champs de base de la pièce

```javascript
impaye.set('nfacture',          Number(pieceRow.nfacture));
impaye.set('date_piece',        pieceRow.datepiece  ? new Date(pieceRow.datepiece)       : null);
impaye.set('date_echeance',     pieceRow.dateecheance ? new Date(pieceRow.dateecheance)   : null);
impaye.set('date_debut_mission', pieceRow.dateDebutMission ? new Date(pieceRow.dateDebutMission) : null);
impaye.set('total_ht',          pieceRow.totalhtnet  != null ? Number(pieceRow.totalhtnet)  : null);
impaye.set('total_ttc',         pieceRow.totalttcnet != null ? Number(pieceRow.totalttcnet) : null);
impaye.set('reste_a_payer',     pieceRow.resteapayer != null ? Number(pieceRow.resteapayer) : null);
impaye.set('facture_soldee',    Boolean(pieceRow.facturesoldee));
impaye.set('commentaire_piece', pieceRow.commentaire_piece || null);
impaye.set('ref_piece',         pieceRow.refpiece || null);
impaye.set('url_pdf',           buildUrlPdf(pieceRow.refpiece, pieceRow.datecre));
```

#### Champs du dossier

```javascript
impaye.set('id_dossier',        pieceRow.idDossier   ? String(pieceRow.idDossier)   : null);
impaye.set('numero_dossier',    pieceRow.numero      || null);
impaye.set('reference',         pieceRow.reference   || null);
impaye.set('reference_externe', pieceRow.referenceExterne || null);
impaye.set('statut_dossier',    statutIntitule  || null);
impaye.set('commentaire_dossier', pieceRow.commentaire_dossier || null);
impaye.set('employe_intervention', employeIntervention || null);
```

#### Champs d'adresse

```javascript
impaye.set('adresse_bien',      buildAdresse(pieceRow));
impaye.set('code_postal',       pieceRow.codePostal  || null);
impaye.set('ville',             pieceRow.ville       || null);
impaye.set('numero_lot',        pieceRow.numeroLot   || null);
impaye.set('etage',             pieceRow.etage       || null);
impaye.set('entree',            pieceRow.entree      || null);
impaye.set('escalier',          pieceRow.escalier    || null);
impaye.set('porte',             pieceRow.porte       || null);
```

**Fonction `buildAdresse()`** :
```javascript
function buildAdresse(row) {
  return [row.numVoie, row.cptNumVoie, row.typeVoie, row.adresse, row.cptAdresse]
    .filter(Boolean).join(' ').trim() || null;
}
```

#### Champs des interlocuteurs (à plat)

Pour chaque type d'interlocuteur, les champs sont extraits et stockés directement dans l'impayé :

```javascript
// Payeur
impaye.set('payeur_nom',              getInterlocuteurField('Payeur', 'nom'));
impaye.set('payeur_prenom',          getInterlocuteurField('Payeur', 'prenom'));
impaye.set('payeur_email',            getInterlocuteurField('Payeur', 'email'));
impaye.set('payeur_telephone',        getInterlocuteurField('Payeur', 'telephone'));
impaye.set('payeur_type_personne',    getInterlocuteurField('Payeur', 'typePersonne'));
// ... + contact_nom, contact_prenom, contact_email

// Apporteur d'affaire
impaye.set('apporteur_nom',           getInterlocuteurField('Apporteur d\'affaire', 'nom'));
impaye.set('apporteur_prenom',       getInterlocuteurField('Apporteur d\'affaire', 'prenom'));
// ... etc

// Propriétaire
impaye.set('proprietaire_nom',        getInterlocuteurField('Propriétaire', 'nom'));
impaye.set('proprietaire_prenom',    getInterlocuteurField('Propriétaire', 'prenom'));
impaye.set('proprietaire_email',      getInterlocuteurField('Propriétaire', 'email'));
impaye.set('proprietaire_telephone',  getInterlocuteurField('Propriétaire', 'telephone'));
impaye.set('proprietaire_type_personne', getInterlocuteurField('Propriétaire', 'typePersonne'));
// ...

// Syndic, Notaire, Donneur d'ordre, Locataire entrant/sortant, Acquéreur
```

#### Pointers vers les contacts

```javascript
if (payeurContact)    impaye.set('payeur',    payeurContact);
if (apporteurContact) impaye.set('apporteur', apporteurContact);
```

#### Calcul du type de payeur

```javascript
const payeurNom = getInterlocuteurField('Payeur', 'nom');
const proprietaireNom = getInterlocuteurField('Propriétaire', 'nom');
const apporteurNom = getInterlocuteurField('Apporteur d\'affaire', 'nom');
let payeurType = 'Autre';

if (payeurNom && proprietaireNom && payeurNom === proprietaireNom) {
  payeurType = 'Propriétaire';
} else if (payeurNom && apporteurNom && payeurNom === apporteurNom) {
  payeurType = 'Apporteur d\'affaire';
}

impaye.set('payeur_type', payeurType);
```

---

### Gestion du contact_relance

Le contact de relance est défini uniquement **à la création** de l'impayé :

```javascript
// contact_relance : défini uniquement à la création
if (isNewImpaye) {
  let defaultRelance = payeurPersonne || payeurContact;
  if (defaultRelance) impaye.set('contact_relance', defaultRelance);
}
```

**Priorité** : `payeurPersonne` (personne physique) > `payeurContact` (entreprise)

---

## Logging et traçabilité

### 1. Statistiques internes

```javascript
const stats = {
  impayes_created: 0,
  impayes_updated: 0,
  contacts_created: 0,
  contacts_updated: 0,
  errors: []
};
```

### 2. Logs dans Parse (Activite)

Pour chaque impayé traité, une entrée `Activite` est créée si :
- C'est une **création** (`isNewImpaye`)
- Il y a des **changements** (`hasChanges(oldValues, newValues)`)

```javascript
let activite = new Parse.Object('Activite');
activite.set('type', 'sync_impaye');
activite.set('operation', isNewImpaye ? 'created' : 'updated');
activite.set('nfacture', pieceRow.nfacture);
activite.set('impaye_id', impaye.id);
activite.set('montant', pieceRow.resteapayer != null ? Number(pieceRow.resteapayer) : null);
activite.set('payeur_nom', getInterlocuteurField('Payeur', 'nom') || null);
activite.set('date_piece', pieceRow.datepiece ? new Date(pieceRow.datepiece) : null);
activite.set('trigger', trigger);
activite.set('timestamp', new Date());
await activite.save(null, { useMasterKey: true });
```

### 3. Logs d'erreur

En cas d'erreur sur un impayé :

```javascript
stats.errors.push({ nfacture: pieceRow.nfacture, error: err.message });

// Création d'une Activite d'erreur
let activite = new Parse.Object('Activite');
activite.set('type', 'sync_impaye');
activite.set('operation', 'error');
activite.set('nfacture', pieceRow.nfacture);
activite.set('error_message', err.message);
activite.set('trigger', trigger);
activite.set('timestamp', new Date());
```

---

## Résultat

### Objet retourné

```javascript
{
  impayes_created: 42,      // Nombre de nouveaux impayés créés
  impayes_updated: 8,       // Nombre d'impayés mis à jour
  contacts_created: 15,     // Nombre de nouveaux contacts créés
  contacts_updated: 5,      // Nombre de contacts mis à jour
  errors: [                // Liste des erreurs
    { nfacture: "FACT-001", error: "Erreur de conversion de date" },
    { nfacture: "FACT-002", error: "Contact introuvable" }
  ]
}
```

---

## Flux de données

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         syncImpayes()                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│  PARAMS: { trigger: 'cron' }                                                │
└──────────────────────────────────┬──────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  ÉTAPE 1: INITIALISATION                                                    │
│  ├─ Chargement .env                                                          │
│  ├─ Ouverture DB SQLite: /home/arthur/adti/sync.db                         │
│  └─ Initialisation logger                                                   │
└──────────────────────────────────┬──────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  ÉTAPE 2: EXÉCUTION DES REQUIÊTES SQL                                         │
│  ├─ QUERY_PIECES (2000+ rows)                                               │
│  │  FROM _GCO__GcoPiece p                                                   │
│  │  LEFT JOIN _GCO__GcoPieceMetier pm ON p.idpiece = pm.idpiece             │
│  │  LEFT JOIN _ADN_DIAG__Dossier d ON pm.idmetier = d.idDossier            │
│  │  WHERE p.nfacture IS NOT NULL                                           │
│  │    AND p.datepiece >= datetime('now', '-3 years')                       │
│  │    AND p.valide = 1                                                     │
│  │    AND p.resteapayer >= 0                                              │
│  │  ORDER BY p.datepiece DESC                                              │
│  │                                                                         │
│  ├─ QUERY_STATUTS                                                          │
│  │  SELECT idStatut, intitule FROM _ADN_DIAG__StatutDossier                │
│  │                                                                         │
│  ├─ QUERY_EMPLOYES                                                         │
│  │  SELECT idEmploye, prenom, nom FROM _ADN_RG_Employe                     │
│  │                                                                         │
│  └─ QUERY_INTERLOCUTEURS (avec sous-requête IN)                           │
│     SELECT d.idDossier, di.idRole, iloc.*, role.intitule as role          │
│     FROM _ADN_DIAG__Dossier d                                              │
│     LEFT JOIN _ADN_DIAG__DossierInterlocuteur di ON d.idDossier = di.idDossier│
│     LEFT JOIN _ADN_RG_Interlocuteur iloc ON di.idInterlocuteur = iloc.idInterlocuteur│
│     WHERE d.idDossier IN (SELECT ... FROM pieces)                       │
└──────────────────────────────────┬──────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  ÉTAPE 3: BOUCLE SUR LES PIÈCES (piecesRows.forEach)                         │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │  3.1. Récupération interlocuteurs du dossier                            ││
│  │     const interlocuteurs = interlocuteursByDossier[dossierId] || [];  ││
│  │                                                                         ││
│  │  3.2. Traitement des contacts (4 types principaux)                    ││
│  │     ┌──────────────────────────────────────────────────────────────┐││
│  │     │ • Payeur (entreprise + personne physique)                     │││
│  │     │   ├── upsertContact() avec externe_id = idInterlocuteur        │││
│  │     │   └── lierEmployeEntreprise()                                   │││
│  │     │ • Apporteur d'affaire (même logique)                            │││
│  │     │ • Propriétaire, Syndic, Notaire, ... (champs à plat)            │││
│  │     └──────────────────────────────────────────────────────────────┘││
│  │                                                                         ││
│  │  3.3. Traitement de l'impayé                                           ││
│  │     ┌──────────────────────────────────────────────────────────────┐││
│  │     │ • Upsert Impaye avec externe_id = Number(nfacture)             │││
│  │     │ • Mappage des champs SQL → Parse (50+ champs)                   │││
│  │     │   ├── Champs pièce (nfacture, dates, montants)                │││
│  │     │   ├── Champs dossier (reference, statut, commentaire)         │││
│  │     │   ├── Champs adresse (adresse_bien, code_postal, ville)         │││
│  │     │   └── Champs interlocuteurs (10 types × 4 champs chacun)      │││
│  │     │ • Pointers vers contacts (payeur, apporteur)                  │││
│  │     │ • Calcul payeur_type (Propriétaire/Apporteur/Autre)           │││
│  │     │ • Sauvegarde dans Parse                                         │││
│  │     └──────────────────────────────────────────────────────────────┘││
│  │                                                                         ││
│  │  3.4. Logging                                                          ││
│  │     • Activite (si création ou modification)                         │││
│  │     └─ Activite (si erreur)                                            ││
│  └─────────────────────────────────────────────────────────────────────────┘
└──────────────────────────────────┬──────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  ÉTAPE 4: FINALISATION                                                      │
│  ├─ Fermeture DB SQLite: db.close()                                         │
│  └─ Retour: { impayes_created, impayes_updated, contacts_created, ... }     │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Dépendances

### Fichiers internes

| Fichier | Rôle |
|--------|------|
| `01-syncImpayes.js` | Logique principale de synchronisation |
| `00-master.js` | Orchestrateur du workflow import-invoice (appelle syncImpayes en étape 1) |
| `../../utils/logger.js` | Logger centralisé (info, warn, error, debug) |

### Packages npm

| Package | Version | Rôle |
|---------|---------|------|
| `better-sqlite3` | - | Client SQLite pour Node.js |
| `dotenv` | - | Chargement des variables d'environnement |
| `parse` | - | SDK Parse Server |

### Variables d'environnement requises

```bash
PARSE_APP_ID=...
PARSE_JAVASCRIPT_KEY=...
PARSE_MASTER_KEY=...
PARSE_SERVER_URL=...
# Optionnel pour test
NODE_ENV=test
TEST_DB_PATH=/chemin/vers/test.db
```

### Bases de données

| Base | Type | Chemin | Rôle |
|------|------|--------|------|
| Principal | SQLite | `/home/arthur/adti/sync.db` | Source des données |
| Test | SQLite | `${TEST_DB_PATH}` | Utilisée en environnement test |
| Parse Server | MongoDB | Via SDK Parse | Destination des données |

---

## Schéma des tables SQL

### Table `_GCO__GcoPiece` (Pièces/Factures)

| Colonne | Type | Description |
|---------|------|-------------|
| `idpiece` | INTEGER | Clé primaire |
| `nfacture` | TEXT | Numéro de facture |
| `datepiece` | DATETIME | Date de la pièce |
| `dateecheance` | DATETIME | Date d'échéance |
| `totalhtnet` | REAL | Total HT net |
| `totalttcnet` | REAL | Total TTC net |
| `resteapayer` | REAL | Reste à payer |
| `facturesoldee` | INTEGER | 0=Non soldée, 1=Soldée |
| `commentaire` | TEXT | Commentaire sur la pièce |
| `refpiece` | TEXT | Référence de la pièce |
| `valide` | INTEGER | 1=Valide, 0=Invalide |

### Table `_ADN_DIAG__Dossier` (Dossiers)

| Colonne | Type | Description |
|---------|------|-------------|
| `idDossier` | INTEGER | Clé primaire |
| `idStatut` | INTEGER | ID du statut (FK) |
| `reference` | TEXT | Référence du dossier |
| `referenceExterne` | TEXT | Référence externe |
| `numero` | TEXT | Numéro du dossier |
| `idEmployeIntervention` | INTEGER | ID de l'employé intervenant |
| `commentaire` | TEXT | Commentaire sur le dossier |
| `adresse` | TEXT | Adresse du bien |
| `cptAdresse` | TEXT | Complément d'adresse |
| `codePostal` | TEXT | Code postal |
| `ville` | TEXT | Ville |
| `numeroLot` | TEXT | Numéro de lot |
| `etage` | TEXT | Étage |
| `entree` | TEXT | Entrée |
| `escalier` | TEXT | Escalier |
| `porte` | TEXT | Porte |
| `numVoie` | TEXT | Numéro de voie |
| `cptNumVoie` | TEXT | Complément numéro de voie |
| `typeVoie` | TEXT | Type de voie |
| `dateDebutMission` | DATETIME | Date de début de mission |
| `contactPlace` | TEXT | Contact principal |

### Table `_GCO__GcoPieceMetier` (Lien Pièce-Dossier)

| Colonne | Type | Description |
|---------|------|-------------|
| `idpiece` | INTEGER | ID de la pièce (FK) |
| `idmetier` | INTEGER | ID du dossier (FK) |

### Table `_ADN_DIAG__StatutDossier` (Statuts)

| Colonne | Type | Description |
|---------|------|-------------|
| `idStatut` | INTEGER | Clé primaire |
| `intitule` | TEXT | Libellé du statut |

### Table `_ADN_RG_Employe` (Employés)

| Colonne | Type | Description |
|---------|------|-------------|
| `idEmploye` | INTEGER | Clé primaire |
| `prenom` | TEXT | Prénom |
| `nom` | TEXT | Nom |

### Table `_ADN_DIAG__DossierInterlocuteur` (Lien Dossier-Interlocuteur)

| Colonne | Type | Description |
|---------|------|-------------|
| `idDossier` | INTEGER | ID du dossier (FK) |
| `idRole` | INTEGER | ID du rôle (FK) |
| `idInterlocuteur` | INTEGER | ID de l'interlocuteur (FK) |
| `idContact` | INTEGER | ID du contact (FK) |

### Table `_ADN_RG_Interlocuteur` (Interlocuteurs)

| Colonne | Type | Description |
|---------|------|-------------|
| `idInterlocuteur` | INTEGER | Clé primaire |
| `typePersonne` | TEXT | Type (Personne, Société, etc.) |
| `nom` | TEXT | Nom |
| `prenom` | TEXT | Prénom |
| `email` | TEXT | Email |
| `telephoneMobile` | TEXT | Téléphone |

### Table `_ADN_DIAG__RoleInterlocuteurDossier` (Rôles)

| Colonne | Type | Description |
|---------|------|-------------|
| `idRole` | INTEGER | Clé primaire |
| `intitule` | TEXT | Libellé du rôle (Payeur, Apporteur d'affaire, etc.) |

---

## Exemple complet

### Données SQL source

**Table `_GCO__GcoPiece`** :
```
idpiece | nfacture | datepiece | dateecheance | totalttcnet | resteapayer | facturesoldee | refpiece
--------|----------|-----------|--------------|-------------|--------------|---------------|----------
12345   | FACT-001 | 2024-01-15| 2024-02-15   | 2144.94     | 2144.94      | 0             | REF-001
```

**Table `_ADN_DIAG__Dossier`** :
```
idDossier | reference | codePostal | ville | adresse
---------|-----------|------------|-------|---------
1001     | DOS-001   | 06300      | Nice  | 40 avenue des Diables Bleus
```

**Table `_ADN_RG_Interlocuteur`** (Payeur) :
```
idInterlocuteur | typePersonne | nom | prenom | email | telephoneMobile
-----------------|--------------|-----|--------|-------|-----------------
2001            | Societe      | SNEXI | NULL | jbarthe@snexi.fr | +33123456789
```

### Traitement

1. **Exécution des requêtes SQL** → 1 pièce, 1 dossier, 1 interlocuteur
2. **Création du contact Payeur** :
   - `externe_id: 2001`
   - `nom: SNEXI`
   - `email: jbarthe@snexi.fr`
3. **Création de l'impayé** :
   - `nfacture: 1` (Number)
   - `reste_a_payer: 2144.94`
   - `payeur: <Pointer vers Contact SNEXI>`
   - `adresse_bien: "40 avenue des Diables Bleus, 06300 Nice"`
   - `payeur_nom: "SNEXI"`
   - `payeur_email: "jbarthe@snexi.fr"`
4. **Création des logs** :
   - `Activite` avec `operation: 'created'`

### Résultat

```javascript
{
  impayes_created: 1,
  impayes_updated: 0,
  contacts_created: 1,
  contacts_updated: 0,
  errors: []
}
```
