# Workflow : Validation obligatoire suivi

## Écran
`sequences-suivi-detail.html`

## Élément déclencheur
Toggle avec `@click="sequence.validationObligatoire = !sequence.validationObligatoire"`

## Action
Activer/désactiver la validation obligatoire

## Description
- Si activé : validation requise avant envoi
- Si désactivé : envoi automatique

## Data Model
**Page Function:** `sequencesSuiviDetailPage()`

**Stores Alpine.js:**
- $store.ui

**Données:**
- `sequence`
- `etapes`
- `typeRelanceOptions`
- `selectedType`

**États UI:**
- `loading`
- `error`
- `saving`

## State Changes

**Modifications:** États UI spécifiques selon implémentation

## API Calls

**Pas d'appel API** - Action côté client uniquement



## Organisation des fichiers

```
frontend/
└── app/
    └── sequences-suivi-detail/
        ├── index.html
        ├── components/
        │   └── (composants partagés)
        └── js/
            └── toggle-validation.js
```

### Fichier principal
- **HTML** : `frontend/app/sequences-suivi-detail/index.html`
- **Point d'entrée** : Initialise la page Alpine.js

### Fichier workflow
- **JS** : `frontend/app/sequences-suivi-detail/js/toggle-validation.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/sequences-suivi-detail/js/toggle-validation.js
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
| `start` | `console.log('[WORKFLOW.sequences-suivi-detail-toggle-validation] START: Toggle validation obligatoire', {sequenceId, currentValue})` |
| `state-toggled` | `console.log('[WORKFLOW.sequences-suivi-detail-toggle-validation] STEP: sequence.validationObligatoire basculé à', newValue)` |
| `api-call` | `console.log('[WORKFLOW.sequences-suivi-detail-toggle-validation] API: PATCH /api/sequences/{id}/validation', {validationObligatoire: newValue})` |
| `state-updated` | `console.log('[WORKFLOW.sequences-suivi-detail-toggle-validation] DATA: État après toggle:', {validationObligatoire, saving, error})` |
| `end` | `console.log('[WORKFLOW.sequences-suivi-detail-toggle-validation] SUCCESS: Validation obligatoire mise à jour en', duree, 'ms')` |
| `error` | `console.error('[WORKFLOW.sequences-suivi-detail-toggle-validation] ERROR:', error)` |