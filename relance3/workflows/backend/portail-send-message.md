# Workflow Backend : Portail - Envoyer Message

## Objectifs
- Permettre au client d'envoyer un message depuis le portail
- Notifier l'équipe Marki du nouveau message
- Créer un événement traçable

## Base de données
- **SQLite** : `backend/data/marki.db`
- **Tables** : `portail_messages`, `events`, `contacts`

## Data Models SQLite

### Table `portail_messages`

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | TEXT | Identifiant (pmsg_xxx) |
| `contact_id` | TEXT | ID du contact émetteur |
| `sujet` | TEXT | Sujet du message |
| `contenu` | TEXT | Contenu du message |
| `type` | TEXT | Type: `general`, `question_facture`, `demande_echeancier`, etc. |
| `statut` | TEXT | `nouveau`, `lu`, `repondu`, `clos` |
| `impaye_ids` | TEXT | IDs des impayés concernés (JSON) |
| `admin_response` | TEXT | Réponse de l'admin |
| `admin_response_at` | TEXT | Date de la réponse |
| `created_at` | TEXT | Date de création |
| `updated_at` | TEXT | Date de mise à jour |

## Process

```javascript
const { v4: uuidv4 } = require('uuid');

/**
 * Envoyer un message depuis le portail
 * @param {string} contactId - ID du contact
 * @param {Object} messageData - Données du message
 * @returns {Object} Message créé
 */
async function sendPortailMessage(contactId, messageData) {
  const {
    sujet,
    contenu,
    type = 'general',
    impayeIds = []
  } = messageData;
  
  // Validation
  if (!sujet || sujet.trim().length === 0) {
    throw new Error('SUJET_REQUIRED');
  }
  
  if (!contenu || contenu.trim().length === 0) {
    throw new Error('CONTENU_REQUIRED');
  }
  
  if (contenu.length > 5000) {
    throw new Error('CONTENU_TOO_LONG');
  }
  
  // Vérifier que les impayés appartiennent bien au contact
  if (impayeIds.length > 0) {
    for (const impayeId of impayeIds) {
      const impaye = db.read('impayes', impayeId);
      if (!impaye || impaye.contact_relance_id !== contactId) {
        throw new Error('IMPAYE_UNAUTHORIZED');
      }
    }
  }
  
  // Récupérer le contact
  const contact = db.read('contacts', contactId);
  if (!contact) {
    throw new Error('CONTACT_NOT_FOUND');
  }
  
  // Créer le message
  const messageId = `pmsg_${uuidv4().slice(0, 8)}`;
  const now = new Date().toISOString();
  
  db.create('portail_messages', {
    id: messageId,
    contact_id: contactId,
    sujet: sujet.trim(),
    contenu: contenu.trim(),
    type: type,
    statut: 'nouveau',
    impaye_ids: JSON.stringify(impayeIds),
    admin_response: null,
    admin_response_at: null,
    created_at: now,
    updated_at: now
  });
  
  // Créer un événement pour notification admin
  db.create('events', {
    id: `evt_${uuidv4().slice(0, 8)}`,
    type: 'portail_message',
    titre: `Nouveau message portail: ${sujet.substring(0, 50)}...`,
    description: `De: ${contact.prenom} ${contact.nom} (${contact.email})\nType: ${type}`,
    entity_type: 'portail_message',
    entity_id: messageId,
    who_id: contactId,
    by_marki: 0,
    metadata: JSON.stringify({
      messageId,
      type,
      hasImpayes: impayeIds.length > 0
    }),
    created_at: now
  });
  
  // Envoyer notification email aux admins (async)
  notifyAdminsNewMessage(contact, messageId, sujet, type);
  
  return {
    id: messageId,
    statut: 'nouveau',
    createdAt: now
  };
}

/**
 * Récupérer les messages d'un contact
 */
async function getContactMessages(contactId, options = {}) {
  const { limit = 20, offset = 0, statut } = options;
  
  let whereClause = 'WHERE contact_id = ?';
  const params = [contactId];
  
  if (statut) {
    whereClause += ' AND statut = ?';
    params.push(statut);
  }
  
  const messages = db.query(`
    SELECT 
      id,
      sujet,
      contenu,
      type,
      statut,
      impaye_ids,
      admin_response,
      admin_response_at,
      created_at,
      updated_at
    FROM portail_messages
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `, [...params, limit, offset]);
  
  const countResult = db.query(`
    SELECT COUNT(*) as total FROM portail_messages ${whereClause}
  `, params);
  
  return {
    messages: messages.map(m => ({
      ...m,
      impayeIds: JSON.parse(m.impaye_ids || '[]'),
      hasResponse: m.admin_response !== null
    })),
    pagination: {
      total: countResult[0]?.total || 0,
      limit,
      offset,
      hasMore: offset + limit < (countResult[0]?.total || 0)
    }
  };
}

/**
 * Répondre à un message (admin)
 */
async function respondToMessage(messageId, adminId, response) {
  const message = db.read('portail_messages', messageId);
  if (!message) {
    throw new Error('MESSAGE_NOT_FOUND');
  }
  
  const now = new Date().toISOString();
  
  db.update('portail_messages', messageId, {
    admin_response: response,
    admin_response_at: now,
    statut: 'repondu',
    updated_at: now
  });
  
  // Créer événement pour notifier le client
  db.create('events', {
    id: `evt_${uuidv4().slice(0, 8)}`,
    type: 'portail_message_response',
    titre: 'Réponse à votre message',
    description: `Sujet: ${message.sujet}`,
    entity_type: 'portail_message',
    entity_id: messageId,
    who_id: message.contact_id,
    by_marki: 1,
    created_at: now
  });
  
  return { success: true, respondedAt: now };
}

/**
 * Notifier les admins d'un nouveau message
 */
async function notifyAdminsNewMessage(contact, messageId, sujet, type) {
  // Intégration avec le système de notifications/email
  // Exemple: envoyer un email aux admins
  const emailData = {
    to: process.env.ADMIN_NOTIFICATION_EMAIL,
    subject: `[Portail] Nouveau message de ${contact.prenom} ${contact.nom}`,
    body: `
      Nouveau message reçu via le portail client.
      
      De: ${contact.prenom} ${contact.nom} (${contact.email})
      Type: ${type}
      Sujet: ${sujet}
      
      Voir le message: ${process.env.ADMIN_URL}/messages/${messageId}
    `
  };
  
  // Envoi asynchrone
  // await sendEmail(emailData);
}
```

## Routes API

```bash
# Envoyer un message
POST /api/portail/messages

# Lister ses messages
GET /api/portail/messages

# Voir un message
GET /api/portail/messages/:messageId

# Répondre (admin uniquement)
POST /api/admin/portail/messages/:messageId/respond
```

## cURL Examples

```bash
# Envoyer un message
curl -X POST \
  -H "Authorization: Bearer $PORTAIL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sujet": "Question sur ma facture FACT-2026-001",
    "contenu": "Bonjour, je souhaiterais un détail sur...",
    "type": "question_facture",
    "impayeIds": ["impaye_001"]
  }' \
  "http://localhost:5000/api/portail/messages"

# Lister ses messages
curl -X GET \
  -H "Authorization: Bearer $PORTAIL_TOKEN" \
  "http://localhost:5000/api/portail/messages?limit=10"
```

## Input

```json
{
  "sujet": "Demande d'échéancier",
  "contenu": "Bonjour, je souhaiterais échelonner le paiement de mes factures sur 3 mois...",
  "type": "demande_echeancier",
  "impayeIds": ["impaye_001", "impaye_002"]
}
```

## Types de Messages

| Type | Description |
|------|-------------|
| `general` | Question générale |
| `question_facture` | Question sur une facture spécifique |
| `demande_echeancier` | Demande de paiement échelonné |
| `erreur_facture` | Signalement d'erreur sur facture |
| `autre` | Autre sujet |

## Output (Send)

```json
{
  "success": true,
  "message": {
    "id": "pmsg_abc123",
    "statut": "nouveau",
    "createdAt": "2026-07-21T12:00:00Z"
  }
}
```

## Output (List)

```json
{
  "success": true,
  "messages": [
    {
      "id": "pmsg_abc123",
      "sujet": "Demande d'échéancier",
      "contenu": "Bonjour...",
      "type": "demande_echeancier",
      "statut": "repondu",
      "impayeIds": ["impaye_001"],
      "adminResponse": "Bonjour, nous avons bien pris en compte...",
      "adminResponseAt": "2026-07-21T14:30:00Z",
      "hasResponse": true,
      "createdAt": "2026-07-21T12:00:00Z"
    }
  ],
  "pagination": {
    "total": 3,
    "limit": 20,
    "offset": 0,
    "hasMore": false
  }
}
```

## Codes Erreur

| Code | Description |
|------|-------------|
| `SUJET_REQUIRED` | Sujet obligatoire |
| `CONTENU_REQUIRED` | Contenu obligatoire |
| `CONTENU_TOO_LONG` | Contenu dépasse 5000 caractères |
| `IMPAYE_UNAUTHORIZED` | Impayé ne correspond pas au contact |
| `CONTACT_NOT_FOUND` | Contact non trouvé |

## Statuts

| Statut | Description |
|--------|-------------|
| `nouveau` | Message reçu, non lu |
| `lu` | Message lu par un admin |
| `repondu` | Réponse envoyée au client |
| `clos` | Discussion clôturée |
