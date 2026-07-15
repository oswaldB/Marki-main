# Workflow : Activer/Désactiver scénario

## Écran
`sequences-relance-detail.html`

## Élément déclencheur
Toggle avec `@click="toggleScenarioActive(idx)"`

## Action
Basculer l'activation d'un scénario

## Description
- Active ou désactive le scénario sélectionné
- Un scénario désactivé est ignoré

## Data Model
**Page Function:** `sequencesRelanceDetailPage()`

**Stores Alpine.js:**
- $store.ui

**Données:**
- `sequence`
- `etapes`
- `modeles`
- `activeTab`
- `draggingEtape`
- `editingEtape`
- `editorInstance`

**États UI:**
- `loading`
- `error`
- `saving`
- `hasChanges`
- `showEtapeModal`
- `showModeleModal`
- `showDeleteEtapeModal`

## State Changes

**Modifications:**
- `showEtapeModal` modifié
- `showModeleModal` modifié
- `showDeleteEtapeModal` modifié

## API Calls

**Pas d'appel API** - Action côté client uniquement



## Organisation des fichiers

```
frontend/
└── app/
    └── sequences-relance-detail/
        ├── index.html
        ├── components/
        │   └── (composants partagés)
        └── js/
            └── toggle-scenario-active.js
```

### Fichier principal
- **HTML** : `frontend/app/sequences-relance-detail/index.html`
- **Point d'entrée** : Initialise la page Alpine.js

### Fichier workflow
- **JS** : `frontend/app/sequences-relance-detail/js/toggle-scenario-active.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/sequences-relance-detail/js/toggle-scenario-active.js
export function toggleScenarioActive() {
  // Implementation du workflow
}
```

## Implementation

```javascript
toggleItem() {
  // 1. Toggle boolean state
  this.showModal = !this.showModal;
  // OR
  this.isExpanded = !this.isExpanded;
  
  // 2. If opening, prepare data
  if (this.showModal) {
    this.prepareModalData();
  }
}
``
## Logs (console.log) - OBLIGATOIRE

Chaque étape du workflow doit être loguée avec `console.log()`:

| Checkpoint | Instruction console.log |
|------------|------------------------|
| `start` | `console.log('[WORKFLOW.sequences-relance-detail-toggle-scenario-active] START: Bascule activation/désactivation du scénario idx=' + idx)` |
| `state-toggled` | `console.log('[WORKFLOW.sequences-relance-detail-toggle-scenario-active] STEP: scenario.actif basculé de', previousValue, 'à', newValue)` |
| `api-call` | `console.log('[WORKFLOW.sequences-relance-detail-toggle-scenario-active] API: Pas d\'appel API (action client uniquement)')` |
| `state-updated` | `console.log('[WORKFLOW.sequences-relance-detail-toggle-scenario-active] STEP: Tableau scénarios mis à jour dans la vue réactive')` |
| `end` | `console.log('[WORKFLOW.sequences-relance-detail-toggle-scenario-active] SUCCESS: Scénario', idx, 'est maintenant', scenario.actif ? 'actif' : 'inactif')` |
| `error` | `console.error('[WORKFLOW.sequences-relance-detail-toggle-scenario-active] ERROR:', error)` |
