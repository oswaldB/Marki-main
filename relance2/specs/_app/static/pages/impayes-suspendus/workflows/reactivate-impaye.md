# Workflow : Réactiver un impayé suspendu

## Écran
`impayes-suspendus.html`

## Élément déclencheur
Bouton avec `@click="reactiverImpaye(impaye)"`

## Action
Réactiver une facture précédemment suspendue

## Description
- Enlève le statut suspendu
- Retourne la facture au cycle de relance
- Rafraîchit la liste des suspendus


## Data Model
**Page Function:** `impayesSuspendusPage()`

**Stores Alpine.js:**
- $store.ui

**Données:**
- `facturesSuspendues`
- `searchQuery`
- `filterMotif`
- `selectedFacture`
- `reactivateData`

**États UI:**
- `loading`
- `error`
- `showReactivateModal`

## State Changes

**Modifications:** États UI spécifiques selon implémentation

## API Calls

**`POST /api/impayes/{id}/unsuspend`** - Réactive la facture côté backend

**Payload:** Aucun (l'ID est dans l'URL)

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "FAC-2024-001",
    "statut": "impayee",
    "is_suspended": false,
    "dateReactivation": "2024-01-15T10:30:00Z"
  }
}
```


## Organisation des fichiers

```
frontend/
└── app/
    └── impayes-suspendus/
        ├── index.html
        ├── components/
        │   └── (composants partagés)
        └── js/
            └── reactivate-impaye.js
```

### Fichier principal
- **HTML** : `frontend/app/impayes-suspendus/index.html`
- **Point d'entrée** : Initialise la page Alpine.js

### Fichier workflow
- **JS** : `frontend/app/impayes-suspendus/js/reactivate-impaye.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/impayes-suspendus/js/reactivate-impaye.js
export function reactivateImpaye() {
  // Implementation du workflow
}
```

## Implementation

```javascript
async reactivateFacture(id) {
  // 1. Set loading
  this.loading = true;
  
  try {
    // 2. Call API
    const response = await fetch(`/api/impayes/${id}/unsuspend`, {
      method: 'POST'
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error?.message);
    }
    
    // 3. Remove from suspended list
    this.facturesSuspendues = this.facturesSuspendues.filter(item => item.id !== id);
    
    // 4. Close modal
    this.showReactivateModal = false;
    
    // 5. Notify
    Alpine.store('ui').addToast('Facture réactivée', 'success');
    
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
| `start` | `console.log('[WORKFLOW.impayes-suspendus-reactivate-impaye] START: Réactivation de l\'impayé', id)` |
| `validation` | `console.log('[WORKFLOW.impayes-suspendus-reactivate-impaye] STEP: Validation ID impayé OK', {id})` |
| `api-call` | `console.log('[WORKFLOW.impayes-suspendus-reactivate-impaye] API: POST /api/impayes/' + id + '/unsuspend')` |
| `state-updated` | `console.log('[WORKFLOW.impayes-suspendus-reactivate-impaye] STATE: facturesSuspendues mis à jour, suppression de l\'item', id)` |
| `modal-closed` | `console.log('[WORKFLOW.impayes-suspendus-reactivate-impaye] STEP: showReactivateModal = false')` |
| `table-rerendered` | `console.log('[WORKFLOW.impayes-suspendus-reactivate-impaye] RENDER: Table suspendus re-rendue, count =', this.facturesSuspendues.length)` |
| `end` | `console.log('[WORKFLOW.impayes-suspendus-reactivate-impaye] SUCCESS: Impayé réactivé en', duree, 'ms')` |
| `error` | `console.error('[WORKFLOW.impayes-suspendus-reactivate-impaye] ERROR:', error)` |
