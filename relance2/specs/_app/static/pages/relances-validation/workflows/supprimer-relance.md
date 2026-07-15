# Workflow : Supprimer une relance

## Écran
`relances-validation.html`

## Élément déclencheur
Bouton avec `@click="supprimerRelance()"`

## Action
Supprimer une relance

## Description
- Demande confirmation
- Supprime définitivement
- Retire de la liste

## Data Model
**Page Function:** `relancesValidationPage()`

**Stores Alpine.js:**
- $store.ui

**Données:**
- `relancesAValider`
- `selectedRelances`
- `selectAll`

**États UI:**
- `loading`
- `error`
- `previewMode`
- `previewRelance`
- `processing`

## State Changes

**Modifications:** États UI spécifiques selon implémentation

## API Calls

**Endpoint:** `DELETE /api/relances/:id` - Supprime la relance définitivement

**Response:** `ApiResponse<{ deleted: true }>`
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
- **Point d'entrée** : Initialise la page Alpine.js

### Fichier workflow
- **JS** : `frontend/app/relances-validation/js/supprimer-relance.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/relances-validation/js/supprimer-relance.js
export function supprimerRelance() {
  // Implementation du workflow
}
```

## Implementation

```javascript
async supprimerRelance(id) {
  // 1. Confirm action
  if (!confirm('Supprimer cette relance ?')) return;
  
  // 2. Set loading
  this.loading = true;
  
  try {
    // 3. Call API
    const response = await fetch(`/api/relances/${id}`, {
      method: 'DELETE'
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error?.message || 'Erreur lors de la suppression');
    }
    
    // 4. Remove from local array
    this.relancesAValider = this.relancesAValider.filter(item => item.id !== id);
    
    // 5. Notify
    Alpine.store('ui').addToast('Relance supprimée', 'success');
    
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
| `start` | `console.log('[WORKFLOW.relances-validation-supprimer-relance] START: Suppression relance', { id })` |
| `validation` | `console.log('[WORKFLOW.relances-validation-supprimer-relance] STEP: Confirmation utilisateur OK, loading = true')` |
| `api-call` | `console.log('[WORKFLOW.relances-validation-supprimer-relance] API: DELETE /api/relances/' + id)` |
| `state-updated` | `console.log('[WORKFLOW.relances-validation-supprimer-relance] STATE: relancesAValider mis à jour, item retiré')` |
| `end` | `console.log('[WORKFLOW.relances-validation-supprimer-relance] SUCCESS: Relance supprimée en', duree, 'ms')` |
| `error` | `console.error('[WORKFLOW.relances-validation-supprimer-relance] ERROR:', error)` |
