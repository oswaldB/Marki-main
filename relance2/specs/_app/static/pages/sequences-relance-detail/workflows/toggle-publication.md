# Workflow : Publier/Dépublier séquence

## Écran
`sequences-relance-detail.html`

## Élément déclencheur
Bouton avec `@click="togglePublication()"`

## Action
Basculer le statut de publication de la séquence

## Description
- Publie ou dépublie la séquence
- Une séquence publiée est active
- Une séquence dépubliée est en brouillon

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
            └── toggle-publication.js
```

### Fichier principal
- **HTML** : `frontend/app/sequences-relance-detail/index.html`
- **Point d'entrée** : Initialise la page Alpine.js

### Fichier workflow
- **JS** : `frontend/app/sequences-relance-detail/js/toggle-publication.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/sequences-relance-detail/js/toggle-publication.js
export function togglePublication() {
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
| `start` | `console.log('[WORKFLOW.sequences-relance-detail-toggle-publication] START: Bascule du statut de publication de la séquence')` |
| `state-toggled` | `console.log('[WORKFLOW.sequences-relance-detail-toggle-publication] STEP: sequence.published basculé de', previousValue, 'à', this.sequence.published)` |
| `api-call` | `console.log('[WORKFLOW.sequences-relance-detail-toggle-publication] API: PATCH /api/sequences/:id avec payload', {published: this.sequence.published})` |
| `state-updated` | `console.log('[WORKFLOW.sequences-relance-detail-toggle-publication] STEP: Statut publication mis à jour dans le state local')` |
| `end` | `console.log('[WORKFLOW.sequences-relance-detail-toggle-publication] SUCCESS: Séquence', this.sequence.published ? 'publiée' : 'dépubliée', 'en', duree, 'ms')` |
| `error` | `console.error('[WORKFLOW.sequences-relance-detail-toggle-publication] ERROR:', error)` |