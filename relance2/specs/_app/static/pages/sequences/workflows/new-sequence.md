# Workflow : Nouvelle séquence

## Écran
`sequences.html`

## Élément déclencheur
Bouton avec `@click="showNewSequenceModal = true"`

## Action
Ouvrir le modal de création de séquence

## Description
- Affiche le formulaire de nouvelle séquence
- Demande le type (relance ou suivi)
- Permet de nommer la séquence

## Data Model
**Page Function:** `sequencesPage()`

**Stores Alpine.js:**
- $store.ui

**Données:**
- `sequences`
- `searchQuery`
- `filterType`
- `newSequence`

**États UI:**
- `loading`
- `error`
- `showNewSequenceModal`
- `showEditSequenceModal`
- `showDeleteModal`
- `editingSequence`
- `deletingSequence`

## State Changes

**Modifications:** États UI spécifiques selon implémentation

## API Calls

**Pas d'appel API pour l'ouverture** - Le modal est purement côté client.

> **Note** : Le bouton "Créer" déclenche un workflow séparé `create-sequence.md` qui fait un appel API `POST /api/sequences`.
## Organisation des fichiers

```
frontend/
└── app/
    └── sequences/
        ├── index.html
        ├── components/
        │   └── (composants partagés)
        └── js/
            └── new-sequence.js
```

### Fichier principal
- **HTML** : `frontend/app/sequences/index.html`
- **Point d'entrée** : Initialise la page Alpine.js

### Fichier workflow
- **JS** : `frontend/app/sequences/js/new-sequence.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/sequences/js/new-sequence.js
export function newSequence() {
  // Implementation du workflow
}
```

## Implementation

```javascript
newSequence() {
  // 1. Reset form
  this.newSequence = this.getInitialState();
  
  // 2. Show modal
  this.showNewSequenceModal = true;
  
  // 3. Focus first input
  this.$nextTick(() => {
    this.$refs.firstInput?.focus();
  });
}
```

## Logs (console.log) - OBLIGATOIRE

Chaque étape du workflow doit être loguée avec `console.log()`:

| Checkpoint | Instruction console.log |
|------------|------------------------|
| `start` | `console.log('[WORKFLOW.sequences-new-sequence] START: Ouverture du modal nouvelle séquence')` |
| `modal-shown` | `console.log('[WORKFLOW.sequences-new-sequence] STEP: showNewSequenceModal = true')` |
| `state-initialized` | `console.log('[WORKFLOW.sequences-new-sequence] STEP: newSequence réinitialisé via getInitialState()')` |
| `input-focused` | `console.log('[WORKFLOW.sequences-new-sequence] STEP: Focus placé sur le premier input')` |
| `state-applied` | `console.log('[WORKFLOW.sequences-new-sequence] DATA: État après ouverture:', {showNewSequenceModal, newSequence})` |
| `end` | `console.log('[WORKFLOW.sequences-new-sequence] SUCCESS: Modal nouvelle séquence ouvert en', duree, 'ms')` |
| `error` | `console.error('[WORKFLOW.sequences-new-sequence] ERROR:', error)` |
