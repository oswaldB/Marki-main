# Workflow : Blacklister/Déblacklister contact

## Écran
`contacts.html`

## Élément déclencheur
Option avec `@click="toggleBlacklist(contact)"`

## Action
Basculer le statut blacklist d'un contact

## Description
- Ajoute ou retire de la blacklist
- Annule les relances en cours si blacklisté

## Data Model
**Page Function:** `contactsPage()``

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
- `contact.is_blacklisted` modifié
- Relances annulées si blacklisté

## API Calls

**POST /api/contacts/:id/blacklist**

```javascript
// Requête
POST /api/contacts/cont_xxx/blacklist
Authorization: Bearer {token}
Content-Type: application/json

{
  "motif": "Client ne souhaite plus être relancé"
}

// Réponse 200
{
  "contact": {
    "id": "cont_xxx",
    "is_blacklisted": 1,
    "blacklist_date": "2026-07-14T15:30:00Z",
    "blacklist_motif": "Client ne souhaite plus être relancé"
  },
  "action": "blacklisté",
  "relances_annulees": 3
}
```

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
export function toggleBlacklist(contactId) {
  return fetch(`/api/contacts/${contactId}/blacklist`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Alpine.store('auth').token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      motif: 'Blacklist manuelle'
    })
  })
  .then(r => r.json())
  .then(data => {
    // Mettre à jour le contact dans le store
    Alpine.store('contacts').updateContact(data.contact);
    return data;
  });
}
```

## Implementation

```javascript
toggleBlacklist(contact) {
  // 1. Appel API
  fetch(`/api/contacts/${contact.id}/blacklist`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ motif: 'Blacklist manuelle' })
  })
  .then(res => res.json())
  .then(data => {
    // 2. Mettre à jour le contact localement
    contact.is_blacklisted = data.contact.is_blacklisted;
    contact.blacklist_date = data.contact.blacklist_date;
    contact.blacklist_motif = data.contact.blacklist_motif;
    
    // 3. Afficher notification
    this.showNotification(`Contact ${data.action}`);
  });
}
```

## Logs (console.log) - OBLIGATOIRE

Chaque étape du workflow doit être loguée avec `console.log()`:

| Checkpoint | Instruction console.log |
|------------|------------------------|
| `start` | `console.log('[WORKFLOW.contacts-toggle-blacklist] START: Toggle blacklist contact', contactId)` |
| `validation` | `console.log('[WORKFLOW.contacts-toggle-blacklist] STEP: Validation contact (id, état actuel)')` |
| `api-call` | `console.log('[WORKFLOW.contacts-toggle-blacklist] API_CALL: POST /api/contacts/:id/blacklist', {contactId, motif})` |
| `response` | `console.log('[WORKFLOW.contacts-toggle-blacklist] API_RESPONSE: Réponse reçue', {action, relances_annulees})` |
| `state-updated` | `console.log('[WORKFLOW.contacts-toggle-blacklist] STATE_UPDATED: contact.is_blacklisted mis à jour', {is_blacklisted, relances_annulees})` |
| `success` | `console.log('[WORKFLOW.contacts-toggle-blacklist] SUCCESS: Contact ${data.action} en', duree, 'ms')` |
| `end` | `console.log('[WORKFLOW.contacts-toggle-blacklist] END: Workflow terminé')` |
| `error` | `console.error('[WORKFLOW.contacts-toggle-blacklist] ERROR:', error)` |
