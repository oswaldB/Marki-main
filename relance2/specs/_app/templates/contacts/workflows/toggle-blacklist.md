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

**PUT /api/contacts/:id**

```javascript
// Requête
PUT /api/contacts/cont_xxx
Authorization: Bearer {token}
Content-Type: application/json

{
  "is_blacklisted": true,
  "blacklist_motif": "Client ne souhaite plus être relancé"
}

// Réponse 200
{
  "id": "cont_xxx",
  "is_blacklisted": 1,
  "blacklist_date": "2026-07-14T15:30:00Z",
  "blacklist_motif": "Client ne souhaite plus être relancé"
}
```

**Note:** Utilise la route CRUD PUT générique, pas une route spécifique `/blacklist`.

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
export function toggleBlacklist(contactId, currentStatus) {
  const workflowId = crypto.randomUUID();
  log.info('WORKFLOW_START', { workflowId, workflow: 'toggleBlacklist', contactId });
  
  return fetch(`/api/contacts/${contactId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${Alpine.store('auth').token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      is_blacklisted: !currentStatus,
      blacklist_motif: currentStatus ? null : 'Blacklist manuelle'
    })
  })
  .then(r => r.json())
  .then(data => {
    log.info('WORKFLOW_SUCCESS', { workflowId, contactId, newStatus: data.is_blacklisted });
    return data;
  })
  .catch(error => {
    log.error('WORKFLOW_ERROR', { workflowId, contactId, error: error.message });
    throw error;
  });
}
```

## Implementation

```javascript
toggleBlacklist(contact) {
  const workflowId = crypto.randomUUID();
  log.info('WORKFLOW_START', { workflowId, workflow: 'toggleBlacklist', contactId: contact.id });
  
  // 1. Optimistic update
  const previousStatus = contact.is_blacklisted;
  contact.is_blacklisted = !previousStatus;
  
  // 2. Appel API PUT sur la route CRUD
  fetch(`/api/contacts/${contact.id}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ 
      is_blacklisted: contact.is_blacklisted,
      blacklist_motif: contact.is_blacklisted ? 'Blacklist manuelle' : null
    })
  })
  .then(res => {
    if (!res.ok) throw new Error('Erreur serveur');
    return res.json();
  })
  .then(data => {
    // 3. Mettre à jour avec les données reçues
    contact.blacklist_date = data.blacklist_date;
    contact.blacklist_motif = data.blacklist_motif;
    
    log.info('WORKFLOW_SUCCESS', { workflowId, contactId: contact.id, is_blacklisted: data.is_blacklisted });
    this.showNotification(`Contact ${contact.is_blacklisted ? 'blacklisté' : 'déblacklisté'}`);
  })
  .catch(error => {
    // 4. Rollback en cas d'erreur
    contact.is_blacklisted = previousStatus;
    log.error('WORKFLOW_ERROR', { workflowId, contactId: contact.id, error: error.message });
    this.showNotification('Erreur lors de la mise à jour', 'error');
  });
}
```

**Note importante:** Utilise `PUT /api/contacts/:id` (route CRUD générique) et non pas `POST /api/contacts/:id/blacklist` (route inexistante).
