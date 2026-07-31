# Workflow : Ouvrir détail facture payeur

## Écran
`impayes-payeur.html`

## Élément déclencheur
Ligne avec `@click="openDetail(facture)"`

## Action
Ouvrir le modal de détail d'une facture

## Description
- Affiche le modal avec les détails complets
- Charge les informations de la facture sélectionnée
- Permet d'ajouter une note

## Data Model
**Page Function:** `impayesPayeurPage()`

**Stores Alpine.js:**
- $store.ui

**Données:**
- `payeurs`
- `searchQuery`
- `filterStatut`
- `sortBy`
- `sortDirection`

**États UI:**
- `loading`
- `error`
- `expandedPayeur`

## State Changes

**Modifications:** États UI spécifiques selon implémentation

## API Calls

**Pas d'appel API** - Action côté client uniquement
## Organisation des fichiers

```
frontend/
└── app/
    └── impayes-payeur/
        ├── index.html
        ├── components/
        │   └── (composants partagés)
        └── js/
            └── open-detail.js
```

### Fichier principal
- **HTML** : `frontend/app/impayes-payeur/index.html`
- **Point d'entrée** : Initialise la page Alpine.js

### Fichier workflow
- **JS** : `frontend/app/impayes-payeur/js/open-detail.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/impayes-payeur/js/open-detail.js
export function openDetail() {
  // Implementation du workflow
}
```

## Implementation

```javascript
openModal(item) {
  // 1. Set selected item
  this.selectedItem = item;
  
  // 2. Show modal
  this.showModal = true;
  
  // 3. Load additional data if needed
  if (item?.id) {
    this.loadDetail(item.id);
  }
}
``

## Navigation
- **Cible** : Modal détail
