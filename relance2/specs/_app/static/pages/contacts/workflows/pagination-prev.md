# Workflow : Page précédente contacts

## Écran
`contacts.html`

## Élément déclencheur
Bouton avec `@click="page--"`

## Action
Page précédente de la liste

## Description
- Navigation pagination
- Désactivé en première page

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
            └── pagination-prev.js
```

### Fichier principal
- **HTML** : `frontend/app/contacts/index.html`
- **Point d'entrée** : Initialise la page Alpine.js

### Fichier workflow
- **JS** : `frontend/app/contacts/js/pagination-prev.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/contacts/js/pagination-prev.js
export function paginationPrev() {
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
| `start` | `console.log('[WORKFLOW.contacts-pagination-prev] START: Navigation vers la page précédente')` |
| `can-navigate` | `console.log('[WORKFLOW.contacts-pagination-prev] STEP: Vérification page > 1, page courante =', this.page)` |
| `step-fetch-new-page` | `console.log('[WORKFLOW.contacts-pagination-prev] STEP: Décrémentation page, this.page--')` |
| `data-received` | `console.log('[WORKFLOW.contacts-pagination-prev] DATA: loadData() terminé, contacts reçus =', this.contacts.length, 'page =', this.page)` |
| `table-rendered` | `console.log('[WORKFLOW.contacts-pagination-prev] STEP: Tableau contacts re-rendu (page', this.page, '/', this.totalPages, ')')` |
| `end` | `console.log('[WORKFLOW.contacts-pagination-prev] SUCCESS: Navigation page précédente terminée en', duree, 'ms')` |
| `error` | `console.error('[WORKFLOW.contacts-pagination-prev] ERROR:', error)` |