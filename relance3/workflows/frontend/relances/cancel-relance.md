# Workflow : Annuler une relance (PouchDB)

## Écran
`relances.html`

## Élément déclencheur
Bouton avec `@click="cancelRelance(relance)"`

## Action
Annuler une relance programmée via PouchDB

## Description
- Demande confirmation
- Supprime la relance de PouchDB
- Met à jour l'affichage
- La suppression est synchronisée avec CouchDB

## Data Model
**Page Function:** `relancesPage()`

**Stores Alpine.js:**
- $store.ui

**Données (depuis PouchDB):**
- `relances` - liste des relances depuis PouchDB
- `payeurs`
- `stats`
- `sequences`
- `searchQuery`
- `filterStatut`
- `editorContent`
- `editorMode`
- `db` - instance PouchDB

**États UI:**
- `loading`
- `error`
- `expandedPayeur`
- `showNewRelanceModal`
- `showEditRelanceModal`
- `showSequenceModal`

## State Changes

**Modifications:**
- `relances` ← filtrée (relance supprimée)
- États UI spécifiques selon implémentation

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
    └── relances/
        ├── index.html
        ├── components/
        │   └── (composants partagés)
        └── js/
            └── cancel-relance.js
```

### Fichier principal
- **HTML** : `frontend/app/relances/index.html`
- **Point d'entrée** : Initialise la page Alpine.js avec PouchDB

### Fichier workflow
- **JS** : `frontend/app/relances/js/cancel-relance.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/relances/js/cancel-relance.js
export async function cancelRelance() {
  // Implementation avec PouchDB
}
```

## Implementation (PouchDB)

```javascript
async cancelRelance(id) {
  // 1. Confirm action
  if (!confirm('Annuler cette relance ?')) return;
  
  // 2. Set loading
  this.loading = true;
  
  try {
    // 3. Récupérer le document depuis PouchDB avec sa révision
    const doc = await db.get('relance:' + id);
    
    // 4. Supprimer le document de PouchDB
    await db.remove(doc);
    // response: { ok: true, id: 'relance:...', rev: '2-xxx...' }
    
    // 5. Remove from local list (le changes listener mettra aussi à jour)
    this.relances = this.relances.filter(item => item.id !== id);
    
    // 6. Notify
    this.toast('Relance annulée', 'info');
    
  } catch (error) {
    if (error.status === 409) {
      // Conflit: recharger et réessayer
      this.error = 'Conflit de version, veuillez réessayer';
      this.toast('Conflit de version, veuillez réessayer', 'error');
    } else if (error.status === 404) {
      // Déjà supprimé
      this.relances = this.relances.filter(item => item.id !== id);
      this.toast('Relance déjà annulée', 'info');
    } else {
      this.error = error.message;
      this.toast(error.message, 'error');
    }
  } finally {
    this.loading = false;
  }
}

// Gestion des conflits avec retry
async cancelRelanceWithRetry(id, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const doc = await db.get('relance:' + id);
      await db.remove(doc);
      
      this.relances = this.relances.filter(item => item.id !== id);
      this.toast('Relance annulée', 'info');
      return;
      
    } catch (error) {
      if (error.status === 409 && attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 100 * attempt));
        continue;
      }
      throw error;
    }
  }
}
```

---

## Migration depuis l'ancienne API

| Aspect | Avant (API) | Après (PouchDB) |
|--------|-------------|-----------------|
| Requête | `DELETE /api/relances/:id` | `db.get()` puis `db.remove()` |
| Suppression | Backend SQLite | PouchDB local + sync |
| Réponse | `{ success, data: { deleted: true } }` | `{ ok, id, rev }` |
| Gestion conflits | Backend | Détection `_rev` côté client |
| Latence | ~100-300ms | ~10-50ms (local) |
| Offline | ❌ Impossible | ✅ Suppression locale, sync reportée |
