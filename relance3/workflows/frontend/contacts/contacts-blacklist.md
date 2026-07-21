---
id: contacts-blacklist
type: frontend
folder: specs/workflows/frontend/contacts/
description: Confirme et applique le blacklistage d'un contact
depends_on: [contacts-load-all]
screen: contacts
global: false
mockup_entry: specs/mockups/contacts.html
---

# contacts-blacklist : Blacklister un contact

## Description

Ouvre une modale de confirmation avant de blacklister un contact. 
Le contact blacklisté reste visible dans la liste avec un badge "BlackListé" mais est exclu des relances automatiques.

## Élément déclencheur

Bouton "Blacklister" (icône 🚫) dans :
- La card d'une entreprise (header)
- La card d'une personne (header)
- La sous-card d'un collaborateur
- La sous-card d'un contact lié

## Flow du Workflow

```javascript
/**
 * @action Ouvrir la modale de confirmation
 * @param {Object} contact - Le contact à blacklister
 * @checkpoint blacklist-modal-opened
 * State: {
 *   contactToBlacklist: contact,
 *   showBlacklistModal: true
 * }
 */

/**
 * @action Confirmer le blacklistage
 * @checkpoint blacklist-confirmed
 * API: PUT /api/contacts/{id}/blacklist
 * OU: PUT /api/contacts/{id} avec { statut: 'blacklist', isBlacklisted: 1 }
 * 
 * Mise à jour locale:
 * - contact.statut = 'blacklist'
 * - contact.isBlacklisted = 1
 * 
 * Success:
 *   - Ferme la modale
 *   - Toast success
 *   - Le badge "BlackListé" apparaît sur la card
 * Error:
 *   - Toast error
 *   - Garde modale ouverte
 */

/**
 * @action Annuler (facultatif)
 * State: { showBlacklistModal: false, contactToBlacklist: null }
 */
```

## API

| Méthode | Endpoint | Payload | Response |
|---------|----------|---------|----------|
| PUT | `/api/contacts/{id}/blacklist` | `{ statut: 'blacklist', isBlacklisted: 1 }` | `ApiResponse<Contact>` |
| OU | `/api/contacts/{id}` | `{ statut: 'blacklist', isBlacklisted: 1 }` | `ApiResponse<Contact>` |

## State

```javascript
// Ouvrir modale de confirmation
openBlacklistConfirm(contact) {
  this.contactToBlacklist = contact;
  this.showBlacklistModal = true;
}

// Confirmer
confirmBlacklist() {
  if (this.contactToBlacklist) {
    this.contactToBlacklist.statut = 'blacklist';
    this.contactToBlacklist.isBlacklisted = 1;
    // API call...
    this.showBlacklistModal = false;
    this.contactToBlacklist = null;
  }
}

// Annuler
cancelBlacklist() {
  this.showBlacklistModal = false;
  this.contactToBlacklist = null;
}
```

## UI - Structure de la modale

```
┌─────────────────────────────────────┐
│  CONFIRMER LE BLACKLISTAGE      [X] │ ← Header rouge
├─────────────────────────────────────┤
│                                     │
│  ⚠️ Êtes-vous sûr de vouloir       │
│     blacklister ce contact ?       │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ 🏢 ACME Corporation          │   │  ← Ou 👤 pour personne
│  │ contact@acme.fr              │   │
│  │ 3 impayés                    │   │
│  └─────────────────────────────┘   │
│                                     │
│  Ce contact sera exclu des          │
│  relances automatiques et ne      │
│  pourra plus recevoir d'emails.   │
│                                     │
├─────────────────────────────────────┤
│  [Annuler]    [🚫 Confirmer]       │
└─────────────────────────────────────┘
```

## Checkpoints attendus

1. `blacklist-modal-opened` → Modale ouverte avec contact à blacklister
2. `blacklist-confirmed` → Blacklistage confirmé et appliqué

## Affichage après blacklistage

Le contact blacklisté reste visible avec :
- Badge rouge "BlackListé" dans l'en-tête de la card
- Conservation de toutes les fonctionnalités (email forcé, view detail)
- Le bouton "Blacklister" peut devenir "Retirer de la blacklist" (optionnel)

## Exemple de données après blacklistage

```javascript
// Avant
{
  id: "M3",
  nomComplet: "Global Industries SA",
  statut: "actif",
  isBlacklisted: 0
}

// Après confirmation
{
  id: "M3",
  nomComplet: "Global Industries SA",
  statut: "blacklist",
  isBlacklisted: 1
}
```

## Badge affiché

```html
<span class="bg-red-100 text-red-700 rounded-full px-2 py-0.5 text-xs">
  <i class="fas fa-ban mr-1"></i>BlackListé
</span>
```

## Fichiers liés

- Mockup: `specs/mockups/contacts.html`
- Composant: `app/templates/contacts/workflows/blacklist.html`
