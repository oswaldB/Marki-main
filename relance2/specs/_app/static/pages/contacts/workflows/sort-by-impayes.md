# Workflow : Trier par nombre d'impayés

## Écran
`contacts.html`

## Élément déclencheur
Colonne avec `@click="sortColumn = 'impayes'; toggleSortDirection()"`

## Action
Trier les contacts par nombre d'impayés

## Description
- Trie décroissant par défaut
- Affiche les plus gros débiteurs

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
- `sortColumn` ← 'impayes'
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
            └── sort-by-impayes.js
```

### Fichier principal
- **HTML** : `frontend/app/contacts/index.html`
- **Point d'entrée** : Initialise la page Alpine.js

### Fichier workflow
- **JS** : `frontend/app/contacts/js/sort-by-impayes.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/contacts/js/sort-by-impayes.js
export function sortByImpayes() {
  // Implementation du workflow
}
```

## Implementation

```javascript
sortByImpayes() {
  // 1. Toggle direction if same column
  if (this.sortColumn === 'impayes') {
    this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
  } else {
    // 2. New column, default to desc (plus de dettes en premier)
    this.sortColumn = 'impayes';
    this.sortDirection = 'desc';
  }
}
```

## Logs (console.log) - OBLIGATOIRE

Chaque étape du workflow doit être loguée avec `console.log()`:

| Checkpoint | Instruction console.log |
|------------|------------------------|
| `start` | `console.log('[WORKFLOW.contacts-sort-by-impayes] START: Tri par nombre d impayés demandé', {previousColumn: this.sortColumn, previousDirection: this.sortDirection})` |
| `sort-applied` | `console.log('[WORKFLOW.contacts-sort-by-impayes] STEP: sortColumn =', this.sortColumn, 'sortDirection =', this.sortDirection)` |
| `table-rerendered` | `console.log('[WORKFLOW.contacts-sort-by-impayes] STEP: Tableau réordonné,', this.contacts.length, 'contacts triés')` |
| `state-applied` | `console.log('[WORKFLOW.contacts-sort-by-impayes] DATA: État après tri:', {sortColumn: this.sortColumn, sortDirection: this.sortDirection, totalContacts: this.contacts.length})` |
| `end` | `console.log('[WORKFLOW.contacts-sort-by-impayes] SUCCESS: Tri appliqué en', duree, 'ms')` |
| `error` | `console.error('[WORKFLOW.contacts-sort-by-impayes] ERROR:', error)` |
