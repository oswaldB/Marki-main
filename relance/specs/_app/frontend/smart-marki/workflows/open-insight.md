# Workflow : Ouvrir insight

## Écran
`smart-marki.html`

## Élément déclencheur
Carte avec `@click="openInsightDetail(insight)"`

## Action
Afficher le détail de l'insight IA

## Description
- Ouvre le panneau détail
- Montre l'analyse complète
- Propose actions recommandées

## Data Model
**Page Function:** `smartMarkiPage()`

**Stores Alpine.js:**
- $store.ui

**Données:**
- `suggestions`
- `historiqueActions`
- `stats`
- `features`
- `chatMessages`
- `chatInput`

**États UI:**
- `loading`
- `error`
- `processing`
- `chatOpen`

## State Changes

**Modifications:** États UI spécifiques selon implémentation

## API Calls

**Pas d'appel API** - Action côté client uniquement



## Organisation des fichiers

```
frontend/
└── app/
    └── smart-marki/
        ├── index.html
        ├── components/
        │   └── (composants partagés)
        └── js/
            └── open-insight.js
```

### Fichier principal
- **HTML** : `frontend/app/smart-marki/index.html`
- **Point d'entrée** : Initialise la page Alpine.js

### Fichier workflow
- **JS** : `frontend/app/smart-marki/js/open-insight.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/smart-marki/js/open-insight.js
export function openInsight() {
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