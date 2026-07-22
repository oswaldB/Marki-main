# Workflow : Gérer liens de paiement (PouchDB)

## Écran
`sequences-relance-detail.html`

## Élément déclencheur
Bouton avec `@click="ouvrirModalLiensPaiement()"`

## Action
Ouvrir la gestion des liens de paiement

## Description
- Affiche les liens de paiement configurés depuis PouchDB
- Permet d'ajouter/modifier/supprimer
- Liens vers Stripe, PayPal, etc.
- Synchronisation automatique avec CouchDB

## Data Model
**Page Function:** `sequencesRelanceDetailPage()`

**Stores Alpine.js:**
- $store.ui

**Données (depuis PouchDB):**
- `sequence` - séquence depuis PouchDB
- `etapes`
- `modeles`
- `activeTab`
- `draggingEtape`
- `editingEtape`
- `editorInstance`
- `liensPaiement` - liens chargés depuis PouchDB
- `db` - instance PouchDB

**États UI:**
- `loading`
- `error`
- `saving`
- `hasChanges`
- `showEtapeModal`
- `showModeleModal`
- `showDeleteEtapeModal`
- `showLiensPaiementModal`

## State Changes

**Modifications:**
- `showLiensPaiementModal` ← `true`
- `liensPaiement` ← chargé depuis PouchDB
- `loading` ← `true` → `false`

## PouchDB Operations

### Chargement des liens de paiement

```javascript
async loadLiensPaiement() {
  this.loading = true;
  
  try {
    // Récupérer tous les liens de paiement depuis PouchDB
    const result = await db.allDocs({
      startkey: 'lien-paiement:',
      endkey: 'lien-paiement:\ufff0',
      include_docs: true
    });
    
    this.liensPaiement = result.rows
      .map(row => row.doc)
      .filter(doc => doc.actif !== false); // Uniquement actifs
      
  } catch (error) {
    console.error('Erreur chargement liens:', error);
    this.error = error.message;
  } finally {
    this.loading = false;
  }
}
```

### Créer un lien de paiement

```javascript
async createLienPaiement(data) {
  this.saving = true;
  
  try {
    const newLien = {
      _id: 'lien-paiement:' + Date.now(), // ou uuid
      type: 'lien-paiement',
      nom: data.nom,
      url: data.url,
      actif: true,
      created_at: new Date().toISOString()
    };
    
    const response = await db.put(newLien);
    // response: { ok: true, id: 'lien-paiement:...', rev: '1-xxx...' }
    
    this.liensPaiement.push({ ...newLien, _rev: response.rev });
    this.toast('Lien créé', 'success');
    
  } catch (error) {
    this.toast(error.message, 'error');
  } finally {
    this.saving = false;
  }
}
```

### Modifier un lien de paiement

```javascript
async updateLienPaiement(id, data) {
  this.saving = true;
  
  try {
    // Récupérer le document avec sa révision
    const doc = await db.get(id);
    
    // Mettre à jour les champs
    doc.nom = data.nom;
    doc.url = data.url;
    doc.updated_at = new Date().toISOString();
    
    // Sauvegarder
    const response = await db.put(doc);
    
    // Mettre à jour l'UI
    const index = this.liensPaiement.findIndex(l => l._id === id);
    if (index >= 0) {
      this.liensPaiement[index] = { ...doc, _rev: response.rev };
    }
    
    this.toast('Lien mis à jour', 'success');
    
  } catch (error) {
    if (error.status === 409) {
      this.toast('Conflit de version, veuillez réessayer', 'error');
    } else {
      this.toast(error.message, 'error');
    }
  } finally {
    this.saving = false;
  }
}
```

### Supprimer un lien de paiement

```javascript
async deleteLienPaiement(id) {
  if (!confirm('Supprimer ce lien ?')) return;
  
  this.loading = true;
  
  try {
    // Récupérer le document avec sa révision
    const doc = await db.get(id);
    
    // Suppression logique (soft delete)
    doc.actif = false;
    doc.deleted_at = new Date().toISOString();
    
    await db.put(doc);
    
    // Mettre à jour l'UI
    this.liensPaiement = this.liensPaiement.filter(l => l._id !== id);
    
    this.toast('Lien supprimé', 'success');
    
  } catch (error) {
    if (error.status === 409) {
      this.toast('Conflit de version, veuillez réessayer', 'error');
    } else {
      this.toast(error.message, 'error');
    }
  } finally {
    this.loading = false;
  }
}
```

### Live Sync (temps réel)

```javascript
db.changes({
  since: 'now',
  live: true,
  include_docs: true,
  filter: (doc) => doc.type === 'lien-paiement'
}).on('change', (change) => {
  // Mettre à jour la liste si un lien est modifié
  const index = this.liensPaiement.findIndex(l => l._id === change.doc._id);
  
  if (change.deleted) {
    this.liensPaiement = this.liensPaiement.filter(l => l._id !== change.doc._id);
  } else if (change.doc.actif !== false) {
    if (index >= 0) {
      this.liensPaiement[index] = change.doc;
    } else {
      this.liensPaiement.push(change.doc);
    }
  }
}).on('error', (err) => {
  console.error('Erreur sync liens:', err);
});
```

## Organisation des fichiers

```
frontend/
└── app/
    └── sequences-relance-detail/
        ├── index.html
        ├── components/
        │   └── (composants partagés)
        └── js/
            └── open-liens-paiement.js
```

### Fichier principal
- **HTML** : `frontend/app/sequences-relance-detail/index.html`
- **Point d'entrée** : Initialise la page Alpine.js avec PouchDB

### Fichier workflow
- **JS** : `frontend/app/sequences-relance-detail/js/open-liens-paiement.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/sequences-relance-detail/js/open-liens-paiement.js
export function openLiensPaiement() {
  // Implementation avec PouchDB
}

export async function loadLiensPaiement() {
  // Charger depuis PouchDB
}

export async function createLienPaiement(data) {
  // Créer dans PouchDB
}

export async function updateLienPaiement(id, data) {
  // Mettre à jour dans PouchDB
}

export async function deleteLienPaiement(id) {
  // Supprimer dans PouchDB (soft delete)
}
```

## Implementation (PouchDB)

```javascript
ouvrirModalLiensPaiement() {
  // 1. Charger les liens depuis PouchDB
  this.loadLiensPaiement();
  
  // 2. Afficher la modale
  this.showLiensPaiementModal = true;
}

async loadLiensPaiement() {
  this.loading = true;
  
  try {
    const result = await db.allDocs({
      startkey: 'lien-paiement:',
      endkey: 'lien-paiement:\ufff0',
      include_docs: true
    });
    
    this.liensPaiement = result.rows
      .map(row => row.doc)
      .filter(doc => doc.actif !== false);
      
  } catch (error) {
    this.error = error.message;
  } finally {
    this.loading = false;
  }
}
```

## Document Structure (PouchDB)

```json
{
  "_id": "lien-paiement:1699876543210",
  "_rev": "1-abc123...",
  "type": "lien-paiement",
  "nom": "Stripe",
  "url": "https://pay.stripe.com/...",
  "actif": true,
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

---

## Migration depuis l'ancienne API

| Aspect | Avant (API) | Après (PouchDB) |
|--------|-------------|-----------------|
| Liste liens | `GET /api/liens-paiement?statut=actif` | `db.allDocs({ startkey: 'lien-paiement:' })` |
| Création | `POST /api/liens-paiement` | `db.put({ _id: 'lien-paiement:' + uuid })` |
| Modification | `PUT /api/liens-paiement/:id` | `db.get(id)` puis `db.put(doc)` |
| Suppression | `DELETE /api/liens-paiement/:id` | `db.get(id)` puis suppression logique (`actif: false`) |
| Latence | ~200-500ms | ~10-50ms (local) |
| Offline | ❌ Impossible | ✅ CRUD complet offline |
| Sync temps réel | Polling | `db.changes({ live: true })` |
