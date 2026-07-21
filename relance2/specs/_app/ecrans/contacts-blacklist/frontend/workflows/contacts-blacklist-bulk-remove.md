---
id: contacts-blacklist-bulk-remove
type: frontend
folder: specs/workflows/frontend/contacts-blacklist/
description: Retire plusieurs contacts de la blacklist en une action
depends_on: [contacts-blacklist-load]
screen: contacts-blacklist
global: false
mockup_entry: specs/mockups/contacts-blacklist.html
---

# contacts-blacklist-bulk-remove : Retirer en masse de la blacklist

## Description

Permet de retirer plusieurs contacts de la blacklist simultanément.

## Flow

```javascript
/**
 * @action Sélectionner plusieurs contacts
 * @checkpoint bulk-selection-changed
 * State: { selectedContacts: [id1, id2, ...] }
 * UI: Cases à cocher sur chaque card
 */

/**
 * @action Confirmer l'action en masse
 * @checkpoint bulk-unblacklist-confirm
 * Dialog: "Retirer X contacts de la blacklist ?"
 */

/**
 * @action Appel API
 * @checkpoint bulk-unblacklist-api-called
 * API: POST /api/contacts/bulk-unblacklist
 * Payload: { contact_ids: [...] }
 */

/**
 * @action Traiter la réponse
 * @checkpoint bulk-unblacklist-complete
 * Success: Mise à jour de la liste + toast
 */
```

## API

| Méthode | Endpoint | Payload |
|---------|----------|---------|
| POST | `/api/contacts/bulk-unblacklist` | `{ contact_ids: string[] }` |

## Response

```javascript
{
  success: true,
  updated: 3,
  errors: []
}
```

## UI

```
┌─────────────────────────────────────┐
│  3 contacts sélectionnés            │
│                                     │
│  [Retirer de la blacklist]          │
│  [Annuler]                          │
└─────────────────────────────────────┘
```

## Bouton "Retirer tout"

En haut de page, permet de retirer TOUS les contacts de la blacklist:
```javascript
removeAllFromBlacklist() {
  confirm("Retirer tous les contacts de la blacklist ?");
  // Appel API avec tous les IDs
}
```

## Fichiers liés

- Mockup: `specs/mockups/contacts-blacklist.html`
