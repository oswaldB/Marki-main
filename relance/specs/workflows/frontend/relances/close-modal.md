# Workflow : Fermer le modal relance

## Écran
`relances.html`

## Élément déclencheur
Bouton avec `@click="showRelanceModal = false"`

## Action
Fermer le modal de relance

## Description
- Masque le modal actuel
- Retour à la liste

## Data Model
**Page Function:** `relancesPage()`

**Stores Alpine.js:**
- $store.ui

**Données:**
- `payeurs`
- `stats`
- `sequences`
- `searchQuery`
- `filterStatut`
- `editorContent`
- `editorMode`

**États UI:**
- `loading`
- `error`
- `expandedPayeur`
- `showNewRelanceModal`
- `showEditRelanceModal`
- `showSequenceModal`

## State Changes

**Modifications:** États UI spécifiques selon implémentation

## API Calls

**Pas d'appel API** - Action côté client uniquement



## Organisation des fichiers

```
frontend/
└── app/
    └── relances/
        ├── index.html
        ├── components/
        │   └── (composants partagés)
        └── js/
            └── close-modal.js
```

### Fichier principal
- **HTML** : `frontend/app/relances/index.html`
- **Point d'entrée** : Initialise la page Alpine.js

### Fichier workflow
- **JS** : `frontend/app/relances/js/close-modal.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/relances/js/close-modal.js
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