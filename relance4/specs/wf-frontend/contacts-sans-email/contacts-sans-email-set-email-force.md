---
id: contacts-sans-email-set-email-force
type: frontend
folder: specs/workflows/frontend/contacts-sans-email/
description: Définit un email forcé pour un contact sans email
depends_on: [contacts-sans-email-load]
screen: contacts-sans-email
global: false
mockup_entry: specs/mockups/contacts-sans-email.html
---

# contacts-sans-email-set-email-force : Définir email forcé (sans email)

## Description

Identique au workflow contacts-set-email-force mais adapté pour la page sans-email. Après sauvegarde réussie, le contact est retiré de la liste (car il a maintenant un email forcé).

## Flow

```javascript
/**
 * @action Ouvrir la modale
 * @checkpoint email-force-modal-opened
 * State: { showEmailForceModal: true, selectedContact: contact }
 */

/**
 * @action Rechercher contacts existants
 * @checkpoint email-force-search
 * Input: emailSearchQuery
 * Output: Liste des contacts avec email
 */

/**
 * @action Sauvegarder
 * @checkpoint email-force-saved
 * API: PUT /api/contacts/{id} { email_force: email }
 * 
 * Après succès:
 * 1. Toast: "Email forcé enregistré"
 * 2. Retirer le contact de la liste locale
 * 3. Mettre à jour le compteur
 * 4. Fermer la modale
 */
```

## Différence avec contacts-set-email-force

Après sauvegarde réussie:
```javascript
// Retirer le contact de la liste (car il a maintenant un email)
this.contacts = this.contacts.filter(c => c.id !== contactId);
this.filteredContacts = this.filteredContacts.filter(c => c.id !== contactId);
```

## API

| Méthode | Endpoint | Payload |
|---------|----------|---------|
| PUT | `/api/contacts/{id}` | `{ email_force: string }` |

## UI spécifique

- Modale avec thème orange/amber
- Message d'aide: "Cet email sera utilisé pour les relances"

## Fichiers liés

- Mockup: `specs/mockups/contacts-sans-email.html`
