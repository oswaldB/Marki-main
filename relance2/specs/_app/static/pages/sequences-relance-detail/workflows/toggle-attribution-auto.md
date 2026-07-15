# Workflow : Activer attribution automatique

## Écran
`sequences-relance-detail.html`

## Élément déclencheur
Toggle avec `@click="sequence.attributionAuto = !sequence.attributionAuto"`

## Action
Basculer l'attribution automatique

## Description
- Si activé : assigne automatiquement les impayés
- Basé sur les règles configurées

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
            └── toggle-attribution-auto.js
```

### Fichier principal
- **HTML** : `frontend/app/sequences-relance-detail/index.html`
- **Point d'entrée** : Initialise la page Alpine.js

### Fichier workflow
- **JS** : `frontend/app/sequences-relance-detail/js/toggle-attribution-auto.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/sequences-relance-detail/js/toggle-attribution-auto.js
export function toggleAttributionAuto() {
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
| `start` | `console.log('[WORKFLOW.sequences-relance-detail-toggle-attribution-auto] START: Bascule de l\'attribution automatique pour la séquence', sequence.id)` |
| `state-toggled` | `console.log('[WORKFLOW.sequences-relance-detail-toggle-attribution-auto] STEP: sequence.attributionAuto basculé de', oldValue, 'vers', newValue)` |
| `api-call` | `console.log('[WORKFLOW.sequences-relance-detail-toggle-attribution-auto] API: PATCH /api/sequences/{id}/attribution-auto { enabled: ', newValue, '}')` |
| `state-updated` | `console.log('[WORKFLOW.sequences-relance-detail-toggle-attribution-auto] STEP: Statut règles d\'assignation automatique mis à jour dans le store')` |
| `end` | `console.log('[WORKFLOW.sequences-relance-detail-toggle-attribution-auto] SUCCESS: Attribution automatique', newValue ? 'activée' : 'désactivée', 'en', duree, 'ms')` |
| `error` | `console.error('[WORKFLOW.sequences-relance-detail-toggle-attribution-auto] ERROR:', error)` |