# Workflow : Fermer le détail payeur

## Écran
`impayes-payeur.html`

## Élément déclencheur
Bouton avec `@click="expandedPayeur = null"`

## Action
Fermer le panneau de détail du payeur

## Description
- Masque le détail des factures du payeur
- Retour à la liste compacte

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
- `expandedPayeur` (ID du payeur dont le détail est ouvert)

## State Changes

**Modifications:**
- `expandedPayeur` passe à null

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
            └── close-detail.js
```

### Fichier principal
- **HTML** : `frontend/app/impayes-payeur/index.html`
- **Point d'entrée** : Initialise la page Alpine.js

### Fichier workflow
- **JS** : `frontend/app/impayes-payeur/js/close-detail.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/impayes-payeur/js/close-detail.js
export function closeDetail() {
  // Implementation du workflow
}
```

## Implementation

```javascript
closeDetail() {
  // 1. Collapse payeur detail
  this.expandedPayeur = null;
  
  // 2. Clear validation errors
  this.error = null;
}
```
