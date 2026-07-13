# Workflow : Fermer le modal nouvelle séquence

## Écran
`sequences.html`

## Élément déclencheur
Bouton avec `@click="showNewSequenceModal = false"`

## Action
Annuler la création de séquence

## Description
- Ferme le modal
- Annule sans créer

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

**Modifications:**
- `editingSequence` modifié

## API Calls

**Pas d'appel API** - Action côté client uniquement



## Organisation des fichiers

```
frontend/
└── app/
    └── sequences/
        ├── index.html
        ├── components/
        │   └── (composants partagés)
        └── js/
            └── close-modal.js
```

### Fichier principal
- **HTML** : `frontend/app/sequences/index.html`
- **Point d'entrée** : Initialise la page Alpine.js

### Fichier workflow
- **JS** : `frontend/app/sequences/js/close-modal.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/sequences/js/close-modal.js
export function closeModal() {
  // Implementation du workflow
}
```

## Implementation

```javascript
closeModal() {
  // 1. Hide modal
  this.showModal = false;
  
  // 2. Reset selected
  this.selectedItem = null;
  this.editingItem = null;
  
  // 3. Clear validation errors
  this.validationErrors = {};
  this.error = null;
}
``