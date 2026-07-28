# Architecture Finale CouchDB + PouchDB pour Marki

## Vue d'ensemble

Architecture **Document Demande** (agrégat principal) avec synchronisation CouchDB ↔ PouchDB.

```
┌─────────────────────────────────────────────────────────────┐
│  CouchDB (Serveur)                                          │
│  ├── demande:DOS-2024-001  ← Document principal (complet)  │
│  ├── contact:client-001    ← Référentiel léger              │
│  ├── sequence:niveau-1     ← Config relances               │
│  └── smtp:default          ← Config email                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ Sync (filtrée)
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  PouchDB (Client)                                           │
│  ├── demande:DOS-2024-001  ← Même document, local           │
│  ├── contact:client-001                                       │
│  └── [pas de sequences/smtp]  ← Config en mémoire          │
└─────────────────────────────────────────────────────────────┘
```

---

## Types de Documents (4 uniquement)

### 1. `demande` (Document Principal)

**Description** : Contient TOUT un dossier client (factures, relances, events, etc.)

**Quantité estimée** : 10K - 100K documents

**Structure** :

```json
{
  "_id": "demande:DOS-2024-0789",
  "_rev": "5-abc123",
  "type": "demande",
  "reference": "DOS-2024-0789",
  "date_creation": "2024-01-15T10:00:00Z",
  "statut": "en_relance",
  "statut_dossier": "location",
  
  "client": {
    "id": "contact:client-001",
    "nom": "DURAND",
    "prenom": "Alain",
    "email": "alain@email.com",
    "telephone": "+33123456789",
    "type": "proprietaire"
  },
  
  "apporteur": {
    "id": "contact:agence-paris",
    "nom": "IMMO PARIS",
    "commission": 125.00,
    "commission_payee": false
  },
  
  "bien": {
    "adresse": "25 avenue des Champs-Élysées",
    "code_postal": "75008",
    "ville": "Paris"
  },
  
  "factures": [
    {
      "id": "facture:F001",
      "nfacture": "FACT-2024-001",
      "date_facture": "2024-01-10",
      "montant_ttc": 1250.00,
      "reste_a_payer": 850.00,
      "statut": "en_relance",
      "date_echeance": "2024-02-10"
    }
  ],
  
  "relances": [
    {
      "id": "relance:R001",
      "sequence_id": "sequence:niveau-1",
      "date_envoi": "2024-02-15T09:00:00Z",
      "statut": "envoyee",
      "nb_factures": 1
    }
  ],
  
  "suivis": [
    {
      "id": "suivi:S001",
      "date_programmation": "2024-03-15T09:00:00Z",
      "statut": "programme"
    }
  ],
  
  "events": [
    {
      "type": "facture_cree",
      "date": "2024-01-10T08:00:00Z",
      "description": "Facture F001 créée",
      "user_id": "user:agent-001"
    },
    {
      "type": "relance_envoyee",
      "date": "2024-02-15T09:00:00Z",
      "description": "Relance niveau 1 envoyée",
      "user_id": "system"
    }
  ],
  
  "missions": [
    {
      "type": "location",
      "date_debut": "2024-01-01",
      "date_fin": "2024-12-31",
      "statut": "actif"
    }
  ],
  
  "stats": {
    "nb_factures": 1,
    "nb_factures_impayees": 1,
    "montant_total_du": 850.00,
    "nb_relances": 1,
    "date_derniere_relance": "2024-02-15",
    "date_prochaine_relance": "2024-03-15"
  },
  
  "created_at": "2024-01-15T10:00:00Z",
  "updated_at": "2024-02-15T09:30:00Z"
}
```

---

### 2. `contact` (Référentiel)

**Description** : Clients, agences, notaires (infos de base uniquement)

**Quantité estimée** : 10K - 100K documents

**Structure** :

```json
{
  "_id": "contact:client-001",
  "_rev": "1-xyz789",
  "type": "contact",
  "nom": "DURAND",
  "prenom": "Alain",
  "email": "alain@email.com",
  "telephone": "+33123456789",
  "type_contact": "proprietaire",
  "adresse": {
    "rue": "15 rue de la Paix",
    "ville": "Paris",
    "code_postal": "75002"
  },
  "nb_demandes_actives": 3,
  "created_at": "2020-03-15T10:00:00Z",
  "updated_at": "2024-02-15T09:30:00Z"
}
```

---

### 3. `sequence` (Configuration)

**Description** : Scénarios de relance

**Quantité estimée** : 5 - 20 documents

**Structure** :

```json
{
  "_id": "sequence:niveau-1",
  "_rev": "1-abc123",
  "type": "sequence",
  "nom": "Relance Niveau 1 - Email",
  "type_sequence": "relances",
  "niveau": 1,
  "actif": true,
  "emails": [
    {
      "index": 1,
      "delai_jours": 0,
      "sujet": "Relance facture impayée",
      "template": "relance_n1"
    }
  ],
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

---

### 4. `smtp_profile` (Configuration)

**Description** : Configuration serveurs email

**Quantité estimée** : 1 - 5 documents

**Structure** :

```json
{
  "_id": "smtp:default",
  "_rev": "1-def456",
  "type": "smtp_profile",
  "nom": "Serveur Production",
  "host": "smtp.marki.fr",
  "port": 587,
  "secure": true,
  "username": "relance@marki.fr",
  "password_encrypted": "ENC:...",
  "from_email": "relance@marki.fr",
  "from_name": "Marki",
  "actif": true,
  "is_default": true
}
```

---

## Design Documents (4)

### 1. `_design/demandes`

```json
{
  "_id": "_design/demandes",
  "views": {
    "par_client": {
      "map": "function(doc) { if (doc.type === 'demande' && doc.client) { emit([doc.client.id, doc.statut, doc.date_creation], { demande_id: doc._id, reference: doc.reference, statut: doc.statut, client: doc.client, montant_du: doc.stats ? doc.stats.montant_total_du : 0 }); } }"
    },
    "par_statut": {
      "map": "function(doc) { if (doc.type === 'demande') { emit([doc.statut, doc.date_creation], { demande_id: doc._id, reference: doc.reference, client: doc.client, stats: doc.stats }); } }"
    },
    "par_apporteur": {
      "map": "function(doc) { if (doc.type === 'demande' && doc.apporteur && doc.apporteur.commission > 0) { var payee = doc.apporteur.commission_payee || false; emit([doc.apporteur.id, payee], { demande_id: doc._id, reference: doc.reference, commission: doc.apporteur.commission }); } }",
      "reduce": "function(keys, values) { return sum(values.map(function(v) { return v.commission; })); }"
    },
    "a_relancer": {
      "map": "function(doc) { if (doc.type === 'demande' && doc.statut === 'en_relance') { var next = doc.suivis && doc.suivis[0] ? doc.suivis[0].date_programmation : null; emit([next, doc.stats.montant_total_du], { demande_id: doc._id, reference: doc.reference, client: doc.client, montant_du: doc.stats.montant_total_du }); } }"
    },
    "par_montant_du": {
      "map": "function(doc) { if (doc.type === 'demande' && doc.stats && doc.stats.montant_total_du > 0) { emit([doc.stats.montant_total_du, doc.client.nom], { demande_id: doc._id, reference: doc.reference, client: doc.client, montant_du: doc.stats.montant_total_du }); } }"
    }
  }
}
```

---

### 2. `_design/contacts`

```json
{
  "_id": "_design/contacts",
  "views": {
    "par_type": {
      "map": "function(doc) { if (doc.type === 'contact' && doc.type_contact) { emit([doc.type_contact, doc.nom], { id: doc._id, nom: doc.nom, email: doc.email }); } }"
    },
    "par_nom": {
      "map": "function(doc) { if (doc.type === 'contact') { emit(doc.nom.toLowerCase(), { id: doc._id, nom: doc.nom, prenom: doc.prenom, type: doc.type_contact }); } }"
    },
    "avec_demandes_actives": {
      "map": "function(doc) { if (doc.type === 'contact' && doc.nb_demandes_actives && doc.nb_demandes_actives > 0) { emit([doc.nb_demandes_actives, doc.nom], { id: doc._id, nom: doc.nom, nb_demandes: doc.nb_demandes_actives }); } }"
    }
  }
}
```

---

### 3. `_design/sequences`

```json
{
  "_id": "_design/sequences",
  "views": {
    "actives": {
      "map": "function(doc) { if (doc.type === 'sequence' && doc.actif === true) { emit([doc.niveau, doc.nom], { id: doc._id, nom: doc.nom, niveau: doc.niveau, scenario: doc.scenario }); } }"
    },
    "par_type": {
      "map": "function(doc) { if (doc.type === 'sequence') { emit([doc.type_sequence, doc.niveau], doc); } }"
    }
  }
}
```

---

### 4. `_design/smtp_profiles`

```json
{
  "_id": "_design/smtp_profiles",
  "views": {
    "actifs": {
      "map": "function(doc) { if (doc.type === 'smtp_profile' && doc.actif === true) { emit(doc.nom, { id: doc._id, nom: doc.nom, host: doc.host, is_default: doc.is_default }); } }"
    },
    "default": {
      "map": "function(doc) { if (doc.type === 'smtp_profile' && doc.is_default === true) { emit(null, doc); } }"
    }
  }
}
```

---

## Configuration PouchDB

### Initialisation

```javascript
// db.js - Configuration PouchDB
import PouchDB from 'pouchdb-browser';
import PouchDBFind from 'pouchdb-find';

PouchDB.plugin(PouchDBFind);

const REMOTE_DB = 'http://couchdb:5984/marki';
const LOCAL_DB = 'marki-local';

// Base locale
export const db = new PouchDB(LOCAL_DB);

// Synchronisation bidirectionnelle
export const sync = db.sync(REMOTE_DB, {
  live: true,
  retry: true,
  filter: function(doc) {
    // Ne pas répliquer les design docs et les configs serveur
    return !doc._id.startsWith('_design/') && 
           doc.type !== 'sequence' && 
           doc.type !== 'smtp_profile';
  }
});

// Gestion des événements de sync
sync.on('change', function(info) {
  console.log('Sync change:', info);
}).on('error', function(err) {
  console.error('Sync error:', err);
});

// Index pour pouchdb-find (recherches rapides locales)
export async function initIndexes() {
  await db.createIndex({ index: { fields: ['type', 'client.id'] }});
  await db.createIndex({ index: { fields: ['type', 'statut'] }});
  await db.createIndex({ index: { fields: ['reference'] }});
}
```

---

## Use Cases d'Accès

### 1. Afficher une fiche demande complète

```javascript
// 1 requête suffit !
const dossier = await db.get('demande:DOS-2024-0789');

// Accès direct aux données imbriquées
console.log(dossier.client.nom);          // "DURAND"
console.log(dossier.factures.length);     // 1
console.log(dossier.relances[0].date);  // "2024-02-15..."
console.log(dossier.events);              // Historique complet
```

**Fichiers nécessaires** : `db.js` + `FicheDemande.vue` = **2 fichiers**

---

### 2. Liste des demandes à relancer aujourd'hui

```javascript
// Via vue CouchDB (requête HTTP directe ou fetch)
const response = await fetch(
  'http://couchdb:5984/marki/_design/demandes/_view/a_relancer?startkey=["2024-02-20"]'
);
const aRelancer = await response.json();
```

**Ou côté PouchDB** (si données locales) :
```javascript
const result = await db.find({
  selector: {
    type: 'demande',
    statut: 'en_relance',
    'suivis.0.date_programmation': { $lte: '2024-02-20' }
  }
});
```

---

### 3. Total commissions par agence

```javascript
// Vue avec reduce (agrégation)
const response = await fetch(
  'http://couchdb:5984/marki/_design/demandes/_view/par_apporteur' +
  '?startkey=["contact:agence-paris",false]' +
  '&endkey=["contact:agence-paris",false,{}]' +
  '&reduce=true&group_level=1'
);

// Résultat : { rows: [{ key: ['agence-paris', false], value: 1250 }] }
```

---

### 4. Mettre à jour une facture (paiement)

```javascript
// Récupérer le document demande complet
const dossier = await db.get('demande:DOS-2024-0789');

// Modifier la facture dans le tableau
const facture = dossier.factures.find(f => f.id === 'facture:F001');
facture.statut = 'solde';
facture.reste_a_payer = 0;
facture.date_solde = new Date().toISOString();

// Ajouter un event
dossier.events.push({
  type: 'facture_payee',
  date: new Date().toISOString(),
  description: `Paiement de ${facture.montant_ttc}€`,
  user_id: 'user:agent-001'
});

// Mettre à jour les stats
dossier.stats.nb_factures_impayees--;
dossier.stats.montant_total_du -= facture.montant_ttc;
dossier.updated_at = new Date().toISOString();

// Sauvegarder (une seule requête, atomicité garantie)
await db.put(dossier);
```

---

## Résumé

| Aspect | Valeur |
|--------|--------|
| **Types de documents** | 4 (`demande`, `contact`, `sequence`, `smtp_profile`) |
| **Design Documents** | 4 (`demandes`, `contacts`, `sequences`, `smtp_profiles`) |
| **Fichiers par use case** | ~2-3 fichiers (minimum) |
| **Requêtes fiche complète** | 1 (`db.get(id)`) |
| **Atomicité** | Par document demande (excellente) |
| **Offline support** | Oui (PouchDB sync) |
| **Code à maintenir** | Minimum |

**Avantage clé** : Une demande = un document JSON complet. Une seule requête suffit pour afficher toute la fiche client avec historique.

---

## Requêtes Complexes : Trouver les Demandes avec Factures Impayées

### Le Problème

Dans l'architecture `demande`, les factures sont **imbriquées dans un tableau** :

```json
{
  "_id": "demande:DOS-001",
  "factures": [
    { "id": "F001", "statut": "impaye", "montant": 1000 },
    { "id": "F002", "statut": "solde", "montant": 500 }
  ]
}
```

**Question** : Peut-on créer une vue qui retourne UNIQUEMENT les demandes ayant **au moins une** facture impayée ?

### Réponse : Oui, mais avec des limites

#### Solution 1 : Vue sur le statut de la demande (Recommandée)

Au lieu de chercher dans les factures imbriquées, on utilise le **champ dénormalisé** `statut` de la demande :

```javascript
// Dans le document demande, maintenir un champ statut à jour
{
  "_id": "demande:DOS-001",
  "statut": "en_relance",  // ← Champ calculé
  "factures": [...]
}

// Vue simple
function(doc) {
  if (doc.type === 'demande' && doc.statut === 'en_relance') {
    emit(doc._id, doc);
  }
}
```

**Avantage** : Ultra rapide, une seule clé à indexer  
**Inconvénient** : Nécessite de maintenir le champ `statut` à jour

---

#### Solution 2 : Vue avec émission multiple (Par facture)

```javascript
// _design/demandes/views/par_facture_statut
function(doc) {
  if (doc.type === 'demande' && doc.factures) {
    // Émettre UNE FOIS par facture impayée
    var hasImpaye = false;
    doc.factures.forEach(function(facture) {
      if (facture.statut === 'impaye') {
        hasImpaye = true;
        emit(
          [facture.id, facture.date_echeance],
          {
            demande_id: doc._id,
            facture: facture,
            client: doc.client
          }
        );
      }
    });
    
    // Alternative : émettre la demande si elle a au moins un impayé
    if (hasImpaye) {
      emit(['DEMANDE_AVEC_IMPAYE', doc.date_creation], doc);
    }
  }
}
```

**Usage** :
```http
// Toutes les demandes avec au moins une facture impayée
GET /_design/demandes/_view/par_facture_statut
  ?startkey=["DEMANDE_AVEC_IMPAYE"]
  &endkey=["DEMANDE_AVEC_IMPAYE", {}]

// Résultat : une entrée par demande ayant des impayés
```

**Attention** : Cette vue peut devenir **très volumineuse** si vous avez beaucoup de factures (une ligne par facture impayée).

---

#### Solution 3 : PouchDB Find (Mango Queries) - Plus flexible

Côté PouchDB, utilisez `pouchdb-find` pour des requêtes ad-hoc :

```javascript
// Créer un index (une fois)
await db.createIndex({
  index: { 
    fields: ['type', 'factures.statut']  // Index sur tableau imbriqué
  }
});

// Requête : demandes avec factures impayées
const result = await db.find({
  selector: {
    type: 'demande',
    'factures': {
      $elemMatch: {
        statut: 'impaye'
      }
    }
  }
});

// Alternative : par montant
const result = await db.find({
  selector: {
    type: 'demande',
    'factures': {
      $elemMatch: {
        reste_a_payer: { $gt: 0 }
      }
    }
  },
  sort: [{ 'stats.montant_total_du': 'desc' }]
});
```

**Avantages** :
- ✅ Pas besoin de créer une vue CouchDB
- ✅ Requêtes dynamiques
- ✅ Fonctionne offline

**Inconvénients** :
- ⚠️ Moins performant sur gros volumes (>10K docs)
- ⚠️ Index sur tableau = complexité

---

#### Solution 4 : Champ dénormalisé "has_impayes" (Optimale)

Ajouter un champ calculé dans le document `demande` :

```json
{
  "_id": "demande:DOS-001",
  "statut": "en_relance",
  "has_impayes": true,           // ← Champ dénormalisé
  "nb_impayes": 2,               // ← Compteur
  "montant_total_impayes": 1740, // ← Total
  "factures": [...]
}
```

**Vue ultra-simple** :
```javascript
function(doc) {
  if (doc.type === 'demande' && doc.has_impayes === true) {
    emit([doc.montant_total_impayes, doc.client.nom], doc);
  }
}
```

**Mise à jour automatique** (côté application) :
```javascript
function updateDemandeStats(demande) {
  const impayes = demande.factures.filter(f => f.statut === 'impaye');
  demande.has_impayes = impayes.length > 0;
  demande.nb_impayes = impayes.length;
  demande.montant_total_impayes = impayes.reduce((sum, f) => sum + f.reste_a_payer, 0);
  demande.statut = impayes.length > 0 ? 'en_relance' : 'solde';
}
```

**C'est la solution recommandée** pour CouchDB avec documents agrégats.

---

### Comparaison des Approches

| Approche | Complexité | Perf | Offline | Recommandé |
|----------|-----------|------|---------|------------|
| **Champ dénormalisé** | Faible | ⭐⭐⭐ Excellente | ✅ Oui | 🥇 **Oui** |
| **Vue par facture** | Moyenne | ⭐⭐ Bonne | ✅ Oui | ⚠️ Si peu de factures |
| **PouchDB Find** | Faible | ⭐ Correct | ✅ Oui | 🥈 Alternative |
| **Vue statut demande** | Faible | ⭐⭐⭐ Excellente | ✅ Oui | 🥇 **Oui** |

---

### Recommandation Finale

Pour Marki, utilisez **les champs dénormalisés** dans le document `demande` :

```json
{
  "_id": "demande:DOS-001",
  "statut": "en_relance",           // Vue : demandes/par_statut
  "has_impayes": true,              // Vue : demandes/avec_impayes
  "nb_impayes": 2,                  // Tri rapide
  "montant_total_impayes": 1740.00  // Tri par priorité
}
```

**C'est le compromis idéal** entre performance CouchDB et simplicité de développement.


---

## Comparaison : PouchDB + CouchDB vs CouchDB Seul (HTTP Direct)

### Option A : CouchDB Seul (Sans PouchDB)

Dans cette architecture, le frontend fait des requêtes HTTP **directement** sur CouchDB, sans couche PouchDB locale.

```
Frontend (React/Vue)
    │
    │ fetch() HTTP direct
    ▼
CouchDB (API REST native)
```

**Fichiers pour le use case "Fiche Demande + Paiement"** :

```
frontend/
├── couchdb.service.js          # 1 fichier : client HTTP CouchDB
│   # Wrapper fetch() avec auth, headers, gestion erreurs
│
└── FicheDemande.vue            # 1 fichier : composant
    # Template + appels HTTP + gestion offline (manuelle!)

TOTAL: 2 fichiers (même nombre que PouchDB)
```

**Code** :

```javascript
// couchdb.service.js (40 lignes)
const COUCHDB_URL = 'http://couchdb:5984/marki';
const AUTH = 'Basic ' + btoa('user:pass');

export const couchdb = {
  async get(id) {
    const res = await fetch(`${COUCHDB_URL}/${id}`, {
      headers: { 'Authorization': AUTH }
    });
    if (!res.ok) throw new Error('Not found');
    return res.json();
  },
  
  async put(doc) {
    const res = await fetch(`${COUCHDB_URL}/${doc._id}`, {
      method: 'PUT',
      headers: { 
        'Authorization': AUTH,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(doc)
    });
    return res.json();
  },
  
  // Pas de sync automatique !
  // Chaque requête = aller-retour réseau
};
```

```vue
<!-- FicheDemande.vue -->
<template>
  <div v-if="demande">
    <h1>{{ demande.reference }}</h1>
    <div v-for="f in demande.factures" :key="f.id">
      {{ f.nfacture }} - {{ f.montant }}€
      <button @click="payer(f.id)">Marquer payé</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { couchdb } from './couchdb.service.js';

const demande = ref(null);
const id = 'demande:DOS-2024-001';

onMounted(async () => {
  demande.value = await couchdb.get(id);  // ← HTTP direct
});

const payer = async (factureId) => {
  const d = await couchdb.get(id);        // ← Re-fetch (réseau!)
  const f = d.factures.find(x => x.id === factureId);
  f.statut = 'solde';
  await couchdb.put(d);                   // ← HTTP PUT
  demande.value = d;                      // ← Màj manuelle UI
};
</script>
```

---

### Option B : PouchDB + CouchDB (Avec Sync)

```
Frontend (React/Vue)
    │
    │ PouchDB (local)
    ▼
Sync automatique (WebSocket-like)
    ▼
CouchDB
```

**Fichiers** :

```
frontend/
├── db.js                       # 1 fichier : init PouchDB + sync
│   # Plus complexe que HTTP simple (gestion sync)
│
└── FicheDemande.vue            # 1 fichier : composant
    # Plus simple (pas de gestion erreur réseau)

TOTAL: 2 fichiers (même nombre)
```

**Code** :

```javascript
// db.js (20 lignes vs 40 lignes HTTP)
import PouchDB from 'pouchdb-browser';

export const db = new PouchDB('marki-local');

// Sync automatique (config une fois)
db.sync('http://couchdb:5984/marki', { 
  live: true, 
  retry: true 
});
```

```vue
<!-- FicheDemande.vue -->
<script setup>
import { ref, onMounted } from 'vue';
import { db } from './db.js';

const demande = ref(null);
const id = 'demande:DOS-2024-001';

onMounted(async () => {
  demande.value = await db.get(id);  // ← Local (instantané)
});

const payer = async (factureId) => {
  const d = await db.get(id);        // ← Local (cache)
  const f = d.factures.find(x => x.id === factureId);
  f.statut = 'solde';
  await db.put(d);                   // ← Local + sync auto
  // Pas besoin de demande.value = d (reactif!)
};
</script>
```

---

### Comparaison Détaillée

| Aspect | CouchDB Seul (HTTP) | PouchDB + CouchDB |
|--------|---------------------|-------------------|
| **Fichiers** | 2 | 2 |
| **Lignes de code (service DB)** | ~40 | ~20 |
| **Lignes de code (composant)** | ~50 | ~40 |
| **Total lignes** | ~90 | ~60 |
| **Gestion erreurs réseau** | **Manuelle** (partout) | **Automatique** (retry) |
| **Offline support** | ❌ Non | ✅ Oui (gratuit) |
| **Latence lecture** | Réseau (~50-200ms) | **Locale (~1ms)** |
| **Latence écriture** | Réseau + validation | **Locale** (sync async) |
| **Reactif temps réel** | ❌ Polling manuel | ✅ Change events natifs |
| **Conflits** | **Gérés manuellement** | Gérés par PouchDB |
| **Bundle size** | 0 (fetch natif) | ~100KB (PouchDB) |

---

### Quand choisir quoi ?

#### Choisissez CouchDB Seul (HTTP direct) si :
- ✅ Application **toujours online** (vous l'avez confirmé)
- ✅ Pas besoin de offline
- ✅ Préférence pour **simplicité extrême** (pas de librairie)
- ✅ Petit bundle JS critique (< 100KB)

```javascript
// Avantage : Zéro dépendance, fetch natif
// Inconvénient : Chaque requête = latence réseau
```

#### Choisissez PouchDB + CouchDB si :
- ✅ **UX fluide** prioritaire (réponses instantanées)
- ✅ Offline **même ponctuel** (wifi qui coupe)
- ✅ **Multi-onglets** (sync entre onglets)
- ✅ Tolérance au **100KB de plus** dans le bundle

---

### Verdict pour Marki (Online 100%)

Puisque vous êtes **toujours online**, les deux solutions ont **le même nombre de fichiers (2)** :

| Solution | Fichiers | UX | Complexité |
|----------|----------|-----|------------|
| **CouchDB HTTP direct** | 2 | Correcte (latence réseau) | ⭐ Très simple |
| **PouchDB + CouchDB** | 2 | ⭐ Excellente (réponses instantanées) | ⭐⭐ Simple |

**Ma recommandation** : **PouchDB + CouchDB** même si online

**Pourquoi ?**
1. **UX meilleure** : Les `db.get()` sont instantanés (local), pas de spinner de chargement
2. **Écriture async** : `db.put()` retourne immédiatement, sync en background
3. **Résilience** : Si le wifi coupe 2 secondes, pas d'erreur visible
4. **Pas de polling** : Pas besoin de rafraîchir manuellement pour voir les changements

**Le coût** : 100KB dans le bundle (acceptable pour une webapp métier).

---

### Code Équivalent Réduit (Les 2 approches)

**CouchDB HTTP (90 lignes)** :
```javascript
// 40 lignes service + 50 lignes composant + gestion erreurs partout
```

**PouchDB (60 lignes)** :
```javascript
// 20 lignes config + 40 lignes composant, pas de gestion erreurs réseau
```

**Économie** : ~30% de code en moins avec PouchDB (même nombre de fichiers).


---

## PouchDB : Requêtes et Stats Complexes en Frontend

### Capacités de PouchDB

PouchDB supporte **deux types** de requêtes :

#### 1. **PouchDB-find** (Mango Queries) - Recommandé
```javascript
// Requêtes "find" style MongoDB
const result = await db.find({
  selector: {
    type: 'demande',
    statut: 'en_relance',
    'stats.montant_total_du': { $gt: 1000 }
  },
  sort: [{ 'stats.montant_total_du': 'desc' }]
});

// LIMITATION : Pas d'agrégation (sum, avg, group by) !
```

**Ce qui fonctionne** :
- ✅ Filtrer (`$eq`, `$gt`, `$lt`, `$in`...)
- ✅ Trier (`sort`)
- ✅ Pagination (`limit`, `skip`)
- ✅ Index composites

**Ce qui ne fonctionne PAS** :
- ❌ `SUM`, `AVG`, `COUNT` natifs
- ❌ `GROUP BY`
- ❌ Jointures complexes

---

#### 2. **Vues MapReduce** (hérité de CouchDB)
```javascript
// Créer une vue dans PouchDB (comme CouchDB)
const designDoc = {
  _id: '_design/stats',
  views: {
    montant_par_statut: {
      map: function(doc) {
        if (doc.type === 'demande') {
          emit(doc.statut, doc.stats.montant_total_du);
        }
      }.toString(),
      reduce: '_sum'  // Fonction de réduction
    }
  }
};

await db.put(designDoc);

// Utiliser la vue
const result = await db.query('stats/montant_par_statut', {
  group: true
});

// Résultat : { rows: [
//   { key: 'en_relance', value: 45000 },
//   { key: 'solde', value: 120000 }
// ] }
```

**Mais attention** :
- ⚠️ La vue est créée **localement** (pas sync automatique avec CouchDB)
- ⚠️ Première exécution = **indexation lente** (calcule tout sur le doc local)
- ⚠️ Consomme **CPU/batterie** sur mobile

---

### Stratégies Recommandées pour les Stats

#### Option A : Stats Simples (en PouchDB)

Pour des calculs sur **peu de documents** (< 1000) :

```javascript
// Charger les données et calculer en JavaScript
const result = await db.find({
  selector: { type: 'demande', statut: 'en_relance' }
});

// Calcul local (simple et rapide pour petits volumes)
const stats = {
  total: result.docs.length,
  montantGlobal: result.docs.reduce((sum, d) => sum + d.stats.montant_total_du, 0),
  moyenne: result.docs.reduce((sum, d) => sum + d.stats.montant_total_du, 0) / result.docs.length,
  max: Math.max(...result.docs.map(d => d.stats.montant_total_du))
};
```

**Quand l'utiliser** :
- Données déjà chargées (affichage liste)
- Calculs "à la volée" pour l'UI
- Volumes faibles (< 1000 docs)

---

#### Option B : Stats Complexes (CouchDB → Frontend)

Pour des agrégations sur **gros volumes** (10K+ documents) :

```javascript
// Appeler la vue CouchDB (via HTTP) qui a un reduce
const response = await fetch(
  'http://couchdb:5984/marki/_design/demandes/_view/par_statut' +
  '?group=true&reduce=true',
  { headers: { 'Authorization': 'Basic ...' } }
);

const data = await response.json();
// { rows: [{ key: 'en_relance', value: 45000 }, ...] }

// Afficher dans l'UI
```

**Avantages** :
- ✅ Calcul côté serveur (rapide)
- ✅ Pas de charge sur le client
- ✅ Bon pour les gros volumes

**Inconvénients** :
- ❌ Nécessite connexion
- ❌ Une requête HTTP supplémentaire

---

#### Option C : Stats Pr-calculées (Dénormalisation)

Maintenir des **champs calculés** à jour dans les documents :

```javascript
// Dans chaque document demande (champs auto-maintenus)
{
  "stats": {
    "montant_total_du": 1740.00,
    "nb_impayes": 2
  }
}

// Puis créer un document "global" qui agrège tout
{
  "_id": "stats:global:2024-02",
  "type": "stats_global",
  "periode": "2024-02",
  "total_demandes": 150,
  "total_impayes": 45,
  "montant_global": 450000.00,
  "updated_at": "2024-02-20T10:00:00Z"
}
```

**Mise à jour** : Via Change Feed CouchDB (worker côté serveur)

---

### Comparaison des Approches Stats

| Type de Stat | PouchDB Local | CouchDB Reduce | JS Manuel | Recommandé |
|-------------|-------------|--------------|-----------|------------|
| **Count simple** | ✅ `docs.length` | ✅ Rapide | ✅ | PouchDB |
| **Somme petit vol** | ⚠️ Lent | ✅ | ✅ `reduce()` | JS Manuel |
| **Somme gros vol** | ❌ Trop lent | ✅ | ❌ | **CouchDB** |
| **Moyenne** | ⚠️ Calcul local | ✅ | ✅ | JS ou CouchDB |
| **Group by** | ❌ Non natif | ✅ | ⚠️ Complexe | **CouchDB** |
| **Stats temps réel** | ⚠️ Vue lourde | ✅ | ❌ | **CouchDB** |

---

### Verdict pour Marki

**Règle d'or** :

```
Si volume < 1000 docs ET données déjà chargées
→ Calcul JavaScript local (simple)

Si volume > 1000 docs OU agrégation complexe
→ Vue CouchDB avec reduce (requête HTTP)

Si stats globales dashboard
→ Document stats pré-calculé (dénormalisé)
```

**Exemple concret** :

```javascript
// Dashboard "Mes demandes du jour" (petit volume)
const mesDemandes = await db.find({
  selector: { 'client.id': 'contact:001', type: 'demande' }
});

const montantTotal = mesDemandes.docs.reduce((sum, d) => 
  sum + d.stats.montant_total_du, 0
);
// ← OK, volume limité

// Dashboard global "Chiffre d'affaires agence" (gros volume)
const statsAgence = await fetch(
  '/couchdb/_design/stats/_view/commissions_par_agence?reduce=true'
);
// ← Nécessite CouchDB
```

**Conclusion** : PouchDB est excellent pour la **navigation et recherche** (find), mais les **stats complexes et agrégations** doivent rester sur **CouchDB** (ou être pré-calculées).


---

## PouchDB : Cache et Mémorisation des Calculs

### PouchDB N'a Pas de Cache Automatique de Requêtes

**Important** : PouchDB garde en mémoire les **documents** (après un `get()` ou `sync`), mais **PAS les résultats de requêtes complexes** (vues, find, agrégations).

```javascript
// Premier appel : calcule l'index et retourne le résultat
const result1 = await db.find({ selector: { statut: 'impaye' } }); 
// → Requête exécutée, index scanné

// Deuxième appel : RECALCULE tout !
const result2 = await db.find({ selector: { statut: 'impaye' } });
// → Requête ré-exécutée, même si les données n'ont pas changé
```

**Contrairement à** : React Query (TanStack Query) ou SWR qui mettent en cache les résultats HTTP.

---

### Solutions pour Cacher les Calculs

#### Option 1 : Variable JavaScript Simple (Mémoïsation)

```javascript
// store.js - Cache manuel en mémoire
const cache = new Map();

export async function getDemandesImpayees(useCache = true) {
  const key = 'demandes:impayees';
  
  // Vérifier cache
  if (useCache && cache.has(key)) {
    console.log('Cache hit!');
    return cache.get(key);
  }
  
  // Calcul/requête
  const result = await db.find({
    selector: { type: 'demande', statut: 'en_relance' }
  });
  
  // Stocker dans cache
  cache.set(key, result.docs);
  return result.docs;
}

// Invalidation manuelle
export function invalidateCache(key) {
  cache.delete(key);
}

// Usage
const demandes = await getDemandesImpayees(); // Calcule
const demandes2 = await getDemandesImpayees(); // Cache hit (instantané)
```

**Avantages** :
- ✅ Ultra simple
- ✅ Instantané après premier appel

**Inconvénients** :
- ❌ Cache perdu au rechargement de page
- ❌ Invalidation manuelle obligatoire
- ❌ Pas de cache entre onglets

---

#### Option 2 : State Management (Vuex/Redux/Zustand)

```javascript
// stores/demandes.js (Pinia/Vuex)
import { defineStore } from 'pinia';

export const useDemandesStore = defineStore('demandes', {
  state: () => ({
    demandes: [],
    stats: {
      totalImpayes: 0,
      montantGlobal: 0
    },
    lastFetch: null
  }),
  
  getters: {
    // Cache automatique via computed
    demandesImpayees: (state) => 
      state.demandes.filter(d => d.statut === 'en_relance'),
    
    // Calcul mémorisé (ne recalcule pas si demandes inchangées)
    montantTotalImpayes: (state) => 
      state.demandes
        .filter(d => d.statut === 'en_relance')
        .reduce((sum, d) => sum + d.stats.montant_total_du, 0)
  },
  
  actions: {
    async fetchDemandes() {
      // Ne recharge que si > 5 minutes
      if (this.lastFetch && Date.now() - this.lastFetch < 300000) {
        return; // Utilise cache mémoire
      }
      
      const result = await db.find({ selector: { type: 'demande' } });
      this.demandes = result.docs;
      this.lastFetch = Date.now();
    },
    
    // Recalcule les stats automatiquement
    updateStats() {
      this.stats.totalImpayes = this.demandesImpayees.length;
      this.stats.montantGlobal = this.montantTotalImpayes;
    }
  }
});

// Usage dans composant
const store = useDemandesStore();
await store.fetchDemandes(); // Charge une fois
console.log(store.montantTotalImpayes); // Accès instantané (computed)
```

**Avantages** :
- ✅ Réactif (met à jour automatiquement)
- ✅ TTL (Time To Live) possible
- ✅ Partagé entre composants

**Inconvénients** :
- ❌ Perdu au refresh de page
- ❌ Complexité supplémentaire

---

#### Option 3 : IndexedDB Secondaire (Cache Persistant)

```javascript
// Cache persistant entre sessions
const CACHE_DB = new PouchDB('marki-cache');

async function getWithCache(queryName, queryFn, ttl = 60000) {
  const key = `cache:${queryName}`;
  
  try {
    const cached = await CACHE_DB.get(key);
    const age = Date.now() - cached.timestamp;
    
    if (age < ttl) {
      console.log('Cache persist hit');
      return cached.data;
    }
  } catch (e) {
    // Pas en cache
  }
  
  // Exécuter requête
  const result = await queryFn();
  
  // Sauvegarder dans cache
  await CACHE_DB.put({
    _id: key,
    data: result,
    timestamp: Date.now()
  });
  
  return result;
}

// Usage
const stats = await getWithCache(
  'stats-agence-001',
  async () => {
    // Requête complexe
    const docs = await db.find({ selector: { 'apporteur.id': 'agence-001' } });
    return docs.reduce((sum, d) => sum + d.stats.montant_total_du, 0);
  },
  300000 // TTL: 5 minutes
);
```

**Avantages** :
- ✅ Persiste après rechargement
- ✅ TTL configurable
- ✅ Partagé entre onglets (même IndexedDB)

**Inconvénients** :
- ❌ Double stockage (données + cache)
- ❌ Gestion invalidation complexe

---

#### Option 4 : TanStack Query (React Query) + PouchDB

```javascript
// Avec TanStack Query (React Query)
import { useQuery } from '@tanstack/vue-query';

// Hook qui met en cache automatiquement
function useDemandesImpayees() {
  return useQuery({
    queryKey: ['demandes', 'impayees'],
    queryFn: async () => {
      const result = await db.find({
        selector: { type: 'demande', statut: 'en_relance' }
      });
      return result.docs;
    },
    staleTime: 60000, // Cache valide 1 minute
    cacheTime: 300000 // Garde en mémoire 5 minutes après démontage
  });
}

// Usage
const { data: demandes, isLoading } = useDemandesImpayees();

// Premier appel : charge
// Deuxième appel (ailleurs) : cache instantané
// Après 1 minute : rechargement automatique (stale)
```

**Avantages** :
- ✅ Cache intelligent avec déduplication
- ✅ Gestion loading/error intégrée
- ✅ Revalidation automatique
- ✅ Background refresh

**Inconvénients** :
- ❌ Dépendance supplémentaire
- ❌ Complexité d'apprentissage

---

### Comparaison des Stratégies de Cache

| Stratégie | Persistant | Complexité | Invalidation | Recommandé |
|-----------|-----------|------------|--------------|------------|
| **Variable JS** | ❌ Non | ⭐ Simple | Manuelle | Prototypes |
| **State Store** | ❌ Non | ⭐⭐ Moyenne | Semi-auto | Apps Vue/React |
| **IndexedDB** | ✅ Oui | ⭐⭐ Moyenne | TTL manuel | Cache longue durée |
| **TanStack Query** | ❌ Non | ⭐⭐⭐ Complexe | Auto excellente | 🥇 Production |

---

### Recommandation pour Marki

**Pattern hybride recommandé** :

```javascript
// 1. TanStack Query pour les listes (cache intelligent)
const { data: demandes } = useQuery({
  queryKey: ['demandes'],
  queryFn: () => db.find({ selector: { type: 'demande' } }),
  staleTime: 60000
});

// 2. PouchDB get() pour les détails (déjà optimisé)
// PouchDB met automatiquement en cache les documents get()
const demande = await db.get('demande:DOS-001'); 
// → Deuxième appel : instantané (cache interne PouchDB)

// 3. Calculateur réactif (Pinia/Vuex) pour les stats
const store = useDemandesStore();
const montantTotal = computed(() => 
  store.demandes.reduce((sum, d) => sum + d.stats.montant_total_du, 0)
);
```

**Résumé** : PouchDB seul ne cache pas les requêtes, mais avec **TanStack Query** ou **Pinia**, vous obtenez un système de cache performant.


---

## PouchDB : Indexation (pas cache)

### Oui, PouchDB Crée et Garde les Index

Vous parlez d'**indexation** (structure de données pour accélérer les requêtes), pas de cache. Dans ce cas :

**Oui, PouchDB persiste les index** dans IndexedDB et les réutilise.

---

### Index avec pouchdb-find

```javascript
// CRÉER l'index (une seule fois)
await db.createIndex({
  index: {
    fields: ['type', 'statut', 'client.id'],
    name: 'idx_type_statut_client'
  }
});

// Première requête : utilise l'index (rapide)
const r1 = await db.find({
  selector: { type: 'demande', statut: 'en_relance' }
});

// Deuxième requête : RÉUTILISE l'index existant (encore plus rapide)
const r2 = await db.find({
  selector: { type: 'demande', statut: 'impaye' }
});
// ↑ Même index 'idx_type_statut_client' utilisé
```

**Ce qui se passe** :
1. `createIndex()` : Crée une structure B-tree dans IndexedDB (coûteux, une fois)
2. Requêtes suivantes : Parcourent l'index (O(log n)) au lieu de scanner tout (O(n))
3. Index **persisté** : Reste entre les sessions (dans IndexedDB)

---

### Index avec Vues MapReduce

```javascript
// Créer une vue (index MapReduce)
const designDoc = {
  _id: '_design/demandes',
  views: {
    par_statut: {
      map: function(doc) {
        if (doc.type === 'demande') {
          emit([doc.statut, doc.date_creation], doc);
        }
      }.toString()
    }
  }
};

await db.put(designDoc);

// Première query : calcule l'index (coûteux)
const r1 = await db.query('demandes/par_statut', {
  key: ['en_relance']
});

// Index maintenant stocké localement

// Deuxième query : UTILISE l'index calculé (instantané)
const r2 = await db.query('demandes/par_statut', {
  key: ['impaye']
});
// ↑ Index déjà prêt, résultat immédiat
```

---

### Stockage des Index

| Type d'index | Stocké dans | Persistance |
|--------------|-------------|-------------|
| **pouchdb-find** (Mango) | IndexedDB (sous `idb://_pouch_marki/_index_`) | ✅ Oui |
| **Vues MapReduce** | IndexedDB (sous `idb://_pouch_marki/_design/`) | ✅ Oui |

```javascript
// Vérifier les index existants
const indexes = await db.getIndexes();
console.log(indexes.indexes);
// [
//   { name: '_all_docs', type: 'special' },
//   { name: 'idx_type_statut_client', type: 'json', def: {...} }
// ]
```

---

### Coût des Index

**À la création** :
```javascript
// Premier createIndex() sur 10 000 docs = LENT (2-5 secondes)
// Scan complet + construction B-tree
```

**À la lecture** (après création) :
```javascript
// Requête avec index = RAPIDE (5-50ms)
// Pas de recalcul, parcours d'arbre O(log n)
```

**À l'écriture** :
```javascript
// Chaque put() met à jour L'INDEX = plus lent
// Coût : O(log n) pour maintenir l'arbre
```

---

### Index Recommandés pour Marki

```javascript
// Initialisation (au démarrage de l'app)
export async function initIndexes() {
  // Index composite pour la recherche principale
  await db.createIndex({
    index: { 
      fields: ['type', 'statut', 'client.id'],
      name: 'idx_principal'
    }
  });
  
  // Index pour tri par montant
  await db.createIndex({
    index: { 
      fields: ['type', 'stats.montant_total_du'],
      name: 'idx_montant'
    }
  });
  
  // Index pour recherche par date
  await db.createIndex({
    index: { 
      fields: ['type', 'date_creation'],
      name: 'idx_date'
    }
  });
  
  // Index texte (si besoin recherche nom client)
  await db.createIndex({
    index: { 
      fields: ['client.nom'],
      name: 'idx_nom_client'
    }
  });
}

// Appeler au démarrage (une seule fois)
await initIndexes(); // Crée si n'existe pas, sinon rapide
```

---

### Comparaison : Index vs Calcul à la volée

| Opération | Sans index | Avec index | Gain |
|-----------|-----------|------------|------|
| **Recherche par statut** (10K docs) | 200ms | 5ms | **40x** |
| **Tri par montant** | 300ms | 10ms | **30x** |
| **Espace disque** | - | +30% | Coût acceptable |
| **Écriture** | 2ms | 5ms | 2x plus lent |

---

### Résumé

**Oui, PouchDB garde les index en mémoire persistante** (IndexedDB) :

1. **Une fois créé** : Index réutilisé instantanément
2. **Persisté** : Survive aux rechargements de page
3. **À jour** : Auto-maintenu lors des put()/post()
4. **Coût** : Écritures légèrement plus lentes, lectures ultra-rapides

**Pour Marki** : Créez les index au démarrage, toutes les requêtes suivantes seront optimisées.


---

## MapReduce (vues avec reduce) dans PouchDB

### Oui, PouchDB supporte les Reduce

PouchDB implémente les vues MapReduce de CouchDB, y compris les fonctions de **réduction** (`_sum`, `_count`, `_stats`, ou custom).

```javascript
// Créer une vue avec reduce dans PouchDB
const designDoc = {
  _id: '_design/stats',
  views: {
    montant_par_client: {
      map: function(doc) {
        if (doc.type === 'demande' && doc.client) {
          emit(doc.client.id, doc.stats.montant_total_du);
        }
      }.toString(),
      reduce: '_sum'  // Fonction de réduction intégrée
    },
    
    nb_demandes_par_statut: {
      map: function(doc) {
        if (doc.type === 'demande') {
          emit(doc.statut, 1);
        }
      }.toString(),
      reduce: '_count'  // Compte les documents
    },
    
    stats_custom: {
      map: function(doc) {
        if (doc.type === 'demande') {
          emit(doc.client.id, {
            montant: doc.stats.montant_total_du,
            count: 1
          });
        }
      }.toString(),
      reduce: function(keys, values, rereduce) {
        // Reduce personnalisé
        if (rereduce) {
          return values.reduce(function(acc, val) {
            return {
              montant: acc.montant + val.montant,
              count: acc.count + val.count
            };
          }, {montant: 0, count: 0});
        } else {
          return values.reduce(function(acc, val) {
            return {
              montant: acc.montant + val.montant,
              count: acc.count + val.count
            };
          }, {montant: 0, count: 0});
        }
      }.toString()
    }
  }
};

await db.put(designDoc);
```

### Utilisation avec reduce

```javascript
// Appel avec réduction (agrégation)
const result = await db.query('stats/montant_par_client', {
  group: true,        // Grouper par clé (client.id)
  reduce: true        // Activer le reduce
});

// Résultat
{
  rows: [
    { key: 'contact:client-001', value: 12500 },  // Total client 1
    { key: 'contact:client-002', value: 8900 },     // Total client 2
    { key: null, value: 21400 }                     // Total global (sans group)
  ]
}

// Reduce sur une sous-partie (range query)
const partial = await db.query('stats/montant_par_client', {
  startkey: 'contact:client-001',
  endkey: 'contact:client-099',
  group: true,
  reduce: true
});
```

### Fonctions de Reduce disponibles

| Fonction | Description | Usage |
|----------|-------------|-------|
| `'_sum'` | Somme des valeurs | Montants, quantités |
| `'_count'` | Compte les documents | Nombre de demandes |
| `'_stats'` | Stats (min, max, sum, count) | Analyses statistiques |
| **Custom** | Fonction JavaScript | Logique métier spécifique |

### Exemple : Total des impayés par agence (apporteur)

```javascript
// Vue dans PouchDB
const viewAgence = {
  _id: '_design/commissions',
  views: {
    impayes_par_agence: {
      map: function(doc) {
        if (doc.type === 'demande' && doc.apporteur && doc.has_impayes) {
          // Émettre pour chaque demande avec impayés
          emit(doc.apporteur.id, doc.stats.montant_total_impayes);
        }
      }.toString(),
      reduce: '_sum'
    }
  }
};

await db.put(viewAgence);

// Utilisation
const result = await db.query('commissions/impayes_par_agence', {
  group: true,
  reduce: true
});

// Résultat
// { rows: [
//   { key: 'contact:agence-paris', value: 45000 },
//   { key: 'contact:agence-lyon', value: 23000 },
//   { key: 'contact:agence-marseille', value: 12000 }
// ] }
```

### Limitations importantes

#### 1. **Performance au premier calcul**
```javascript
// Première exécution = TRÈS LENT
// PouchDB doit scanner tous les documents et calculer l'index
const result = await db.query('stats/montant_par_client', {
  group: true
});
// Peut prendre plusieurs secondes sur 10K+ documents

// Exécutions suivantes = RAPIDE (index déjà calculé)
```

#### 2. **Consommation mémoire/CPU**
- Les vues avec reduce consomment plus de ressources
- Évitez sur mobile avec gros volumes (>50MB de données)
- Préférez les requêtes simples ou les calculs incrémentaux

#### 3. **Pas de sync des index**
```javascript
// Les vues créées dans PouchDB sont LOCALES
// Si vous recréez la base (clear cache), les index sont perdus
// Il faut recréer les _design docs
```

#### 4. **Fonctions pures obligatoires**
```javascript
// Le reduce doit être une fonction PURE
// ❌ Interdit : accès externe, Date.now(), Math.random(), fetch
reduce: function(keys, values) {
  // ❌ Ne marche pas dans PouchDB
  const today = new Date(); // Non déterministe
  return values.length;
}

// ✅ Autorisé : logique pure
reduce: function(keys, values) {
  return values.reduce((a, b) => a + b, 0);
}
```

### Quand utiliser MapReduce dans PouchDB ?

#### ✅ Cas recommandés :
- **Volumes faibles** (< 5000 documents)
- **Calculs fréquents** (totaux par catégorie)
- **Données stables** (peu de modifications)
- **Dashboard simple** (indicateurs clés)

#### ❌ Cas à éviter :
- **Gros volumes** (> 10 000 documents) = premier calcul trop lent
- **Données très volatiles** (recalcule constant)
- **Mobile bas de gamme** (CPU limité)
- **Données temps réel** (latence unacceptable)

### Alternative recommandée pour Marki

Au lieu de MapReduce complexe, utilisez la **dénormalisation** :

```javascript
// Document stats global (maintenu à jour)
{
  "_id": "stats:agence:agence-paris:2024-02",
  "type": "stats_agence",
  "agence_id": "contact:agence-paris",
  "periode": "2024-02",
  "total_impayes": 45000,
  "nb_demandes": 45,
  "updated_at": "2024-02-20T10:00:00Z"
}

// Récupération instantanée (pas de calcul)
const stats = await db.get('stats:agence:agence-paris:2024-02');
```

**Ce document est mis à jour** via Change Feed CouchDB (côté serveur) ou manuellement lors des modifications.

### Résumé

| Aspect | PouchDB MapReduce | Recommandation |
|--------|-------------------|----------------|
| **Disponible** | ✅ Oui | - |
| **Performance** | ⚠️ Lent au premier calcul | Évitez sur gros volumes |
| **Persistance** | ✅ Oui (IndexedDB) | Mais local uniquement |
| **Sync** | ❌ Non | Index locaux ≠ CouchDB |
| **Usage mobile** | ⚠️ Prudence | Peu de docs (<5000) |
| **Alternative** | Dénormalisation | Préférer pour Marki |

**Verdict** : PouchDB supporte les reduce, mais pour Marki avec volumes importants, privilégiez les **champs dénormalisés** ou les **calculs côté CouchDB** (requêtes HTTP vers vues CouchDB serveur).


---

## Mise à Jour Automatique des Index dans PouchDB

### Oui, les index se mettent à jour automatiquement

Lorsque vous créez un index avec `createIndex()`, PouchDB maintient automatiquement cet index à jour lors des opérations d'écriture (`put`, `post`, `delete`, `bulkDocs`).

```javascript
// 1. Créer l'index (une fois)
await db.createIndex({
  index: { fields: ['type', 'statut', 'client.id'] }
});

// 2. Insérer un document
await db.put({
  _id: 'demande:DOS-999',
  type: 'demande',
  statut: 'impaye',
  client: { id: 'contact:client-001', nom: 'DURAND' }
});

// 3. L'index est automatiquement mis à jour !
// Pas besoin de recréer l'index

// 4. La requête suivante voit le nouveau document
const result = await db.find({
  selector: { type: 'demande', statut: 'impaye' }
});
// ← Contient demande:DOS-999
```

---

### Coût de la mise à jour automatique

Chaque écriture met à jour **tous les index concernés** :

```javascript
// Un seul put() déclenche :
await db.put(doc);

// 1. Écriture du document (2ms)
// 2. Mise à jour index 1 : ['type', 'statut'] (5ms)
// 3. Mise à jour index 2 : ['client.id'] (3ms)
// 4. Mise à jour index 3 : ['date_creation'] (4ms)

// Total : 14ms au lieu de 2ms sans index
```

**Impact** :
- ✅ Lecture ultra-rapide (index utilisé)
- ⚠️ Écriture plus lente (doit maintenir les index)

---

### Vérifier si un index est utilisé

```javascript
const result = await db.find({
  selector: {
    type: 'demande',
    statut: 'impaye'
  }
});

// Vérifier dans la console
console.log(result.warning);
// "no matching index found, create an index" → Index manquant
// undefined → Index utilisé correctement

// Explication du plan de requête (debug)
const explain = await db.explain({
  selector: { type: 'demande', statut: 'impaye' }
});
console.log(explain.index);
```

---

### Index multi-champs : Ordre important

L'ordre des champs dans l'index détermine son utilisation :

```javascript
// Index créé
await db.createIndex({
  index: { fields: ['type', 'statut', 'client.id'] }
});

// ✅ Utilise l'index (préfixe complet)
await db.find({ selector: { type: 'demande', statut: 'impaye' } });

// ✅ Utilise l'index (préfixe partiel)
await db.find({ selector: { type: 'demande' } });

// ⚠️ N'utilise PAS l'index (saute 'statut')
await db.find({ selector: { type: 'demande', client: { id: '001' } } });
// → Warning : "no matching index found"

// Solution : Créer un index séparé pour ce cas
await db.createIndex({
  index: { fields: ['type', 'client.id'] }
});
```

---

### Quand les index ne sont PAS mis à jour ?

#### 1. Suppression d'index
```javascript
// Supprimer un index manuellement
await db.deleteIndex({
  ddoc: '_design/idx-123',
  name: 'idx-type-statut'
});

// Les documents restent, mais les requêtes redeviennent lentes
```

#### 2. Destruction de la base
```javascript
// Supprime TOUT (documents + index)
await db.destroy();

// Recréer la base = index perdus
const newDb = new PouchDB('marki');
// Il faut recréer les createIndex() !
```

#### 3. Changement de structure d'index
```javascript
// Ancien index
createIndex({ fields: ['type', 'statut'] });

// Nouveau besoin
createIndex({ fields: ['type', 'statut', 'date'] });

// Les deux coexistent, mais l'ancien devient inutile
// → Penser à nettoyer
```

---

### Optimisation : Réduire le nombre d'index

**Mauvais** (trop d'index) :
```javascript
await db.createIndex({ index: { fields: ['type'] }});
await db.createIndex({ index: { fields: ['type', 'statut'] }});
await db.createIndex({ index: { fields: ['type', 'statut', 'client.id'] }});
await db.createIndex({ index: { fields: ['client.id'] }});
await db.createIndex({ index: { fields: ['date_creation'] }});
// 5 index = écritures très lentes
```

**Bon** (index composite) :
```javascript
// Un seul index couvre plusieurs cas
await db.createIndex({
  index: { 
    fields: ['type', 'statut', 'client.id', 'date_creation'],
    name: 'idx_principal'
  }
});

// Peut servir pour :
// - type only
// - type + statut
// - type + statut + client.id
// - Mais PAS pour client.id only ou date_creation only
```

---

### Stratégie de création des index pour Marki

```javascript
// Initialisation de l'app (au démarrage)
export async function initDatabase() {
  // Vérifier si index existent (optionnel)
  const indexes = await db.getIndexes();
  
  if (indexes.indexes.length <= 1) { // Seul _all_docs existe
    console.log('Création des index...');
    
    // Index principal pour les requêtes métier
    await db.createIndex({
      index: {
        fields: ['type', 'statut', 'client.id'],
        name: 'idx_demande_par_client'
      }
    });
    
    // Index pour tri par montant
    await db.createIndex({
      index: {
        fields: ['type', 'stats.montant_total_du'],
        name: 'idx_demande_par_montant'
      }
    });
    
    // Index pour dates
    await db.createIndex({
      index: {
        fields: ['type', 'date_creation'],
        name: 'idx_demande_par_date'
      }
    });
    
    console.log('Index créés');
  }
}

// Appeler au démarrage de l'application
await initDatabase();
```

---

### Résumé

| Aspect | Comportement |
|--------|--------------|
| **Mise à jour auto** | ✅ Oui sur `put`, `post`, `delete` |
| **Coût écriture** | ⚠️ Plus lent (maintient index) |
| **Bénéfice lecture** | ✅ Ultra rapide (utilise index) |
| **Persistance** | ✅ Index dans IndexedDB (survive reboot) |
| **Destruction** | ❌ Perdu avec `db.destroy()` |
| **Recréation** | ✅ Idempotente (crée si n'existe pas) |

**Règle d'or** : Créez les index une fois au démarrage, ils se maintiennent automatiquement.


---

## Différence : pouchdb-find vs MapReduce dans PouchDB

### Deux approches complètement différentes

| Critère | pouchdb-find (Mango) | MapReduce (Vues) |
|---------|---------------------|------------------|
| **Style** | Déclaratif (JSON) | Impératif (fonctions JS) |
| **Syntaxe** | `db.find({selector: {type: 'demande'}})` | `db.query('design/view')` |
| **Index** | B-tree auto (Mango index) | Index MapReduce (calculé) |
| **Flexibilité** | ⭐⭐⭐ Requêtes ad-hoc | ⭐⭐ Requêtes prédéfinies |
| **Performance** | ⭐⭐ Bonne | ⭐⭐⭐⭐ Excellente (après indexation) |
| **Premier calcul** | Instantané | ⭐ Très lent (doit tout indexer) |
| **Agrégations** | ❌ Non (pas de SUM/AVG natif) | ✅ Oui (reduce _sum, _count) |
| **Tri complexe** | ✅ Multi-champs | ⚠️ Limité (clé d'émission) |
| **Apprentissage** | ⭐ Facile (SQL-like) | ⭐⭐⭐ Complexe |

---

### pouchdb-find (Mango Queries)

**Approche déclarative** - Tu décris CE QUE tu veux, pas COMMENT l'obtenir.

```javascript
// Requête simple
const result = await db.find({
  selector: {
    type: 'demande',
    statut: 'impaye',
    'stats.montant_total_du': { $gt: 1000 }
  },
  sort: [{ 'client.nom': 'asc' }],
  limit: 50
});

// Avantages :
// ✅ Pas besoin de créer la requête à l'avance
// ✅ Change les critères à la volée
// ✅ Syntaxe proche SQL/MongoDB

// Inconvénients :
// ❌ Pas d'agrégation (SUM, COUNT, GROUP BY)
// ❌ Moins performant sur très gros volumes
// ❌ Tous les opérateurs ne sont pas optimisés
```

**Création d'index** :
```javascript
// Index nécessaire pour les performances
await db.createIndex({
  index: {
    fields: ['type', 'statut', 'stats.montant_total_du', 'client.nom']
  }
});
```

---

### MapReduce (Vues CouchDB)

**Approche impérative** - Tu décris COMMENT construire l'index (map), et éventuellement COMMENT agréger (reduce).

```javascript
// Étape 1 : Créer la vue (une fois)
const designDoc = {
  _id: '_design/demandes',
  views: {
    impayes_par_client: {
      // Map : transforme documents en entrées index
      map: function(doc) {
        if (doc.type === 'demande' && doc.statut === 'impaye') {
          emit(doc.client.id, doc.stats.montant_total_du);
        }
      }.toString(),
      
      // Reduce : agrège les valeurs (optionnel)
      reduce: '_sum'
    }
  }
};
await db.put(designDoc);

// Étape 2 : Utiliser la vue
const result = await db.query('demandes/impayes_par_client', {
  group: true,      // Grouper par clé (client.id)
  reduce: true      // Activer la réduction (sum)
});

// Résultat : {rows: [
//   {key: 'client-001', value: 12500},
//   {key: 'client-002', value: 8900}
// ]}

// Avantages :
// ✅ Performances excellentes après indexation
// ✅ Agrégations natives (sum, count, stats)
// ✅ Requêtes range très rapides (startkey/endkey)

// Inconvénients :
// ❌ Doit créer la vue à l'avance
// ❌ Premier calcul très lent
// ❌ Moins flexible (critères fixes)
// ❌ Complexe à apprendre
```

---

### Comparaison Concrète : Même Résultat

**Objectif** : Total des impayés par client

#### Avec pouchdb-find (2 étapes)
```javascript
// Étape 1 : Récupérer tous les impayés
const result = await db.find({
  selector: {
    type: 'demande',
    statut: 'impaye'
  }
});

// Étape 2 : Grouper et sommer en JavaScript
const parClient = result.docs.reduce((acc, doc) => {
  const id = doc.client.id;
  acc[id] = acc[id] || { nom: doc.client.nom, total: 0 };
  acc[id].total += doc.stats.montant_total_du;
  return acc;
}, {});

// Coût : Scan de tous les documents + traitement JS
// OK pour < 1000 documents, lent pour > 10000
```

#### Avec MapReduce (1 étape, optimisé)
```javascript
// Vue créée une fois
const designDoc = {
  _id: '_design/stats',
  views: {
    total_par_client: {
      map: function(doc) {
        if (doc.type === 'demande' && doc.statut === 'impaye') {
          emit(doc.client.id, doc.stats.montant_total_du);
        }
      }.toString(),
      reduce: '_sum'
    }
  }
};
await db.put(designDoc);

// Requête instantanée (index pré-calculé)
const result = await db.query('stats/total_par_client', {
  group: true,
  reduce: true
});

// Coût : O(log n) - parcours d'arbre pré-indexé
// Rapide même avec 100000+ documents
```

---

### Quand utiliser quoi ?

#### Choisis pouchdb-find si :
- ✅ Requêtes ad-hoc (filtres dynamiques)
- ✅ Interface utilisateur (listes, filtres, recherche)
- ✅ Pas besoin d'agrégation complexe
- ✅ Documents < 10000
- ✅ Préférence pour syntaxe déclarative

```javascript
// Exemples cas d'usage find() :
// - Recherche texte
// - Filtres combinés (checkbox multi-critères)
// - Tri par colonne cliquable
// - Pagination
```

#### Choisis MapReduce si :
- ✅ Agrégations nécessaires (sum, count, avg)
- ✅ Très gros volumes (> 10000 docs)
- ✅ Mêmes requêtes fréquentes (dashboards)
- ✅ Besoin de performances maximales
- ✅ Géospatial (indexes geo)

```javascript
// Exemples cas d'usage MapReduce :
// - Dashboard KPIs (total ventes, nombre clients)
// - Rapports agrégés (CA par mois, par région)
// - Requêtes temps réel sur gros volumes
```

---

### Hybride : Les Deux Ensemble

```javascript
// 1. MapReduce pour agrégations globales (KPIs)
const kpi = await db.query('stats/total_global', {
  group: true,
  reduce: true
});

// 2. pouchdb-find pour recherche/filtres UI
const liste = await db.find({
  selector: {
    type: 'demande',
    statut: 'impaye',
    'client.id': { $in: listeClients }
  },
  sort: ['date_creation'],
  limit: 20
});

// 3. JavaScript pour calculs intermédiaires
const detailClient = liste.docs.map(d => ({
  ref: d.reference,
  montant: d.stats.montant_total_du,
  retard: daysSince(d.date_echeance)
}));
```

---

### Verdict pour Marki

| Cas | Solution | Pourquoi |
|-----|----------|----------|
| **Liste demandes (UI)** | pouchdb-find | Flexibilité filtres, syntaxe simple |
| **Fiche détail** | `db.get(id)` | Direct, instantané |
| **Total impayés par client** | MapReduce | Agrégation native, performant |
| **Recherche texte** | pouchdb-find | $regex supporté |
| **Dashboard global** | MapReduce | Reduce _sum efficace |
| **Export données** | pouchdb-find | Contrôle total sur résultats |

**Recommandation** : Utilisez principalement **pouchdb-find** pour l'UI (flexibilité), et **MapReduce** uniquement pour les agrégations complexes qui nécessitent des performances (KPIs, rapports).


---

## PouchDB sans CouchDB : Synchronisation avec Filesystem

### Peut-on remplacer CouchDB par un simple système de fichiers ?

**Réponse courte** : Techniquement possible, mais ce n'est **plus du tout la même architecture**.

La "magie" du sync PouchDB ↔ CouchDB repose sur :
- Le protocole HTTP REST de CouchDB
- Le `_changes` feed (flux de modifications)
- La gestion des révisions (`_rev`)
- La résolution automatique des conflits

**Sans CouchDB**, vous perdez tout cela.

---

### Option 1 : PouchDB avec adaptateur Filesystem (Node.js/Electron)

PouchDB peut utiliser le système de fichiers comme stockage (via LevelDB ou adaptateurs spécifiques) :

```javascript
// Node.js ou Electron - Stockage fichier local
const PouchDB = require('pouchdb-core');
const fs = require('fs');
const path = require('path');

// PouchDB avec LevelDB (stockage fichier binaire)
const db = new PouchDB('./data/marki.db');

// Les données sont stockées dans un dossier local (LevelDB)
// ./data/marki.db/  ← Dossier avec fichiers binaires LevelDB
//   ├── 000003.log
//   ├── CURRENT
//   ├── LOCK
//   └── MANIFEST-000002
```

**Caractéristiques** :
- ✅ Fonctionne sans serveur (offline complet)
- ✅ Persiste entre les redémarrages (fichiers sur disque)
- ❌ **Pas de sync** avec autre chose (c'est juste un fichier local)
- ❌ **Pas de multi-processus** (LevelDB lock le fichier)
- ❌ Format binaire (pas lisible JSON)

---

### Option 2 : Synchronisation custom Fichier ↔ PouchDB

Si vous voulez synchroniser entre PouchDB (navigateur/Electron) et des fichiers JSON sur le disque :

```javascript
// Electron - Bridge entre PouchDB (renderer) et FS (main)

// main.js (processus Electron principal)
const { ipcMain } = require('electron');
const fs = require('fs').promises;
const chokidar = require('chokidar'); // Watcher de fichiers
const path = require('path');

const DATA_DIR = './data/demandes/';

// Watcher : détecte changements fichiers → notifie PouchDB
const watcher = chokidar.watch(DATA_DIR, { persistent: true });

watcher.on('change', async (filePath) => {
  const content = await fs.readFile(filePath, 'utf8');
  const doc = JSON.parse(content);
  
  // Envoyer au renderer (PouchDB)
  mainWindow.webContents.send('file-changed', {
    id: path.basename(filePath, '.json'),
    doc: doc
  });
});

// IPC : PouchDB (renderer) demande sauvegarde fichier
ipcMain.handle('save-to-file', async (event, doc) => {
  const filePath = path.join(DATA_DIR, `${doc._id}.json`);
  await fs.writeFile(filePath, JSON.stringify(doc, null, 2));
  return { success: true };
});

// IPC : Charger depuis fichier
ipcMain.handle('load-from-file', async (event, id) => {
  const filePath = path.join(DATA_DIR, `${id}.json`);
  const content = await fs.readFile(filePath, 'utf8');
  return JSON.parse(content);
});
```

```javascript
// renderer.js (PouchDB dans Electron)
const db = new PouchDB('marki');

// Sauvegarder vers fichier
async function saveToFile(doc) {
  await window.electronAPI.saveToFile(doc);
}

// Écouter changements fichier externe
window.electronAPI.onFileChanged((event, { id, doc }) => {
  // Mettre à jour PouchDB local
  db.get(id).then(localDoc => {
    if (localDoc._rev !== doc._rev) {
      db.put({ ...doc, _rev: localDoc._rev });
    }
  }).catch(() => {
    db.put(doc); // Nouveau document
  });
});

// Synchronisation manuelle (pas de "live sync" magic)
async function syncWithFilesystem() {
  const files = await window.electronAPI.listFiles();
  
  for (const file of files) {
    const fileDoc = await window.electronAPI.loadFromFile(file.id);
    const localDoc = await db.get(file.id).catch(() => null);
    
    if (!localDoc || fileDoc.updated_at > localDoc.updated_at) {
      await db.put(fileDoc);
    }
  }
}
```

**Résultat** : Un système artisanal qui :
- ⚠️ Nécessite beaucoup de code (pas natif)
- ⚠️ Pas de gestion de conflits automatique
- ⚠️ Pas de révision (_rev) native
- ⚠️ Risque de corruption si écriture concurrente
- ⚠️ Pas de sync réseau (juste local)

---

### Option 3 : PouchDB + Node.js (sans CouchDB, sans fichier)

```javascript
// Backend Node.js avec PouchDB (pas de CouchDB)
const PouchDB = require('pouchdb');
const express = require('express');
const WebSocket = require('ws');

const app = express();
const db = new PouchDB('./data/marki');

// API REST manuelle (imitation CouchDB)
app.get('/api/:id', async (req, res) => {
  const doc = await db.get(req.params.id);
  res.json(doc);
});

app.put('/api/:id', async (req, res) => {
  await db.put(req.body);
  // Broadcast via WebSocket aux autres clients
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type: 'update', doc: req.body }));
    }
  });
  res.json({ ok: true });
});

// WebSocket pour "live sync" (artisanal)
const wss = new WebSocket.Server({ port: 8080 });
wss.on('connection', (ws) => {
  ws.on('message', async (message) => {
    const data = JSON.parse(message);
    await db.put(data);
    // Diffuser aux autres
    wss.clients.forEach(client => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(data));
      }
    });
  });
});
```

**Problèmes** :
- ❌ Vous réimplémentez CouchDB (mal)
- ❌ Pas de _changes feed standard
- ❌ Pas de réplication bidirectionnelle robuste
- ❌ Conflits = données perdues

---

### Comparaison : CouchDB vs Filesystem vs Node.js+PouchDB

| Fonctionnalité | CouchDB | Filesystem simple | Node.js+PouchDB custom |
|----------------|---------|-------------------|------------------------|
| **Stockage** | Base de données | Fichiers JSON | LevelDB (fichier) |
| **Sync réseau** | ✅ HTTP natif | ❌ Non | ⚠️ WebSocket artisanal |
| **Multi-client** | ✅ Oui | ❌ Non (file lock) | ⚠️ Complexe |
| **Résolution conflits** | ✅ Automatique | ❌ Aucune | ❌ Manuelle |
| **Révisions (_rev)** | ✅ Native | ❌ Non | ✅ PouchDB locale |
| **Live sync** | ✅ Changes feed | ❌ Polling fichier | ⚠️ WebSocket |
| **Développement** | ✅ Simple | ⚠️ Complexe | ❌ Très complexe |
| **Production** | ✅ Éprouvé | ❌ Risqué | ⚠️ Risqué |

---

### Cas où Filesystem peut faire sens

**Electron Desktop (mono-utilisateur)** :
```javascript
// Utilisateur unique sur sa machine
// Pas besoin de sync réseau
// Juste persistance fichier

const db = new PouchDB('./documents/marki.db');
// LevelDB local, pas de serveur
// Backup = copier le dossier
```

**Avantages** :
- ✅ Aucun serveur à installer
- ✅ Données sur disque (backup facile)
- ✅ Offline natif

**Limites** :
- ❌ Pas de sync entre appareils
- ❌ Pas de collaboration multi-utilisateurs
- ❌ Lock fichier (un seul processus)

---

### Verdict

**Non**, vous ne pouvez pas "faire sauter CouchDB" et garder le même niveau de fonctionnalités avec juste un filesystem.

**CouchDB apporte** :
1. Un protocole de sync standardisé (_changes, _rev, etc.)
2. La résolution automatique des conflits
3. La multi-utilisateurs (HTTP concurrent)
4. Le clustering/scaling

**Avec filesystem uniquement** :
- Vous perdez la sync "live" (devient polling/manuel)
- Vous perdez la gestion des conflits
- Vous réimplémentez CouchDB (mal et long)

**Alternative acceptable** : Si vous voulez juste de la persistance fichier (sans sync réseau), PouchDB+LevelDB suffit. Mais c'est du **mono-utilisateur offline**, pas de la sync.

**Pour Marki** : Gardez CouchDB (ou PocketBase) pour la sync. Le filesystem n'apporte que la persistance, pas la collaboration.


---

## Accès et Lecture des Données dans CouchDB

### Oui, les données sont facilement accessibles !n
CouchDB stocke les documents en **JSON pur**, ce qui les rend parfaitement lisibles et accessibles.

---

### Méthode 1 : Interface Web (Fauxton)

CouchDB inclut une interface d'administration web intégrée :

```
http://localhost:5984/_utils/
```

**Ce que vous pouvez faire :**
- ✅ Naviguer dans les documents (visualisation JSON)
- ✅ Éditer directement les documents
- ✅ Créer/supprimer des bases
- ✅ Gérer les vues (design docs)
- ✅ Voir les réplications
- ✅ Exporter en JSON

**Exemple visuel :**
```
Base: marki
└── Document: demande:DOS-2024-001
    {
      "_id": "demande:DOS-2024-001",
      "_rev": "5-abc123",
      "type": "demande",
      "client": { "nom": "DURAND", ... },
      "factures": [ ... ]
    }
← Cliquez pour éditer, copier, supprimer
```

---

### Méthode 2 : API HTTP Directe (REST)

Chaque document est accessible via une simple URL :

```bash
# Lire un document spécifique
curl http://admin:password@localhost:5984/marki/demande:DOS-2024-001

# Résultat (JSON formaté) :
{
  "_id": "demande:DOS-2024-001",
  "_rev": "5-abc123",
  "type": "demande",
  "reference": "DOS-2024-001",
  "client": {
    "id": "contact:client-001",
    "nom": "DURAND",
    "prenom": "Alain"
  },
  "factures": [
    {
      "id": "facture:F001",
      "nfacture": "FACT-2024-001",
      "montant_ttc": 1250.00,
      "statut": "impaye"
    }
  ],
  "events": [...]
}
```

**Avantages :**
- ✅ Simple `curl` ou navigateur
- ✅ JSON natif (lisible)
- ✅ Pas de langage spécifique requis

---

### Méthode 3 : Export Complet

**Exporter toute la base en JSON :**
```bash
# Export complet (bulk)
curl http://admin:password@localhost:5984/marki/_all_docs?include_docs=true > backup.json

# Résultat : fichier JSON standard
{
  "total_rows": 15000,
  "offset": 0,
  "rows": [
    {
      "id": "demande:DOS-001",
      "key": "demande:DOS-001",
      "value": { "rev": "5-abc123" },
      "doc": { /* document complet */ }
    },
    ...
  ]
}
```

**Exporter via l'UI :**
- Fauxton → Base → "..." → Export JSON

---

### Méthode 4 : Depuis Node.js/JavaScript

```javascript
// Lecture simple
const response = await fetch('http://couchdb:5984/marki/demande:DOS-001');
const doc = await response.json();

console.log(doc.client.nom);  // "DURAND"
console.log(doc.factures);    // Tableau des factures

// Avec Nano (client CouchDB)
const Nano = require('nano');
const couch = Nano('http://admin:password@localhost:5984');
const db = couch.db.use('marki');

const doc = await db.get('demande:DOS-001');
console.log(doc);  // Document JSON complet
```

---

### Comparaison Accessibilité

| Où stocké | Lisible ? | Exportable ? | Interface |
|-----------|-----------|--------------|-----------|
| **CouchDB** | ✅ Oui (JSON) | ✅ Oui (HTTP) | Fauxton Web |
| **SQLite** | ⚠️ Binaire | ⚠️ SQL dump | CLI/tool |
| **PostgreSQL** | ⚠️ Binaire | ⚠️ SQL dump | pgAdmin |
| **Fichier JSON** | ✅ Oui | ✅ Oui | Éditeur texte |
| **LevelDB** | ❌ Binaire | ❌ Non | Code uniquement |

**Conclusion** : CouchDB est **très accessible** car JSON natif.

---

### Pièges Jointes (Attachments)

Si vous stockez des **fichiers binaires** (PDF, images) dans CouchDB :

```json
{
  "_id": "demande:DOS-001",
  "_attachments": {
    "facture.pdf": {
      "content_type": "application/pdf",
      "data": "JVBERi0xLjQKJ..."  // ← Base64 encodé
    }
  }
}
```

**Accès :**
```bash
# Télécharger le fichier
curl http://couchdb:5984/marki/demande:DOS-001/facture.pdf > facture.pdf
```

Mais les documents JSON eux-mêmes sont **toujours lisibles**.

---

### Verdict

**Oui**, lire les données dans CouchDB est **très facile** :
1. **Navigateur** : Interface Fauxton (clic-clic)
2. **Terminal** : `curl` simple
3. **Code** : Fetch/HTTP standard
4. **Export** : JSON natif utilisable partout

C'est un avantage majeur de CouchDB vs SQLite/PostgreSQL : les données sont en **JSON clair**, pas en format binaire propriétaire.


---

## Stockage Physique sur le Serveur CouchDB

### Où sont les données sur le disque ?

Sur le serveur qui héberge CouchDB, les données sont stockées dans des **fichiers binaires**, pas en JSON lisible directement.

**Emplacement par défaut** :
```bash
Linux : /var/lib/couchdb/data/
Docker : /opt/couchdb/data/
Windows : C:\CouchDB\data\
Mac : /usr/local/var/lib/couchdb/
```

**Structure** :
```
data/
├── marki.couch           # ← Base "marki" (fichier binaire CouchDB)
├── marki_design/         # ← Vues indexées (fichiers binaires)
│   ├── _design_demandes.1
│   └── _design_stats.1
├── _replicator.couch     # Config réplications
└── _users.couch          # Utilisateurs CouchDB
```

**⚠️ Important** : Ce sont des **fichiers binaires CouchDB**, pas du JSON !

---

### Format de stockage interne

CouchDB utilise un format binaire appelé **B-tree** (arbre équilibré) optimisé pour :
- Les lectures rapides par clé
- L'ajout immérialisé (append-only)
- La réplication efficace

```bash
# Ce n'est PAS un fichier JSON lisible :
$ cat /var/lib/couchdb/data/marki.couch
# Résultat : caractères binaires illisibles
# couch-db-format����... (binaire)
```

**Donc :**
- ❌ Vous ne pouvez pas lire directement les `.couch` avec un éditeur texte
- ❌ Ce n'est pas un fichier JSON par document
- ✅ C'est optimisé pour les performances CouchDB

---

### Comment accéder aux données sur le serveur ?

#### Méthode 1 : API HTTP (Recommandée)

Depuis le serveur lui-même ou à distance :
```bash
# Sur le serveur CouchDB
$ curl http://localhost:5984/marki/demande:DOS-001
{ "_id": "demande:DOS-001", ... }  # ← JSON lisible
```

#### Méthode 2 : Outil couchdb-dump

```bash
# Installation
npm install -g couchdb-dump

# Exporter en JSON lisible
couchdb-dump http://localhost:5984/marki > backup.json

# Résultat : fichier JSON standard avec tous les documents
```

#### Méthode 3 : Fichier de backup CouchDB

```bash
# Backup via API (depuis le serveur)
curl http://localhost:5984/marki/_all_docs?include_docs=true > /backup/marki.json

# Ou replication vers fichier
```

#### Méthode 4 : Réplication vers fichier JSON

```bash
# Répliquer vers une base fichier (JSON lines)
curl -X POST http://localhost:5984/_replicate \
  -d '{"source":"marki","target":"file:///backup/marki.json"}'
```

---

### Backup Physique (Fichiers .couch)

**Vous pouvez copier les fichiers `.couch`**, mais attention :

```bash
# Arrêter CouchDB avant (sinon corruption possible)
sudo systemctl stop couchdb

# Copier les fichiers
cp /var/lib/couchdb/data/marki.couch /backup/marki-$(date +%Y%m%d).couch

# Redémarrer
sudo systemctl start couchdb
```

**Ou utiliser le mode "backup en ligne"** :
```bash
# CouchDB 3.0+ : snapshot sans arrêt
curl -X POST http://localhost:5984/marki/_ensure_full_commit
# Puis copier les fichiers (ils sont cohérents)
```

---

### Résumé : Accès données sur serveur

| Méthode | Format | Lisible ? | Quand l'utiliser |
|---------|--------|-----------|------------------|
| **API HTTP** | JSON | ✅ Oui | Accès normal, développement |
| **Fichier .couch** | Binaire | ❌ Non | Backup physique, migration |
| **Export JSON** | JSON | ✅ Oui | Archivage, migration vers autre système |
| **Réplication** | Format CouchDB | ⚠️ Protocol | Sync entre serveurs |

**Verdict** :
- Sur le serveur, les données sont en **binaire CouchDB** (fichiers `.couch`)
- Pour lire/exporter : utilisez l'**API HTTP** ou les **outils d'export JSON**
- Le stockage physique est optimisé pour CouchDB, pas pour lecture humaine directe


---

## PouchDB et les Documents Imbriqués (Embeds)

### Oui, PouchDB gère parfaitement les structures imbriquées

PouchDB stocke des **documents JSON natifs**, donc n'importe quelle structure imbriquée est supportée :

```javascript
// Document avec embeds (notre architecture "demande")
const doc = {
  _id: "demande:DOS-001",
  type: "demande",
  
  // Objet imbriqué (embed)
  client: {
    id: "contact:001",
    nom: "DURAND",
    adresse: {
      rue: "15 rue de la Paix",      // Niveau 2 d'imbrication
      ville: "Paris"
    }
  },
  
  // Tableaux imbriqués (embeds multiples)
  factures: [
    { 
      id: "F001", 
      montant: 1250,
      lignes: [                       // Imbrication profonde
        { produit: "Service A", prix: 500 },
        { produit: "Service B", prix: 750 }
      ]
    },
    { id: "F002", montant: 890 }
  ],
  
  // Tableau d'objets imbriqués
  events: [
    { type: "creation", date: "2024-01-15", user: "agent-001" },
    { type: "modification", date: "2024-02-01", user: "agent-002" }
  ]
};

// Stockage (aucune limitation de profondeur)
await db.put(doc);

// Récupération (structure préservée)
const retrieved = await db.get("demande:DOS-001");
console.log(retrieved.factures[0].lignes[0].produit); // "Service A"
```

---

### Limitations des Embeds dans PouchDB

#### 1. **Taille des documents**

```javascript
// ⚠️ Attention aux documents trop gros
const grosDoc = {
  _id: "demande:DOS-999",
  factures: [/* 10 000 factures */],  // Trop !
  historique: [/* 50 000 events */]   // Trop !
};

// Limite recommandée : documents < 10MB
// Au-delà : performances dégradées (sync lente, mémoire)
```

**Recommandation** : Limiter à ~100-500 items par tableau imbriqué.

#### 2. **Requêtes sur tableaux imbriqués**

```javascript
// ❌ Impossible d'indexer directement un champ dans un tableau
await db.createIndex({
  index: { fields: ['factures.statut'] }  // Ne fonctionne pas bien !
});

// ✅ Solution : dénormaliser
const doc = {
  _id: "demande:DOS-001",
  has_impayes: true,                    // Champ dénormalisé
  montant_total_impayes: 1740,          // Total calculé
  factures: [...]
};

// Index sur champ dénormalisé
await db.createIndex({
  index: { fields: ['has_impayes', 'client.id'] }
});
```

#### 3. **Mise à jour partielle impossible**

```javascript
// ❌ Impossible de modifier une seule facture dans le tableau
const doc = await db.get("demande:DOS-001");
doc.factures[0].statut = "solde";  // Modification locale

// Doit réécrire TOUT le document (toutes les factures)
await db.put(doc);  // Réécriture complète !

// ⚠️ Risque de conflits si document modifié entre temps
```

**Solution** : Pattern "fetch-modify-save" avec gestion de conflits :
```javascript
async function updateFacture(demandeId, factureId, changes) {
  try {
    const doc = await db.get(demandeId);
    const facture = doc.factures.find(f => f.id === factureId);
    Object.assign(facture, changes);
    await db.put(doc);
  } catch (err) {
    if (err.status === 409) {  // Conflit
      // Retry avec nouvelle version
      return updateFacture(demandeId, factureId, changes);
    }
    throw err;
  }
}
```

---

### Bonnes Pratiques pour les Embeds

#### Règle 1 : Embedder les données stables

```javascript
// ✅ Embedder : données qui changent rarement avec le parent
{
  client: { nom, email },           // Snapshot (stable)
  factures: [                       // Liste limitée (< 100)
    { id, montant, date }
  ]
}

// ❌ Ne pas embedder : données volumineuses ou indépendantes
// → Utiliser documents séparés avec référence
```

#### Règle 2 : Limiter la profondeur

```javascript
// ✅ 2-3 niveaux maximum recommandé
{
  client: {
    adresse: {
      ville: "Paris"     // Niveau 3 : OK
    }
  }
}

// ❌ Éviter 5+ niveaux (complexité, performance)
{
  niveau1: {
    niveau2: {
      niveau3: {
        niveau4: {
          niveau5: "trop profond"
        }
      }
    }
  }
}
```

#### Règle 3 : Champs dénormalisés pour faciliter les requêtes

```javascript
// Document avec champs calculés (dénormalisation)
const demande = {
  _id: "demande:DOS-001",
  
  // Données brutes (embeds)
  factures: [
    { statut: "impaye", montant: 1000 },
    { statut: "solde", montant: 500 }
  ],
  
  // Champs dénormalisés (pour indexation/recherche)
  nb_factures: 2,
  nb_impayes: 1,
  montant_total_du: 1000,
  has_impayes: true,
  date_derniere_facture: "2024-02-01"
};

// Indexation facile
await db.createIndex({
  index: { fields: ['has_impayes', 'montant_total_du'] }
});
```

---

### Comparaison Embeds vs Références

| Cas | Embed (dans demande) | Référence (document séparé) |
|-----|---------------------|----------------------------|
| **Lecture fiche** | ✅ 1 requête | ❌ 2+ requêtes (JOIN) |
| **Mise à jour** | ⚠️ Réécriture complète | ✅ Partielle (un doc) |
| **Requête globale** | ❌ Difficile (tableau) | ✅ Facile (vue) |
| **Taille document** | ⚠️ Limitée | ✅ Illimitée |
| **Conflits** | ⚠️ Plus fréquents | ✅ Moins fréquents |

**Verdict pour Marki** : Embeds adaptés car :
- Une facture appartient à une seule demande
- Volume limité (< 100 factures/demande)
- Lecture fréquente, modification rare

---

### Exemple Complet : Gestion des Embeds

```javascript
// frontend/services/demandes.service.js

export class DemandeService {
  constructor(db) {
    this.db = db;
  }
  
  // Lire avec tous les embeds (1 requête)
  async getDemandeComplete(id) {
    return await this.db.get(id);  // Tout est là !
  }
  
  // Ajouter une facture (réécriture complète)
  async ajouterFacture(demandeId, facture) {
    const doc = await this.db.get(demandeId);
    
    // Ajouter au tableau
    doc.factures.push(facture);
    
    // Recalculer les champs dénormalisés
    doc.nb_factures = doc.factures.length;
    doc.montant_total_du = doc.factures
      .filter(f => f.statut !== 'solde')
      .reduce((sum, f) => sum + f.montant, 0);
    doc.has_impayes = doc.factures.some(f => f.statut === 'impaye');
    
    // Sauvegarder (tout le document)
    await this.db.put(doc);
    return doc;
  }
  
  // Rechercher par critères sur embeds (via dénormalisation)
  async findDemandesAvecImpayes(clientId) {
    return await this.db.find({
      selector: {
        type: 'demande',
        'client.id': clientId,
        has_impayes: true  // Champ dénormalisé indexé
      }
    });
  }
}
```

---

### Conclusion

**Oui, PouchDB gère parfaitement les embeds**, mais avec contraintes :

1. ✅ **Structure JSON** : Aucune limite de profondeur théorique
2. ⚠️ **Performance** : Documents < 10MB recommandés
3. ⚠️ **Requêtes** : Difficile d'indexer dans tableaux (préférer dénormalisation)
4. ⚠️ **Mise à jour** : Réécriture complète du document parent

**Pour l'architecture Marki** : Les embeds sont parfaits car :
- Cycle de vie lié (facture → demande)
- Volume contrôlé (archivage possible)
- Lecture atomique privilégiée
- Sync CouchDB/PouchDB gère bien les documents JSON complexes


---

## Fonctionnement Technique des Embeds dans PouchDB

### Qu'est-ce qu'un embed exactement ?

Un **embed** (document imbriqué) n'est pas une structure spéciale. C'est simplement du **JSON natif** stocké dans un champ.

```javascript
// Un embed, c'est juste du JSON dans un champ
{
  "_id": "demande:DOS-001",
  "type": "demande",
  
  // "client" est un champ contenant un objet JSON
  "client": {
    "id": "contact:001",
    "nom": "DURAND",
    "email": "alain@email.com"
  },
  
  // "factures" est un champ contenant un tableau JSON
  "factures": [
    { "id": "F001", "montant": 1250 },
    { "id": "F002", "montant": 890 }
  ]
}
```

**Point clé** : Pour PouchDB (et CouchDB), c'est juste **du texte JSON**. Pas de structure relationnelle, pas de clé étrangère, pas de JOIN.

---

### Comment PouchDB stocke un document avec embeds ?

#### 1. **Sérialisation JSON**

```javascript
// En mémoire (JavaScript)
const doc = {
  _id: "demande:DOS-001",
  client: { nom: "DURAND", adresse: { rue: "15 rue Paix" } },
  factures: [{ id: "F001", montant: 1250 }]
};

// PouchDB sérialise en chaîne JSON
const jsonString = JSON.stringify(doc);
// '{"_id":"demande:DOS-001","client":{"nom":"DURAND"...}'
```

#### 2. **Stockage dans IndexedDB** (navigateur)

```javascript
// IndexedDB stocke la chaîne JSON comme valeur
{
  key: "demande:DOS-001",           // Clé primaire
  value: '{"_id":"demande:DOS-001",...}'  // Valeur JSON (texte)
}
```

**Visualisation IndexedDB** :
```
IndexedDB: _pouch_marki
├─ ObjectStore: _by_id
│   ├─ Key: "demande:DOS-001"
│   │   Value: "{\"_id\":\"demande:DOS-001\",\"client\":{\"nom\":\"DURAND\"},\"factures\":[{\"id\":\"F001\"...}]}"
│   │
│   └─ Key: "contact:client-001"
│       Value: "{\"_id\":\"contact:client-001\",\"nom\":\"DURAND\"...}"
│
└─ ObjectStore: _by_seq
    └─ Index secondaire pour sync
```

#### 3. **Pas de structure relationnelle**

Contrairement à SQL où les données seraient normalisées :

```sql
-- SQL (relations)
Table demandes: id, reference, client_id (FK)
Table clients: id, nom, email
Table factures: id, demande_id (FK), montant

-- Nécessite JOIN pour récupérer
SELECT d.*, c.nom, c.email, f.montant 
FROM demandes d
JOIN clients c ON d.client_id = c.id
JOIN factures f ON f.demande_id = d.id
WHERE d.id = 'DOS-001';
```

Dans PouchDB (NoSQL), tout est **plat dans un seul document** :

```javascript
// NoSQL (document complet)
{
  _id: "demande:DOS-001",
  reference: "DOS-001",
  // Pas de JOIN : les données sont DÉJÀ là
  client: { id: "C001", nom: "DURAND", email: "a@email.com" },
  factures: [
    { id: "F001", montant: 1250 },
    { id: "F002", montant: 890 }
  ]
}
// Une seule lecture : await db.get("demande:DOS-001")
```

---

### Traitement par PouchDB : Get et Put

#### Lecture (`db.get()`)

```javascript
// 1. PouchDB récupère la chaîne JSON depuis IndexedDB
const jsonString = await indexedDB.get("demande:DOS-001");

// 2. Parse le JSON en objet JavaScript
const doc = JSON.parse(jsonString);

// 3. Retourne l'objet avec structure préservée
console.log(doc.client.nom);      // "DURAND" (accès direct)
console.log(doc.factures[0].id);  // "F001" (accès direct)
```

**Complexité** : O(1) - Accès direct par clé, très rapide.

#### Écriture (`db.put()`)

```javascript
// 1. PouchDB prend l'objet JavaScript
const doc = {
  _id: "demande:DOS-001",
  client: { nom: "DURAND" },
  factures: [{ id: "F001", montant: 1250 }]
};

// 2. Sérialise en JSON (tout l'arbre imbriqué)
const jsonString = JSON.stringify(doc);

// 3. Stocke dans IndexedDB
await indexedDB.put({
  key: doc._id,
  value: jsonString  // Tout est là, imbriqué dans la chaîne
});
```

**Important** : Même si tu modifies juste `factures[0].statut`, **tout le document est réécrit**.

---

### Stockage physique : Exemple concret

Si tu ouvres les DevTools → Application → IndexedDB :

```
Database: _pouch_marki
└── Object store: _by_id
    └── demande:DOS-001
        └── Value: "{\"_id\":\"demande:DOS-001\",\"_rev\":\"1-abc\",\"type\":\"demande\",\"client\":{\"id\":\"contact:001\",\"nom\":\"DURAND\",\"email\":\"alain@email.com\",\"adresse\":{\"rue\":\"15 rue de la Paix\",\"ville\":\"Paris\"}},\"factures\":[{\"id\":\"facture:F001\",\"nfacture\":\"FACT-2024-001\",\"montant_ttc\":1250,\"statut\":\"impaye\"},{\"id\":\"facture:F002\",\"nfacture\":\"FACT-2024-002\",\"montant_ttc\":890,\"statut\":\"impaye\"}],\"relances\":[{\"id\":\"relance:R001\",\"date_envoi\":\"2024-02-15T09:00:00Z\",\"statut\":\"envoyee\"}],\"stats\":{\"nb_factures\":2,\"montant_total_du\":2140}}"
```

**Observation** :
- C'est une **seule chaîne de caractères**
- Tout est concaténé : `_id`, `client`, `factures`, `relances`, `stats`
- Pas de séparation physique entre les niveaux

---

### Sync avec CouchDB : Comment les embeds voyagent

#### Réplication

Quand PouchDB synchronise avec CouchDB :

```javascript
// 1. Document local (PouchDB)
const doc = await dbLocal.get("demande:DOS-001");

// 2. Sérialisé en JSON pour le réseau
const jsonForNetwork = JSON.stringify(doc);
// '{"_id":"demande:DOS-001","client":{...},"factures":[...]}'

// 3. Envoyé à CouchDB via HTTP POST
POST /marki/demande:DOS-001
Body: {"_id":"demande:DOS-001","client":{"nom":"DURAND"},...}

// 4. CouchDB stocke (couchdb stocke aussi en JSON/B-tree)
// CouchDB → B-tree interne avec révision (_rev)
```

**Le embed traverse le réseau comme du JSON texte**, puis est re-parsé côté serveur.

---

### Performance des Embeds

#### Avantages

| Aspect | Performance | Pourquoi |
|--------|-------------|----------|
| **Lecture** | ⭐⭐⭐ Excellente | Une clé = tout le document |
| **Relations** | ⭐⭐⭐ Excellente | Pas de JOIN, déjà inclus |
| **Sync** | ⭐⭐⭐ Excellente | Un document = une unité de sync |

#### Inconvénients

| Aspect | Performance | Pourquoi |
|--------|-------------|----------|
| **Modification partielle** | ⭐ Faible | Doit réécrire tout le document |
| **Recherche dans tableau** | ⭐ Faible | Pas d'index sur sous-champs |
| **Taille** | ⭐ Limite | Document > 10MB = problème |

---

### Analogie Simple

**Embed = Document papier avec formulaires** :

```
┌─────────────────────────────────────────────────────────────┐
│  DEMANDE N° DOS-2024-001                                    │
├─────────────────────────────────────────────────────────────┤
│  CLIENT (section du formulaire)                             │
│    Nom: DURAND                                              │
│    Email: alain@email.com                                   │
│    Adresse: 15 rue de la Paix, Paris                        │
├─────────────────────────────────────────────────────────────┤
│  FACTURES (tableau sur le formulaire)                       │
│    ┌──────────┬──────────┬──────────┐                       │
│    │ N°       │ Montant  │ Statut   │                       │
│    ├──────────┼──────────┼──────────┤                       │
│    │ F001     │ 1250€    │ Impayé   │                       │
│    │ F002     │ 890€     │ Impayé   │                       │
│    └──────────┴──────────┴──────────┘                       │
├─────────────────────────────────────────────────────────────┤
│  ÉVÉNEMENTS (historique sur le formulaire)                  │
│    - 15/01/2024: Création                                   │
│    - 20/02/2024: Relance envoyée                            │
└─────────────────────────────────────────────────────────────┘
```

**PouchDB** : Stocke cette "feuille" comme une seule chaîne de caractères.

**SQL** : Aurait séparé en 3 tables avec des liens (JOIN).

---

### Résumé Technique

```
┌─────────────────────────────────────────────────────────────────┐
│                     DOCUMENT AVEC EMBEDS                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   JavaScript Object (mémoire)                                   │
│   ├── {                                                        │
│   │   _id: "demande:DOS-001",                                   │
│   │   client: { nom: "DURAND", email: "a@email.com" },          │
│   │   factures: [ { id: "F001", montant: 1250 }, ... ]        │
│   │ }                                                          │
│   │                                                            │
│   │    ↓ JSON.stringify()                                       │
│   │                                                            │
│   │    "{\"_id\":\"demande:DOS-001\",\"client\":{\"nom\":\"DURAND\"...}"
│   │                                                            │
│   │    ↓ Stockage IndexedDB                                     │
│   │                                                            │
│   │    Key: "demande:DOS-001"                                   │
│   │    Value: "{\"_id\":\"demande:DOS-001\",...}" (chaîne)        │
│   │                                                            │
│   │    ↓ Réplication HTTP                                       │
│   │                                                            │
│   │    POST /marki/demande:DOS-001                              │
│   │    Body: "{\"_id\":\"demande:DOS-001\",...}"                │
│   │                                                            │
│   │    ↓ Stockage CouchDB                                       │
│   │                                                            │
│   │    B-tree Node: key="demande:DOS-001",                      │
│   │                  value="{\"_id\":...\"client\":...}"            │
│   │                                                            │
│   │    ↓ Lecture (CouchDB)                                      │
│   │                                                            │
│   │    GET /marki/demande:DOS-001                               │
│   │    Response: "{\"_id\":...}"                                  │
│   │                                                            │
│   │    ↓ JSON.parse()                                           │
│   │                                                            │
│   │    { _id: "demande:DOS-001", client: {...}, ... }           │
│   │                                                            │
│   └──                                                            │
└─────────────────────────────────────────────────────────────────┘

"Un embed, c'est juste du JSON dans un champ, stocké comme du texte."

---

## Différence : Embed vs Dénormalisé

Ces deux concepts sont souvent confondus mais sont **distincts** et **complémentaires**.

### Définitions

| Concept | Définition | Objectif |
|---------|-----------|----------|
| **Embed** (Imbriqué) | Mettre des données dans des objets/tableaux à l'intérieur d'un document | Hiérarchie, lecture atomique |
| **Dénormalisé** | Dupliquer des données dans plusieurs documents | Éviter les jointures/requêtes |

**Un document peut être :**
- ✅ Embed mais **pas** dénormalisé (hiérarchie pure)
- ✅ Dénormalisé mais **pas** embed (copies plates)
- ✅ Les deux (hiérarchie + copies)

---

### Exemple 1 : Embed sans dénormalisation

```javascript
// Un seul document, tout est imbriqué
{
  "_id": "demande:DOS-001",
  "type": "demande",
  
  // EMBED : client est un objet imbriqué
  "client": {
    "id": "contact:001",        // ← ID référence (lien logique)
    "nom": "DURAND",
    "email": "alain@email.com"
    // Pas de duplication : c'est le SEUL endroit où ces données existent
  },
  
  // EMBED : factures sont dans un tableau
  "factures": [
    { "id": "F001", "montant": 1250 }
  ]
}

// Le document "contact:001" existe aussi mais avec PLUS de détails
{
  "_id": "contact:001",
  "nom": "DURAND",
  "email": "alain@email.com",
  "telephone": "+33123456789",    // Info supplémentaire
  "adresse": "15 rue de la Paix", // Info supplémentaire
  "notes": "Client prioritaire"   // Info supplémentaire
}

// Ce n'est PAS de la dénormalisation car :
// - Le document demande n'a que les infos ESSENTIELLES du client
// - Le document contact a les infos COMPLÈTES
// - C'est un "snapshot" partiel, pas une copie complète
```

**C'est de l'embedding** car les données sont imbriquées.  
**Ce n'est pas de la dénormalisation** car ce n'est pas une duplication complète (juste un sous-ensemble).

---

### Exemple 2 : Dénormalisé sans embed

```javascript
// Copie exacte du même document dans plusieurs endroits (PLAT, pas imbriqué)

// Document 1 : Client avec sa demande
{
  "_id": "client-avec-demande:001",
  "type": "client_view",
  "client_nom": "DURAND",           // ← Copie
  "client_email": "alain@email.com", // ← Copie
  "demande_reference": "DOS-001",    // ← Copie
  "demande_montant": 2140          // ← Copie
}

// Document 2 : Même données, vue agence
{
  "_id": "agence-view:demande:001",
  "type": "agence_view",
  "client_nom": "DURAND",           // ← MÊME copie
  "client_email": "alain@email.com", // ← MÊME copie
  "demande_reference": "DOS-001",    // ← MÊME copie
  "commission": 214                 // ← Champ différent
}

// Ici les données sont DUPLIQUÉES à plat (sans hiérarchie)
// C'est de la dénormalisation pure
```

**C'est de la dénormalisation** (données dupliquées).  
**Ce n'est pas de l'embedding** (pas de structure hiérarchique).

---

### Exemple 3 : Embed + Dénormalisé (Architecture Marki)

```javascript
// Document demande avec EMBED + DÉNORMALISATION
{
  "_id": "demande:DOS-001",
  "type": "demande",
  
  // ========== EMBED (hiérarchie) ==========
  "client": {
    "id": "contact:001",
    "nom": "DURAND",
    "email": "alain@email.com"
  },
  
  "factures": [
    { "id": "F001", "montant": 1250, "statut": "impaye" }
  ],
  
  // ========== DÉNORMALISÉ (copies calculées) ==========
  // Ces champs sont calculés depuis les factures (duplication)
  "stats": {
    "nb_factures": 1,                // ← Dénormalisé (count)
    "nb_impayes": 1,                 // ← Dénormalisé (count filtré)
    "montant_total_du": 1250,        // ← Dénormalisé (sum)
    "has_impayes": true              // ← Dénormalisé (booléen calculé)
  },
  
  // ========== DÉNORMALISÉ (cache de référence) ==========
  // Copie pour éviter de charger le document contact
  "client_snapshot": {
    "nom": "DURAND",
    "email": "alain@email.com",
    "telephone": "+33123456789",      // ← Copie à jour lors de la création
    "copied_at": "2024-01-15T10:00:00Z"
  }
}
```

**Analysis :**
- ✅ `client`, `factures` → **Embed** (hiérarchie)
- ✅ `stats.nb_factures`, `stats.montant_total_du` → **Dénormalisé** (calculés)
- ✅ `client_snapshot` → **Dénormalisé** (copie cache)

---

### Tableau Comparatif Complet

| Aspect | Embed (Imbriqué) | Dénormalisé (Dupliqué) |
|--------|------------------|----------------------|
| **Structure** | Hiérarchique (objets/tableaux) | Plat ou hiérarchique |
| **Données** | Unique (source de vérité) | Copie (redondant) |
| **Mise à jour** | Complexe (un seul doc) | Complexe (plusieurs docs) |
| **Lecture** | Rapide (1 requête) | Rapide (pas de JOIN) |
| **Stockage** | Économique | Coûteux (doublons) |
| **Cohérence** | Forte (un seul endroit) | Faible (risque divergence) |
| **Use case** | Relation 1-N faible | Éviter jointures/requêtes |

---

### Quand utiliser quoi ?

#### Embed (Imbriqué) quand :
- Relation **1-N faible** (un client a peu de demandes)
- Les données sont **toujours lues ensemble**
- Cycle de vie **lié** (si demande supprimée, factures aussi)
- **Pas besoin** de requêter les enfants indépendamment

```javascript
// ✅ Bon : Factures dans demande (1-N faible, cycle lié)
{
  "_id": "demande:DOS-001",
  "factures": ["F001", "F002"]  // Jamais requêtées seules
}
```

#### Dénormaliser quand :
- Besoin de **requêtes rapides** sans calcul
- Données **rarement modifiées** ( évite synchro)
- **Éviter jointures** critiques pour perfs
- **Snapshots** historiques (état à un instant T)

```javascript
// ✅ Bon : Total pré-calculé pour tri rapide
{
  "_id": "demande:DOS-001",
  "montant_total": 2140  // Calculé, pas besoin de sum(factures)
}
```

#### Les deux quand :
- Architecture Marki : Embed pour hiérarchie + dénormaliser pour stats

---

### Exemple Concret : Évolution d'une architecture

#### Étape 1 : Normalisé (SQL-like) ❌ Mauvais pour CouchDB
```javascript
// Document contact séparé
{ "_id": "contact:001", "nom": "DURAND" }

// Document demande avec référence
{ "_id": "demande:DOS-001", "client_id": "contact:001" }

// Document facture avec référence
{ "_id": "facture:F001", "demande_id": "demande:DOS-001", "montant": 1250 }

// Problème : Pour afficher une fiche, besoin de 3 requêtes (JOIN)
```

#### Étape 2 : Embed (Hiérarchie) ✅ Bon
```javascript
// Tout dans un document
{
  "_id": "demande:DOS-001",
  "client": { "id": "contact:001", "nom": "DURAND" },
  "factures": [{ "id": "F001", "montant": 1250 }]
}
// Une requête suffit ! Mais pour trier par montant total...
```

#### Étape 3 : Embed + Dénormalisé ✅ Architecture Marki optimale
```javascript
// Hiérarchie + champs calculés
{
  "_id": "demande:DOS-001",
  "client": { "id": "contact:001", "nom": "DURAND" },
  "factures": [{ "id": "F001", "montant": 1250 }],
  
  // Dénormalisé pour performance
  "stats": {
    "montant_total": 1250,    // Calculé depuis factures
    "nb_factures": 1          // Calculé depuis factures
  }
}
// Une requête + tri rapide possible sur montant_total
```

---

### Résumé avec Analogie

| Concept | Analogie Bibliothèque |
|---------|---------------------|
| **Embed** | Un dossier contenant des feuilles (hiérarchie physique) |
| **Dénormalisé** | Photocopier une page dans plusieurs dossiers (duplication) |
| **Marki** | Dossier avec feuilles (embed) + post-it récap (dénormalisé) |

**En NoSQL (CouchDB/PouchDB)** :
- **Embed** = Structure (comment les données sont organisées)
- **Dénormalisé** = Optimisation (comment les données sont dupliquées pour la performance)

