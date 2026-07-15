# Workflow : Fermer modal événement

## Écran
`evenements.html`

## Élément déclencheur
Bouton avec `@click="showDetailModal = false"`

## Action
Fermer sans marquer comme lu

## Description
- Ferme le modal
- Garde le statut actuel

## Data Model
**Page Function:** `evenementsPage()`

**Stores Alpine.js:**
- $store.ui

**Données:**
- `evenements`
- `searchQuery`
- `filterType`
- `filterDateStart`
- `filterDateEnd`
- `filterUser`
- `page`
- `perPage`

**États UI:**
- `loading`
- `loadingMore`
- `error`
- `selectedEvent`
- `showDetailModal`

## State Changes

**Modifications:**
- `selectedEvent` modifié

## API Calls

**Pas d'appel API** - Action côté client uniquement



## Organisation des fichiers

```
frontend/
└── app/
    └── evenements/
        ├── index.html
        ├── components/
        │   └── (composants partagés)
        └── js/
            └── close-modal.js
```

### Fichier principal
- **HTML** : `frontend/app/evenements/index.html`
- **Point d'entrée** : Initialise la page Alpine.js

### Fichier workflow
- **JS** : `frontend/app/evenements/js/close-modal.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/evenements/js/close-modal.js
export function closeModal() {
  // Implementation du workflow
}
```

## Implementation

```javascript
closeModal() {
  // 1. Hide modal
  this.showDetailModal = false;
  
  // 2. Reset selected
  this.selectedEvent = null;
  
  // 3. Clear validation errors
  this.error = null;
}
```

## Logs (console.log) - OBLIGATOIRE

Chaque étape du workflow doit être loguée avec `console.log()`:

| Checkpoint | Instruction console.log |
|------------|------------------------|
| `start` | `console.log('[WORKFLOW.evenements-close-modal] START: Fermeture du modal détail événement')` |
| `modal-hidden` | `console.log('[WORKFLOW.evenements-close-modal] STEP: showDetailModal = false')` |
| `state-changed` | `console.log('[WORKFLOW.evenements-close-modal] DATA: État après fermeture:', {showDetailModal, selectedEvent, error})` |
| `error-cleared` | `console.log('[WORKFLOW.evenements-close-modal] STEP: selectedEvent réinitialisé à null, error effacé')` |
| `end` | `console.log('[WORKFLOW.evenements-close-modal] SUCCESS: Modal fermé en', duree, 'ms')` |
| `error` | `console.error('[WORKFLOW.evenements-close-modal] ERROR:', error)` |