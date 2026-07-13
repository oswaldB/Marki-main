# Workflow : Blacklister/Déblacklister contact

## Écran
`contacts.html`

## Élément déclencheur
Option avec `@click="toggleBlacklist(contact)"`

## Action
Basculer le statut blacklist d'un contact

## Description
- Ajoute ou retire de la blacklist
- Désactive/active les relances

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
- `showContactModal` modifié

## API Calls

**Pas d'appel API** - Action côté client uniquement

+> faux il faut modifier la base de données regarde le /home/ubuntu/marki/relance\specs/data-models.md.

## Organisation des fichiers

```
frontend/
└── app/
    └── contacts/
        ├── index.html
        ├── components/
        │   └── (composants partagés)
        └── js/
            └── toggle-blacklist.js
```

### Fichier principal
- **HTML** : `frontend/app/contacts/index.html`
- **Point d'entrée** : Initialise la page Alpine.js

### Fichier workflow
- **JS** : `frontend/app/contacts/js/toggle-blacklist.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/contacts/js/toggle-blacklist.js
export function toggleBlacklist() {
  // Implementation du workflow
}
```

## Implementation

```javascript
toggleItem() {
  // 1. Toggle boolean state
  this.showModal = !this.showModal;
  // OR
  this.isExpanded = !this.isExpanded;
  
  // 2. If opening, prepare data
  if (this.showModal) {
    this.prepareModalData();
  }
}
``
