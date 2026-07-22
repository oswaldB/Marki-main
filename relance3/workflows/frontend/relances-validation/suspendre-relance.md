# Workflow : Suspendre via validation (PouchDB)

## Écran
`relances-validation.html`

## Élément déclencheur
Bouton avec `@click="suspendreRelance()"`

## Action
Suspendre la relance via PouchDB

## Description
- Met la relance en attente dans PouchDB
- Garde en file pour plus tard
- Ne supprime pas
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
- Relance mise à jour dans PouchDB (statut = 'suspendue')
- `relancesAValider` ← filtrée (relance retirée)

## PouchDB Operations

**Action:** Mettre à jour la relance dans PouchDB pour la suspendre.

**Méthodes utilisées:**
1. `db.get('relance:' + id)` - Récupérer le document avec sa révision
2. Mettre à jour `statut: 'suspendue'` et `is_suspended: true`
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
            └── suspendre-relance.js
```

### Fichier principal
- **HTML** : `frontend/app/relances-validation/index.html`
- **Point d'entrée** : Initialise la page Alpine.js avec PouchDB

### Fichier workflow
- **JS** : `frontend/app/relances-validation/js/suspendre-relance.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/relances-validation/js/suspendre-relance.js
export async function suspendreRelance() {
  // Implementation avec PouchDB
}
```

## Implementation (PouchDB)

```javascript
async suspendreRelance(id) {
  // 1. Set loading
  this.loading = true;
  
  try {
    // 2. Récupérer le document depuis PouchDB avec sa révision
    const doc = await db.get('relance:' + id);
    
    // 3. Mettre à jour le statut
    doc.statut = 'suspendue';
    doc.is_suspended = true;
    doc.suspended_at = new Date().toISOString();
    doc.updated_at = new Date().toISOString();
    
    // 4. Sauvegarder dans PouchDB
    const response = await db.put(doc);
    // response: { ok: true, id: 'relance:...', rev: '2-xxx...' }
    
    // 5. Update local
    const index = this.relancesAValider.findIndex(
      item => item._id === 'relance:' + id
    );
    if (index !== -1) {
      this.relancesAValider.splice(index, 1);
    }
    
    // 6. Notify
    this.toast('Relance suspendue', 'success');
    
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
```

---

## Migration depuis l'ancienne API

| Aspect | Avant (API) | Après (PouchDB) |
|--------|-------------|-----------------|
| Requête | `POST /api/relances/:id/suspend` | `db.get()` puis `db.put()` |
| Payload | Aucun | Modification directe du doc |
| Réponse | `{ success, data: { id, statut, is_suspended } }` | `{ ok, id, rev }` |
| Gestion conflits | Backend | Détection `_rev` côté client |
| Latence | ~100-300ms | ~10-50ms (local) |
| Offline | ❌ Impossible | ✅ Fonctionne offline, sync reportée |
