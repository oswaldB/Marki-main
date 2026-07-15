# Workflow : Basculer validation obligatoire

## Écran
`sequences-relance-detail.html`

## Élément déclencheur
Toggle avec `@click="sequence.validationObligatoire = !sequence.validationObligatoire"`

## Action
Activer/désactiver la validation obligatoire

## Description
- Si activé : les relances nécessitent validation
- Si désactivé : les relances partent automatiquement

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
            └── toggle-validation.js
```

### Fichier principal
- **HTML** : `frontend/app/sequences-relance-detail/index.html`
- **Point d'entrée** : Initialise la page Alpine.js

### Fichier workflow
- **JS** : `frontend/app/sequences-relance-detail/js/toggle-validation.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/sequences-relance-detail/js/toggle-validation.js
export function toggleValidation() {
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
```

## Logs (console.log) - OBLIGATOIRE

Chaque étape du workflow doit être loguée avec `console.log()`:

| Checkpoint | Instruction console.log |
|------------|------------------------|
| `start` | `console.log('[WORKFLOW.sequences-relance-detail-toggle-validation] START: Bascule de la validation obligatoire pour la séquence', sequence.id)` |
| `state-toggled` | `console.log('[WORKFLOW.sequences-relance-detail-toggle-validation] STEP: sequence.validationObligatoire basculé de', oldValue, 'vers', newValue)` |
| `api-call` | `console.log('[WORKFLOW.sequences-relance-detail-toggle-validation] API: PATCH /api/sequences/{id}/validation-obligatoire { enabled: ', newValue, '}')` |
| `state-updated` | `console.log('[WORKFLOW.sequences-relance-detail-toggle-validation] STEP: Statut validation obligatoire mis à jour dans le store')` |
| `end` | `console.log('[WORKFLOW.sequences-relance-detail-toggle-validation] SUCCESS: Validation obligatoire', newValue ? 'activée' : 'désactivée', 'en', duree, 'ms')` |
| `error` | `console.error('[WORKFLOW.sequences-relance-detail-toggle-validation] ERROR:', error)` |