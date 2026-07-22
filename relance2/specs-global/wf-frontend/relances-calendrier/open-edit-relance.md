# Workflow : Éditer une relance calendrier

## Écran
`relances-calendrier.html`

## Élément déclencheur
Bouton avec `@click="openEditRelance(relance)"`

## Action
Ouvrir l'édition d'une relance depuis le calendrier

## Description
- Ouvre le modal d'édition
- Charge les données de la relance
- Permet de modifier date et contenu

## Data Model
**Page Function:** `relancesCalendrierPage()`

**Stores Alpine.js:**
- $store.ui

**Données:**
- `relancesProgrammees`
- `currentDate`
- `viewMode`
- `selectedDate`
- `relancesDuJour`

**États UI:**
- `loading`
- `error`

## State Changes

**Modifications:** États UI spécifiques selon implémentation

## API Calls

**Pas d'appel API** - Action côté client uniquement



## Organisation des fichiers

```
frontend/
└── app/
    └── relances-calendrier/
        ├── index.html
        ├── components/
        │   └── (composants partagés)
        └── js/
            └── open-edit-relance.js
```

### Fichier principal
- **HTML** : `frontend/app/relances-calendrier/index.html`
- **Point d'entrée** : Initialise la page Alpine.js

### Fichier workflow
- **JS** : `frontend/app/relances-calendrier/js/open-edit-relance.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/relances-calendrier/js/open-edit-relance.js
export function openEditRelance() {
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