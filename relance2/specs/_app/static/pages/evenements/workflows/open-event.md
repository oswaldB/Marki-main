# Workflow : Ouvrir événement

## Écran
`evenements.html`

## Élément déclencheur
Ligne avec `@click="openEvent(event)"`

## Action
Ouvrir le détail de l'événement

## Description
- Affiche le modal détail
- Montre toutes les informations

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
            └── open-event.js
```

### Fichier principal
- **HTML** : `frontend/app/evenements/index.html`
- **Point d'entrée** : Initialise la page Alpine.js

### Fichier workflow
- **JS** : `frontend/app/evenements/js/open-event.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/evenements/js/open-event.js
export function openEvent() {
  // Implementation du workflow
}
```

## Implementation

```javascript
openModal(item) {
  // 1. Set selected item
  this.selectedItem = item;
  
  // 2. Show modal
  this.showModal = true;
  
  // 3. Load additional data if needed
  if (item?.id) {
    this.loadDetail(item.id);
  }
}
``

## Logs (console.log) - OBLIGATOIRE

Chaque étape du workflow doit être loguée avec `console.log()`:

| Checkpoint | Instruction console.log |
|------------|------------------------|
| `start` | `console.log('[WORKFLOW.evenements-open-event] START: Ouverture du modal détail événement')` |
| `event-loaded` | `console.log('[WORKFLOW.evenements-open-event] STEP: Événement sélectionné:', event)` |
| `modal-shown` | `console.log('[WORKFLOW.evenements-open-event] STEP: showDetailModal = true')` |
| `data-loaded` | `console.log('[WORKFLOW.evenements-open-event] DATA: Détails supplémentaires chargés pour id:', event.id)` |
| `state-applied` | `console.log('[WORKFLOW.evenements-open-event] DATA: État après ouverture:', {selectedEvent, showDetailModal})` |
| `end` | `console.log('[WORKFLOW.evenements-open-event] SUCCESS: Modal ouvert en', duree, 'ms')` |
| `error` | `console.error('[WORKFLOW.evenements-open-event] ERROR:', error)` |
