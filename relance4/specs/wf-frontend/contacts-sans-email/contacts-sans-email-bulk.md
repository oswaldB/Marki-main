---
id: contacts-sans-email-bulk
type: frontend
folder: specs/workflows/frontend/contacts-sans-email/
description: Actions en masse sur les contacts sans email
depends_on: [contacts-sans-email-load]
screen: contacts-sans-email
global: false
mockup_entry: specs/mockups/contacts-sans-email.html
---

# contacts-sans-email-bulk : Actions en masse

## Description

Permet de définir le même email forcé pour plusieurs contacts sans email simultanément.

## Flow

```javascript
/**
 * @action Sélectionner plusieurs contacts
 * @checkpoint bulk-selection-changed
 * State: { selectedContacts: [id1, id2, ...] }
 * UI: Cases à cocher sur chaque card
 */

/**
 * @action Ouvrir modale d'action en masse
 * @checkpoint bulk-modal-opened
 * Affiche: "X contacts sélectionnés"
 */

/**
 * @action Définir email forcé en masse
 * @checkpoint bulk-email-force-requested
 * API: POST /api/contacts/bulk-set-email-force
 * Payload: { contact_ids: [...], email_force: email }
 */

/**
 * @action Traiter réponse
 * @checkpoint bulk-complete
 * Success: Mise à jour de la liste + toast
 * Partial: Affiche les erreurs par contact
 */
```

## API

| Méthode | Endpoint | Payload |
|---------|----------|---------|
| POST | `/api/contacts/bulk-set-email-force` | `{ contact_ids: string[], email_force: string }` |

## Response

```javascript
{
  success: true,
  updated: 5,
  errors: [
    { contact_id: "123", error: "Email invalide" }
  ]
}
```

## UI

```
┌─────────────────────────────────────┐
│  3 contacts sélectionnés            │
│                                     │
│  [Définir email forcé]  [Annuler]   │
└─────────────────────────────────────┘
```

## Fichiers liés

- Mockup: `specs/mockups/contacts-sans-email.html`
