# Workflow : Éditer une note

## Écran
`relances.html`

## Élément déclencheur
Bouton avec `@click="editNote(payeur)"`

## Action
Ouvrir l'édition de la note sur une relance

## Description
- Affiche un champ d'édition
- Permet de modifier la note existante
- Sauvegarde au blur ou sur validation

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
            └── edit-note.js
```

### Fichier principal
- **HTML** : `frontend/app/relances/index.html`
- **Point d'entrée** : Initialise la page Alpine.js

### Fichier workflow
- **JS** : `frontend/app/relances/js/edit-note.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/relances/js/edit-note.js
export function editNote() {
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