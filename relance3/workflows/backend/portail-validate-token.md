# Workflow Backend : Portail - Valider Token

## Objectifs
- Valider un token magique de connexion portail
- Retourner les informations du contact associé
- Générer une session portail temporaire

## Base de données
- **SQLite** : `backend/data/marki.db`
- **Tables** : `contacts`, `impayes`, `portail_sessions`

## Data Models SQLite

### Table `portail_sessions` (à créer si non existante)

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | TEXT | Identifiant (psess_xxx) |
| `contact_id` | TEXT | ID du contact |
| `token` | TEXT | Token JWT portail |
| `ip_address` | TEXT | Adresse IP |
| `user_agent` | TEXT | User agent |
| `created_at` | TEXT | Date création |
| `expires_at` | TEXT | Date expiration (24h) |
| `last_activity` | TEXT | Dernière activité |

## Process

```javascript
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const JWT_SECRET = process.env.JWT_SECRET || 'votre-secret';
const PORTAIL_TOKEN_EXPIRES = '24h';

/**
 * Valider un token magique et créer une session portail
 * @param {string} magicToken - Token magique depuis l'URL
 * @param {string} ipAddress - Adresse IP du client
 * @param {string} userAgent - User agent du client
 * @returns {Object} Session et données contact
 */
async function validatePortailToken(magicToken, ipAddress, userAgent) {
  // Vérifier et décoder le token
  let decoded;
  try {
    decoded = jwt.verify(magicToken, JWT_SECRET);
  } catch (err) {
    throw new Error('TOKEN_INVALID');
  }
  
  // Vérifier le type de token
  if (decoded.type !== 'magic_link' && decoded.type !== 'portail') {
    throw new Error('TOKEN_INVALID_TYPE');
  }
  
  const contactId = decoded.contactId;
  
  // Récupérer le contact
  const contact = db.read('contacts', contactId);
  if (!contact) {
    throw new Error('CONTACT_NOT_FOUND');
  }
  
  // Vérifier si le contact est blacklisté
  if (contact.is_blacklisted) {
    throw new Error('CONTACT_BLACKLISTED');
  }
  
  // Générer un token de session portail
  const sessionToken = jwt.sign(
    { 
      sub: contactId,
      type: 'portail_session',
      sessionId: uuidv4()
    },
    JWT_SECRET,
    { expiresIn: PORTAIL_TOKEN_EXPIRES }
  );
  
  // Créer la session en base
  const sessionId = `psess_${uuidv4().slice(0, 8)}`;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  
  db.create('portail_sessions', {
    id: sessionId,
    contact_id: contactId,
    token: sessionToken,
    ip_address: ipAddress,
    user_agent: userAgent,
    created_at: now.toISOString(),
    expires_at: expiresAt.toISOString(),
    last_activity: now.toISOString()
  });
  
  // Logger l'accès
  logPortailAccess(contactId, 'LOGIN', ipAddress);
  
  return {
    sessionToken,
    expiresAt: expiresAt.toISOString(),
    contact: {
      id: contact.id,
      nom: contact.nom,
      prenom: contact.prenom,
      email: contact.email,
      civilite: contact.civilite
    }
  };
}

/**
 * Logger un accès au portail
 */
function logPortailAccess(contactId, action, ipAddress) {
  db.create('events', {
    id: `evt_${uuidv4().slice(0, 8)}`,
    type: 'portail_access',
    titre: `Portail: ${action}`,
    description: `Action: ${action}, IP: ${ipAddress}`,
    entity_type: 'contact',
    entity_id: contactId,
    by_marki: 0,
    created_at: new Date().toISOString()
  });
}
```

## Route API

```bash
POST /api/portail/validate-token

# cURL
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"token":"eyJhbGciOiJIUzI1NiIs..."}' \
  "http://localhost:5000/api/portail/validate-token"
```

## Input

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

## Output Success

```json
{
  "success": true,
  "sessionToken": "eyJhbGciOiJIUzI1NiIs...",
  "expiresAt": "2026-07-22T12:00:00Z",
  "contact": {
    "id": "contact_xxx",
    "nom": "Dupont",
    "prenom": "Jean",
    "email": "jean.dupont@example.com",
    "civilite": "M."
  }
}
```

## Output Error

```json
{
  "success": false,
  "error": "TOKEN_INVALID",
  "message": "Le lien de connexion est invalide ou a expiré"
}
```

## Codes Erreur

| Code | Description |
|------|-------------|
| `TOKEN_INVALID` | Token invalide ou expiré |
| `TOKEN_INVALID_TYPE` | Type de token incorrect |
| `CONTACT_NOT_FOUND` | Contact non trouvé |
| `CONTACT_BLACKLISTED` | Contact blacklisté |

## Sécurité

- Token magique valide 3 minutes (généré par `generate-contact-token`)
- Session portail valide 24h
- IP et User Agent enregistrés
- Log de toutes les connexions
