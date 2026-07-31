# Workflow : Sélectionner type Relance

## Écran
`sequences.html`

## Élément déclencheur
Bouton avec `@click="newSequence.type = 'relance'"`

## Action
Définir le type de séquence à Relance

## Description
- Prépare une séquence de relance d'impayés

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
            └── set-type-relance.js
```

### Fichier principal
- **HTML** : `frontend/app/sequences/index.html`
- **Point d'entrée** : Initialise la page Alpine.js

### Fichier workflow
- **JS** : `frontend/app/sequences/js/set-type-relance.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/sequences/js/set-type-relance.js
export function setTypeRelance() {
  // Implementation du workflow
}
```

## Implementation

```javascript
setSequence(value) {
  // 1. Update state
  this.currentSequence = value;
  
  // 2. Apply side effects
  this.applySequenceChange();
}
```