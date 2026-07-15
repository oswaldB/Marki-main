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
```

## Logs (console.log) - OBLIGATOIRE

Chaque étape du workflow doit être loguée avec `console.log()`:

| Checkpoint | Instruction console.log |
|------------|------------------------|
| `start` | `console.log('[WORKFLOW.contacts-pagination-next] START: Navigation vers la page suivante', { currentPage: this.page, perPage: this.perPage })` |
| `can-navigate` | `console.log('[WORKFLOW.contacts-pagination-next] STEP: Vérification nextPage possible (page < totalPages)')` |
| `page-incremented` | `console.log('[WORKFLOW.contacts-pagination-next] STEP: this.page incrémenté, nouvelle valeur =', this.page)` |
| `step-fetch-new-page` | `console.log('[WORKFLOW.contacts-pagination-next] STEP: Lancement loadData() pour la nouvelle page')` |
| `data-received` | `console.log('[WORKFLOW.contacts-pagination-next] DATA: Page', this.page, 'reçue,', contacts.length, 'contacts chargés')` |
| `table-rendered` | `console.log('[WORKFLOW.contacts-pagination-next] STEP: Tableau contacts re-rendu pour page', this.page)` |
| `end` | `console.log('[WORKFLOW.contacts-pagination-next] SUCCESS: Pagination page suivante terminée, page =', this.page, ', durée =', duree, 'ms')` |
| `error` | `console.error('[WORKFLOW.contacts-pagination-next] ERROR:', error)` |