---
id: contacts-blacklist-workflows
type: frontend
folder: specs/workflows/frontend/contacts-blacklist/
description: Workflows pour la page Contacts blacklistés
screens: [contacts-blacklist]
global: false
---

# Workflows Frontend - Page Contacts blacklistés

## Vue d'ensemble

Page dédiée affichant uniquement les contacts blacklistés. Permet de retirer des contacts de la blacklist.

## Workflows

| Workflow | ID | Description | Fichier |
|----------|-----|-------------|---------|
| **Load** | `contacts-blacklist-load` | Charge les contacts blacklistés | [contacts-blacklist-load.md](./contacts-blacklist-load.md) |
| **Search** | `contacts-blacklist-search` | Recherche backend avec debounce | [contacts-blacklist-search.md](./contacts-blacklist-search.md) |
| **Remove** | `contacts-blacklist-remove` | Retire un contact de la blacklist | [contacts-blacklist-remove.md](./contacts-blacklist-remove.md) |
| **Bulk Remove** | `contacts-blacklist-bulk-remove` | Retire plusieurs contacts de la blacklist | [contacts-blacklist-bulk-remove.md](./contacts-blacklist-bulk-remove.md) |

## Data Model

```javascript
{
  loading: false,
  searchQuery: '',
  currentPage: 1,
  itemsPerPage: 12,
  contacts: [],           // Contacts blacklistés uniquement
  filteredContacts: [],
  selectedContacts: [],   // Pour actions en masse
}
```

## Navigation

Accessible depuis:
- Sidebar: "Blacklist" avec badge de compteur
- Page Contacts: Bouton "Blacklist" dans le header

## API Endpoints

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/contacts?is_blacklisted=1` | Liste des blacklistés |
| PUT | `/api/contacts/{id}` | Retire de la blacklist (is_blacklisted: 0) |
| POST | `/api/contacts/bulk-unblacklist` | Action en masse |

## Mockups

- `specs/mockups/contacts-blacklist.html`
