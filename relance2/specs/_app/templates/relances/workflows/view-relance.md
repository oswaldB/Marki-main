# Workflow : Voir détail relance

## Écran
`relances.html`

## Élément déclencheur
Bouton avec `@click="viewRelance(relance)"`

## Action
Afficher le détail d'une relance

## Description
- Ouvre le modal de détail
- Affiche le contenu complet
- Montre l'historique et le statut

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
            └── view-relance.js
```

### Fichier principal
- **HTML** : `frontend/app/relances/index.html`
- **Point d'entrée** : Initialise la page Alpine.js

### Fichier workflow
- **JS** : `frontend/app/relances/js/view-relance.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/relances/js/view-relance.js
export function viewRelance() {
  // Implementation du workflow
}
```

## Implementation

```javascript
viewRelance(id) {
  // 1. Navigate to detail
  window.location.href = `./relances-detail.html?id=${id}`;
}
```