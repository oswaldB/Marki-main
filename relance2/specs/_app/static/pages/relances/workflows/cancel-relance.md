# Workflow : Annuler une relance

## Écran
`relances.html`

## Élément déclencheur
Bouton avec `@click="cancelRelance(relance)"`

## Action
Annuler une relance programmée

## Description
- Demande confirmation
- Supprime la relance de la file
- Met à jour l'affichage

## Data Model
**Page Function:** `relancesPage()`

**Stores Alpine.js:**
- $store.ui

**Données:**
- `payeurs`
- `stats`
- `sequences`
- `searchQuery`
- `filterStatut`
- `editorContent`
- `editorMode`

**États UI:**
- `loading`
- `error`
- `expandedPayeur`
- `showNewRelanceModal`
- `showEditRelanceModal`
- `showSequenceModal`

## State Changes

**Modifications:** États UI spécifiques selon implémentation

## API Calls

**`DELETE /api/relances/:id`** - Supprime la relance de la base

**Response:** `ApiResponse<{ deleted: true }>`

> La suppression est définitive (pas de soft-delete).
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
- **Point d'entrée** : Initialise la page Alpine.js

### Fichier workflow
- **JS** : `frontend/app/relances/js/cancel-relance.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/relances/js/cancel-relance.js
export function cancelRelance() {
  // Implementation du workflow
}
```

## Implementation

```javascript
async cancelRelance(id) {
  // 1. Confirm action
  if (!confirm('Annuler cette relance ?')) return;
  
  // 2. Set loading
  this.loading = true;
  
  try {
    // 3. Call API
    const response = await fetch(`/api/relances/${id}`, {
      method: 'DELETE'
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error?.message || 'Erreur lors de l\'annulation');
    }
    
    // 4. Remove from local list
    this.relances = this.relances.filter(item => item.id !== id);
    
    // 5. Notify
    Alpine.store('ui').addToast('Relance annulée', 'info');
    
  } catch (error) {
    Alpine.store('ui').addToast(error.message, 'error');
  } finally {
    this.loading = false;
  }
}
```

## Logs (console.log) - OBLIGATOIRE

Chaque étape du workflow doit être loguée avec `console.log()`:

| Checkpoint | Instruction console.log |
|------------|------------------------|
| `start` | `console.log('[WORKFLOW.relances-cancel-relance] START: Annulation de la relance', { id })` |
| `api-call` | `console.log('[WORKFLOW.relances-cancel-relance] API_CALL: DELETE /api/relances/:id', { id })` |
| `state-updated` | `console.log('[WORKFLOW.relances-cancel-relance] STATE_UPDATED: Relance retirée de la liste locale')` |
| `end` | `console.log('[WORKFLOW.relances-cancel-relance] SUCCESS: Relance annulée en', duree, 'ms')` |
| `error` | `console.error('[WORKFLOW.relances-cancel-relance] ERROR:', error)` |
