---
id: contacts-sans-email-workflows
type: frontend
folder: specs/workflows/frontend/contacts-sans-email/
description: Workflows pour la page Contacts sans email
depends_on: [contacts-load-all]
screens: [contacts-sans-email]
global: false
---

# Workflows Frontend - Page Contacts sans email

## Vue d'ensemble

Page dédiée affichant uniquement les contacts sans adresse email. Permet de définir rapidement des emails forcés pour ces contacts.

## Workflows

| Workflow | ID | Description | Fichier |
|----------|-----|-------------|---------|
| **Load** | `contacts-sans-email-load` | Charge les contacts sans email | [contacts-sans-email-load.md](./contacts-sans-email-load.md) |
| **Set Email Force** | `contacts-sans-email-set-email-force` | Définit un email forcé | [contacts-sans-email-set-email-force.md](./contacts-sans-email-set-email-force.md) |
| **Bulk Actions** | `contacts-sans-email-bulk` | Actions en masse | [contacts-sans-email-bulk.md](./contacts-sans-email-bulk.md) |

## Data Model

```javascript
{
  loading: false,
  searchQuery: '',
  currentPage: 1,
  itemsPerPage: 12,
  contacts: [],           // Contacts sans email uniquement
  filteredContacts: [],
  selectedContacts: [],   // Pour actions en masse
  showEmailForceModal: false,
  emailForceMode: 'select',
  emailSearchQuery: '',
  manualEmail: ''
}
```

## Navigation

Accessible depuis:
- Sidebar: "Sans email" avec badge de compteur
- Page Contacts: Bouton "Sans email" dans le header

## API Endpoints

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/contacts?sans_email=1` | Liste des contacts sans email |
| PUT | `/api/contacts/{id}` | Met à jour email_force |
| POST | `/api/contacts/bulk-set-email-force` | Action en masse |

## Mockups

- `specs/mockups/contacts-sans-email.html`
