# Workflow : Ouvrir/Fermer dropdown actions

## Écran
`contacts.html`

## Élément déclencheur
Bouton avec `@click="open = !open"` (variable locale du composant dropdown)

## Action
Basculer le menu d'actions du contact

## Description
- Affiche/masque les options
- Blacklist, email forcé, etc.

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

**Variables locales (composant dropdown):**
- `open` - état ouvert/fermé du dropdown

## State Changes

**Modifications:**
- Variable locale `open` toggle entre true/false

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
            └── toggle-dropdown.js
```

### Fichier principal
- **HTML** : `frontend/app/contacts/index.html`
- **Point d'entrée** : Initialise la page Alpine.js

### Fichier workflow
- **JS** : `frontend/app/contacts/js/toggle-dropdown.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/contacts/js/toggle-dropdown.js
export function toggleDropdown() {
  // Implementation du workflow
}
```

## Implementation

```javascript
// Dans le composant dropdown Alpine
// Variable locale: open = false

toggleDropdown() {
  // 1. Toggle boolean state
  this.open = !this.open;
  
  // 2. If opening, close other dropdowns
  if (this.open) {
    this.$dispatch('close-other-dropdowns');
  }
}
```
