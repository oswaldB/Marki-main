---
id: contacts-blacklist-remove
type: frontend
folder: specs/workflows/frontend/contacts-blacklist/
description: Retire un contact de la blacklist
depends_on: [contacts-blacklist-load]
screen: contacts-blacklist
global: false
mockup_entry: specs/mockups/contacts-blacklist.html
---

# contacts-blacklist-remove : Retirer de la blacklist

## Description

Retire un contact de la blacklist. Le contact reçra à nouveau les relances automatiques.

## Flow

```javascript
/**
 * @action Confirmer l'action
 * @checkpoint unblacklist-confirm
 * Dialog: "Retirer [nom] de la blacklist ?"
 */

/**
 * @action Appel API
 * @checkpoint unblacklist-api-called
 * API: PUT /api/contacts/{id}
 * Payload: { is_blacklisted: 0 }
 */

/**
 * @action Mettre à jour l'UI
 * @checkpoint unblacklist-complete
 * - Toast: "[nom] a été retiré de la blacklist"
 * - Retirer le contact de la liste locale
 * - Mettre à jour le compteur
 */

/**
 * @action Erreur
 * @checkpoint unblacklist-error
 * Toast: "Erreur: [message]"
 */
```

## API

| Méthode | Endpoint | Payload |
|---------|----------|---------|
| PUT | `/api/contacts/{id}` | `{ is_blacklisted: 0 }` |

## UI Update

```javascript
// Retirer de la liste après succès
this.contacts = this.contacts.filter(c => c.id !== contactId);
this.filteredContacts = this.filteredContacts.filter(c => c.id !== contactId);

// Toast
showToast(`${contact.nomComplet} a été retiré de la blacklist`, 'success');
```

## Confirmation Dialog

```
┌─────────────────────────────────────┐
│  Confirmer                          │
├─────────────────────────────────────┤
│  Retirer Lucas Petit de la          │
│  blacklist ?                        │
│                                     │
│  Le contact recevra à nouveau les   │
│  relances automatiques.             │
│                                     │
├─────────────────────────────────────┤
│  [Annuler]    [Confirmer]          │
└─────────────────────────────────────┘
```

## Fichiers liés

- Mockup: `specs/mockups/contacts-blacklist.html`
