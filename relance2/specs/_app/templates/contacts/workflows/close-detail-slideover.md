# Workflow : Fermer modal détail contact

## Écran
`contacts.html`

## Élément déclencheur
Bouton avec `@click="showContactModal = false"`

## Action
Fermer le modal de détail contact

## Description
- Masque le modal
- Retour à la liste

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
- `showContactModal` passe à false
- `editingContact` réinitialisé

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
            └── close-detail-modal.js
```

### Fichier principal
- **HTML** : `frontend/app/contacts/index.html`
- **Point d'entrée** : Initialise la page Alpine.js

### Fichier workflow
- **JS** : `frontend/app/contacts/js/close-detail-modal.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/contacts/js/close-detail-modal.js
export function closeDetailModal() {
  // Implementation du workflow
}
```

## Implementation

```javascript
closeDetailModal() {
  // 1. Hide modal
  this.showContactModal = false;
  
  // 2. Reset selected
  this.editingContact = null;
  
  // 3. Clear validation errors
  this.error = null;
}
```
