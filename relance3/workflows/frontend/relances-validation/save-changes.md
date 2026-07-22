# Workflow : Sauvegarder les modifications (PouchDB)

## Écran
`relances-validation.html`

## Élément déclencheur
Bouton avec `@click="saveChanges()"`

## Action
Enregistrer les modifications d'une relance dans PouchDB

## Description
- Sauvegarde les changements dans PouchDB
- Sans valider l'envoi
- Garde pour validation ultérieure
- Synchronise avec CouchDB

## Data Model
**Page Function:** `relancesValidationPage()`

**Stores Alpine.js:**
- $store.ui

**Données (depuis PouchDB):**
- `relancesAValider` - relances depuis PouchDB
- `selectedRelances`
- `selectAll`
- `db` - instance PouchDB

**États UI:**
- `loading`
- `error`
- `previewMode`
- `previewRelance`
- `processing`

## State Changes

**Modifications:**
- `saving` ← `true` → `false`
- `error` ← message si échec
- Relance mise à jour dans PouchDB

## PouchDB Operations

**Action:** Mettre à jour la relance dans PouchDB.

**Méthodes utilisées:**
1. `db.get('relance:' + id)` - Récupérer le document avec sa révision
2. Mettre à jour les champs modifiés
3. `db.put(doc)` - Sauvegarder le document modifié

**Sync:** La modification est automatiquement synchronisée avec CouchDB.

## Organisation des fichiers

```
frontend/
└── app/
    └── relances-validation/
        ├── index.html
        ├── components/
        │   └── (composants partagés)
        └── js/
            └── save-changes.js
```

### Fichier principal
- **HTML** : `frontend/app/relances-validation/index.html`
- **Point d'entrée** : Initialise la page Alpine.js avec PouchDB

### Fichier workflow
- **JS** : `frontend/app/relances-validation/js/save-changes.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/relances-validation/js/save-changes.js
export async function saveChanges() {
  // Implementation avec PouchDB
}
```

## Implementation (PouchDB)

```javascript
async saveChanges() {
  // 1. Validate
  if (!this.validateForm()) return;
  
  // 2. Set saving state
  this.loading = true;
  this.error = null;
  
  try {
    // 3. Récupérer le document depuis PouchDB avec sa révision
    const doc = await db.get('relance:' + this.editingItem.id);
    
    // 4. Mettre à jour les champs
    doc.objet = this.editingItem.objet;
    doc.corps = this.editingItem.corps;
    doc.updated_at = new Date().toISOString();
    
    // 5. Sauvegarder dans PouchDB
    const response = await db.put(doc);
    // response: { ok: true, id: 'relance:...', rev: '2-xxx...' }
    
    // 6. Update local array
    const index = this.relancesAValider.findIndex(
      item => item._id === 'relance:' + this.editingItem.id
    );
    if (index !== -1) {
      this.relancesAValider[index] = { ...doc, _rev: response.rev };
    }
    
    // 7. Close modal
    this.selectedRelances = false;
    this.editingItem = null;
    
    // 8. Notify
    this.toast('Modifications sauvegardées', 'success');
    
  } catch (error) {
    if (error.status === 409) {
      this.error = 'Conflit de version, veuillez réessayer';
      this.toast('Conflit de version', 'error');
    } else {
      this.error = error.message;
      this.toast(error.message, 'error');
    }
  } finally {
    this.loading = false;
  }
}

validateForm() {
  if (!this.editingItem.objet?.trim()) {
    this.error = 'L\'objet est obligatoire';
    return false;
  }
  if (!this.editingItem.corps?.trim()) {
    this.error = 'Le corps est obligatoire';
    return false;
  }
  return true;
}
```

---

## Migration depuis l'ancienne API

| Aspect | Avant (API) | Après (PouchDB) |
|--------|-------------|-----------------|
| Requête | `PUT /api/relances/:id` | `db.get()` puis `db.put()` |
| Payload | `{ objet, corps, updated_at }` | Modification directe du doc |
| Réponse | `ApiResponse<Relance>` | `{ ok, id, rev }` |
| Gestion conflits | Backend | Détection `_rev` côté client |
| Latence | ~100-300ms | ~10-50ms (local) |
| Offline | ❌ Impossible | ✅ Fonctionne offline, sync reportée |
