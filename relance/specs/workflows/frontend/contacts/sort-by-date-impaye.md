# Workflow : Trier par date du plus ancien impayé

## Écran
`contacts.html`

## Élément déclencheur
Colonne avec `@click="sortColumn = 'dateImpaye'; toggleSortDirection()"`

## Action
Trier les contacts par date du plus ancien impayé

## Description
- Trie par date de la facture la plus ancienne
- Permet d'identifier les clients les plus en retard

## Data Model
**Page Function:** `contactsPage()`

**Stores Alpine.js:**
- $store.ui

**Données:**
- `contacts`
- `stats`
- `searchQuery`
- `filterType`
- `filterClientType`
- `sortColumn`
- `sortDirection`
- `page`
- `perPage`
- `selectedContacts`

**États UI:**
- `loading`
- `error`
- `showContactModal`
- `editingContact`
- `exportNotification`

## State Changes

**Modifications:**
- `sortColumn` ← 'dateImpaye'
- `sortDirection` ← toggle entre 'asc' et 'desc'

## API Calls

**Pas d'appel API** - Action côté client uniquement

## Organisation des fichiers

```
frontend/
└── app/
    └── contacts/
        ├── index.html
        ├── components/
        │   └── (composants partagés)
        └── js/
            └── sort-by-date-impaye.js
```

### Fichier principal
- **HTML** : `frontend/app/contacts/index.html`
- **Point d'entrée** : Initialise la page Alpine.js

### Fichier workflow
- **JS** : `frontend/app/contacts/js/sort-by-date-impaye.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/contacts/js/sort-by-date-impaye.js
export function sortByDateImpaye() {
  // Implementation du workflow
}
```

## Implementation

```javascript
sortByDateImpaye() {
  // 1. Toggle direction if same column
  if (this.sortColumn === 'dateImpaye') {
    this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
  } else {
    // 2. New column, default to asc (plus ancien en premier)
    this.sortColumn = 'dateImpaye';
    this.sortDirection = 'asc';
  }
}
```
