# Workflow : Modifier une relance

## Écran
`relances.html`

## Élément déclencheur
Bouton avec `@click="editRelance(relance, payeur)"`

## Action
Ouvrir l'édition d'une relance existante

## Description
- Charge les données de la relance
- Affiche le formulaire d'édition
- Permet de modifier date, type, contenu

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
            └── edit-relance.js
```

### Fichier principal
- **HTML** : `frontend/app/relances/index.html`
- **Point d'entrée** : Initialise la page Alpine.js

### Fichier workflow
- **JS** : `frontend/app/relances/js/edit-relance.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/relances/js/edit-relance.js
export function editRelance() {
  // Implementation du workflow
}
```

## Implementation

```javascript
editRelance(item) {
  // 1. Clone item to editing
  this.editingRelance = { ...item };
  
  // 2. Show edit modal
  this.showEditRelanceModal = true;
}
```