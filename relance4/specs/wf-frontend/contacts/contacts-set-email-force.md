---
id: contacts-set-email-force
type: frontend
folder: specs/workflows/frontend/contacts/
description: Définit un email forcé pour un contact via modale avec recherche parmi les contacts existants
depends_on: [contacts-load-all]
screen: contacts
global: false
mockup_entry: specs/mockups/contacts.html
---

# contacts-set-email-force : Définir email forcé

## Description

Ouvre une modale permettant de définir un email de relance forcé pour un contact. 
L'utilisateur peut :
1. Saisir manuellement un email
2. Chercher et sélectionner un autre contact existant pour hériter de son email

L'email forcé remplace l'email principal lors de l'envoi des relances.

## Élément déclencheur

Bouton "Email forcé" dans :
- La card d'une entreprise (header)
- La card d'une personne (header)
- La sous-card d'un collaborateur
- La sous-card d'un contact lié

## Flow du Workflow

```javascript
/**
 * @action Ouvrir la modale set-email-force
 * @param {Object} contact - Le contact à modifier
 * @checkpoint email-force-modal-opened
 * State: {
 *   selectedContact: contact,
 *   showEmailForceModal: true,
 *   emailForceValue: contact.emailForce || '',
 *   emailForceSearch: ''
 * }
 */

/**
 * @action Rechercher des contacts
 * @checkpoint email-force-search
 * Input: emailForceQuery (3 caractères min pour lancer la recherche)
 * Filtres: 
 *   - Type M (entreprises) ou P sans entreprise
 *   - Non blacklistés
 *   - Exclut le contact courant
 * Output: emailForceEntreprises[] + emailForcePersonnes[]
 */

/**
 * @action Sélectionner un contact dans les résultats
 * @checkpoint email-force-contact-selected
 * @param {Object} selectedContact - Contact choisi
 * State: { 
 *   selectedContact: newContact,
 *   emailForceValue: selectedContact.emailForce || selectedContact.email || ''
 * }
 */

/**
 * @action Sauvegarder l'email forcé
 * @checkpoint email-force-saved
 * API: PUT /api/contacts/{id} 
 * Payload: { email_force: emailForceValue }
 * Success: 
 *   - Met à jour le contact localement
 *   - Ferme la modale
 *   - Toast success
 * Error: Toast error, garde modale ouverte
 */
```

## API

| Méthode | Endpoint | Payload | Response |
|---------|----------|---------|----------|
| PUT | `/api/contacts/{id}` | `{ email_force: string }` | `ApiResponse<Contact>` |

## State

```javascript
// Ouvrir modale
openSetEmailForce(contact) {
  this.selectedContact = contact;
  this.showEmailForceModal = true;
  this.emailForceValue = contact?.emailForce || '';
  this.emailForceSearch = '';
}

// Sauvegarder
saveEmailForce() {
  if (this.selectedContact && this.emailForceValue) {
    this.selectedContact.emailForce = this.emailForceValue;
    // API call...
    this.showEmailForceModal = false;
    this.selectedContact = null;
    this.emailForceValue = '';
  }
}
```

## Computed Properties - Recherche

```javascript
// Entreprises disponibles pour l'email forcé
get emailForceEntreprises() {
  if (!this.emailForceSearch) {
    return this.contacts
      .filter(c => c.typePersonne === 'M' && 
                  c.statut !== 'blacklist' && 
                  !c.isBlacklisted)
      .slice(0, 5);
  }
  const q = this.emailForceSearch.toLowerCase();
  return this.contacts
    .filter(c => c.typePersonne === 'M' && 
                c.statut !== 'blacklist' && 
                !c.isBlacklisted && 
                (c.nomComplet?.toLowerCase() || '').includes(q))
    .slice(0, 5);
}

// Personnes sans entreprise disponibles
get emailForcePersonnes() {
  if (!this.emailForceSearch) {
    return this.contacts
      .filter(c => c.typePersonne === 'P' && 
                  !c.entrepriseId && 
                  !c.societesLiees &&
                  c.statut !== 'blacklist' && 
                  !c.isBlacklisted)
      .slice(0, 5);
  }
  const q = this.emailForceSearch.toLowerCase();
  return this.contacts
    .filter(c => c.typePersonne === 'P' && 
                !c.entrepriseId && 
                !c.societesLiees &&
                c.statut !== 'blacklist' && 
                !c.isBlacklisted &&
                (c.nomComplet?.toLowerCase() || '').includes(q))
    .slice(0, 5);
}
```

## UI - Structure de la modale

```
┌─────────────────────────────────────┐
│  DÉFINIR UN EMAIL FORCÉ         [X] │
├─────────────────────────────────────┤
│                                     │
│  Contact sélectionné               │
│  ┌─────────────────────────────┐   │
│  │ Marie Lefebvre              │   │
│  │ Email: marie@email.com      │   │
│  │ Email forcé: pro@email.com  │   │  ← Affiché si existe
│  └─────────────────────────────┘   │
│                                     │
│  Email forcé                       │
│  [finance@entreprise.fr       ]    │  ← Input modifiable
│                                     │
│  ──────────────────────────────────│
│                                     │
│  Ou sélectionnez un autre contact  │
│  [🔍 Rechercher un contact...]     │  ← Input recherche
│                                     │
│  Entreprises (2)                   │  ← Section si résultats
│  ┌─────────────────────────────┐   │
│  │ 🏢 ACME Corporation     [✓] │   │  ← Sélectionné si cliqué
│  │    contact@acme.fr          │   │
│  └─────────────────────────────┘   │
│  ┌─────────────────────────────┐   │
│  │ 🏢 TechStart SARL      [F]  │   │  ← Badge [F] si email forcé
│  │    finance@techstart.fr   │   │
│  └─────────────────────────────┘   │
│                                     │
│  Personnes sans entreprise (1)     │
│  ┌─────────────────────────────┐   │
│  │ 👤 Emma Moreau                │   │
│  │    emma.pro@consultant.fr     │   │
│  └─────────────────────────────┘   │
│                                     │
├─────────────────────────────────────┤
│  [Annuler]    [Enregistrer]        │
└─────────────────────────────────────┘
```

## Checkpoints attendus

1. `email-force-modal-opened` → Modale ouverte avec contact
2. `email-force-search` → Recherche lancée
3. `email-force-contact-selected` → Contact sélectionné dans la liste
4. `email-force-saved` → Email forcé enregistré

## Validation

| Champ | Règle | Message d'erreur |
|-------|-------|------------------|
| emailForceValue | Format email valide | "Email invalide" |
| emailForceValue | Requis | "L'email est requis" |

## Fichiers liés

- Mockup: `specs/mockups/contacts.html`
- Composant: `app/templates/contacts/workflows/set-email-force.html`
