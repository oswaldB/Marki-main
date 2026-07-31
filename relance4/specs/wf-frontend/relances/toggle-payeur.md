# Workflow : Déplier/Replier un payeur

## Écran
`relances.html`

## Élément déclencheur
Bouton avec `@click="togglePayeur(payeur.id)"`

## Action
Afficher/masquer les relances d'un payeur

## Description
- Déplie la section du payeur
- Affiche la liste de ses relances
- Anime l'icône de toggle

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

**Modifications:**
- `showNewRelanceModal` modifié
- `showEditRelanceModal` modifié
- `showSequenceModal` modifié
- `expandedPayeur` modifié

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
            └── toggle-payeur.js
```

### Fichier principal
- **HTML** : `frontend/app/relances/index.html`
- **Point d'entrée** : Initialise la page Alpine.js

### Fichier workflow
- **JS** : `frontend/app/relances/js/toggle-payeur.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/relances/js/toggle-payeur.js
export function togglePayeur() {
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
``