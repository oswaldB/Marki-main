# Workflow : Page suivante contacts

## Écran
`contacts.html`

## Élément déclencheur
Bouton avec `@click="page++"`

## Action
Page suivante de la liste

## Description
- Navigation pagination
- Désactivé en dernière page

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
- `page` modifié

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
            └── pagination-next.js
```

### Fichier principal
- **HTML** : `frontend/app/contacts/index.html`
- **Point d'entrée** : Initialise la page Alpine.js

### Fichier workflow
- **JS** : `frontend/app/contacts/js/pagination-next.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/contacts/js/pagination-next.js
export function paginationNext() {
  // Implementation du workflow
}
```

## Implementation

```javascript
// Next page
nextPage() {
  if (this.page < this.totalPages) {
    this.page++;
    this.loadData();
  }
}

// Previous page
prevPage() {
  if (this.page > 1) {
    this.page--;
    this.loadData();
  }
}

// Change per page
setPerPage(count) {
  this.perPage = count;
  this.page = 1; // Reset to first page
  this.loadData();
}
``