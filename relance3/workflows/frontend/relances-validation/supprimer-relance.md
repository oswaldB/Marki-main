# Workflow : Supprimer une relance (PouchDB)

## Écran
`relances-validation.html`

## Élément déclencheur
Bouton avec `@click="supprimerRelance()"`

## Action
Supprimer une relance de PouchDB

## Description
- Demande confirmation
- Supprime définitivement de PouchDB
- Retire de la liste
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
- Relance supprimée de PouchDB
- `relancesAValider` ← filtrée (relance retirée)

## PouchDB Operations

**Action:** Supprimer le document relance de PouchDB.

**Méthodes utilisées:**
1. `db.get('relance:' + id)` - Récupérer le document avec sa révision
2. `db.remove(doc)` - Supprimer le document

**Sync:** La suppression est automatiquement synchronisée avec CouchDB.

## Organisation des fichiers

```
frontend/
└── app/
    └── relances-validation/
        ├── index.html
        ├── components/
        │   └── (composants partagés)
        └── js/
            └── supprimer-relance.js
```

### Fichier principal
- **HTML** : `frontend/app/relances-validation/index.html`
- **Point d'entrée** : Initialise la page Alpine.js avec PouchDB

### Fichier workflow
- **JS** : `frontend/app/relances-validation/js/supprimer-relance.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/relances-validation/js/supprimer-relance.js
export async function supprimerRelance() {
  // Implementation avec PouchDB
}
```

## Implementation (PouchDB)

```javascript
async supprimerRelance(id) {
  // 1. Confirm action
  if (!confirm('Supprimer cette relance ?')) return;
  
  // 2. Set loading
  this.loading = true;
  
  try {
    // 3. Récupérer le document depuis PouchDB avec sa révision
    const doc = await db.get('relance:' + id);
    
    // 4. Supprimer de PouchDB
    await db.remove(doc);
    // response: { ok: true, id: 'relance:...', rev: '2-xxx...' }
    
    // 5. Remove from local array
    this.relancesAValider = this.relancesAValider.filter(
      item => item._id !== 'relance:' + id
    );
    
    // 6. Notify
    this.toast('Relance supprimée', 'success');
    
  } catch (error) {
    if (error.status === 409) {
      this.error = 'Conflit de version, veuillez réessayer';
      this.toast('Conflit de version', 'error');
    } else if (error.status === 404) {
      // Déjà supprimé
      this.relancesAValider = this.relancesAValider.filter(
        item => item._id !== 'relance:' + id
      );
      this.toast('Relance déjà supprimée', 'info');
    } else {
      this.error = error.message;
      this.toast(error.message, 'error');
    }
  } finally {
    this.loading = false;
  }
}
```

---

## Migration depuis l'ancienne API

| Aspect | Avant (API) | Après (PouchDB) |
|--------|-------------|-----------------|
| Requête | `DELETE /api/relances/:id` | `db.get()` puis `db.remove()` |
| Réponse | `ApiResponse<{ deleted: true }>` | `{ ok, id, rev }` |
| Gestion conflits | Backend | Détection `_rev` côté client |
| Latence | ~100-300ms | ~10-50ms (local) |
| Offline | ❌ Impossible | ✅ Fonctionne offline, sync reportée |
