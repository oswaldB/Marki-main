# Workflow Backend : Portail - Déconnexion

## Objectifs
- Invalider la session portail active
- Logger la déconnexion
- Optionnellement: archiver les données de session

## Base de données
- **SQLite** : `backend/data/marki.db`
- **Tables** : `portail_sessions`, `events`

## Process

```javascript
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const JWT_SECRET = process.env.JWT_SECRET || 'votre-secret';

/**
 * Déconnecter une session portail
 * @param {string} sessionToken - Token de session
 * @param {string} ipAddress - Adresse IP
 * @returns {Object} Résultat de la déconnexion
 */
async function portailLogout(sessionToken, ipAddress) {
  // Décoder le token pour récupérer l'ID de session
  let decoded;
  try {
    decoded = jwt.verify(sessionToken, JWT_SECRET);
  } catch (err) {
    // Token déjà invalide, on considère la déconnexion comme réussie
    return { success: true, alreadyInvalid: true };
  }
  
  const sessionId = decoded.sessionId;
  const contactId = decoded.sub;
  
  if (!sessionId || decoded.type !== 'portail_session') {
    return { success: false, error: 'INVALID_SESSION_TYPE' };
  }
  
  // Récupérer la session
  const session = db.read('portail_sessions', sessionId);
  
  if (!session) {
    // Session déjà supprimée
    return { success: true, alreadyInvalid: true };
  }
  
  // Vérifier que le token correspond
  if (session.token !== sessionToken) {
    return { success: false, error: 'TOKEN_MISMATCH' };
  }
  
  // Calculer la durée de la session
  const sessionStart = new Date(session.created_at);
  const sessionEnd = new Date();
  const duration = Math.round((sessionEnd - sessionStart) / 1000); // en secondes
  
  // Archiver la session (optionnel)
  archiveSession(session, duration);
  
  // Supprimer la session active
  db.delete('portail_sessions', sessionId);
  
  // Logger la déconnexion
  db.create('events', {
    id: `evt_${uuidv4().slice(0, 8)}`,
    type: 'portail_access',
    titre: 'Portail: LOGOUT',
    description: `Session terminée. Durée: ${duration}s, IP: ${ipAddress}`,
    entity_type: 'contact',
    entity_id: contactId,
    by_marki: 0,
    created_at: sessionEnd.toISOString()
  });
  
  return {
    success: true,
    sessionDuration: duration,
    logoutTime: sessionEnd.toISOString()
  };
}

/**
 * Archiver une session terminée
 */
function archiveSession(session, duration) {
  const archiveId = `psess_arch_${uuidv4().slice(0, 8)}`;
  
  db.create('portail_sessions_archive', {
    id: archiveId,
    original_id: session.id,
    contact_id: session.contact_id,
    ip_address: session.ip_address,
    user_agent: session.user_agent,
    created_at: session.created_at,
    ended_at: new Date().toISOString(),
    duration_seconds: duration
  });
}

/**
 * Déconnecter toutes les sessions d'un contact (force logout)
 */
async function logoutAllContactSessions(contactId) {
  const sessions = db.query(`
    SELECT * FROM portail_sessions WHERE contact_id = ?
  `, [contactId]);
  
  for (const session of sessions) {
    db.delete('portail_sessions', session.id);
    
    // Logger
    db.create('events', {
      id: `evt_${uuidv4().slice(0, 8)}`,
      type: 'portail_access',
      titre: 'Portail: FORCE_LOGOUT',
      description: `Session ${session.id} terminée par admin`,
      entity_type: 'contact',
      entity_id: contactId,
      by_marki: 1,
      created_at: new Date().toISOString()
    });
  }
  
  return { success: true, sessionsTerminated: sessions.length };
}

/**
 * Vérifier si une session est encore valide
 */
async function checkSessionValidity(sessionToken) {
  try {
    const decoded = jwt.verify(sessionToken, JWT_SECRET);
    
    if (decoded.type !== 'portail_session') {
      return { valid: false, reason: 'INVALID_TYPE' };
    }
    
    const session = db.read('portail_sessions', decoded.sessionId);
    
    if (!session) {
      return { valid: false, reason: 'SESSION_NOT_FOUND' };
    }
    
    if (session.token !== sessionToken) {
      return { valid: false, reason: 'TOKEN_MISMATCH' };
    }
    
    // Vérifier expiration
    const expiresAt = new Date(session.expires_at);
    if (expiresAt < new Date()) {
      return { valid: false, reason: 'EXPIRED' };
    }
    
    return { valid: true, contactId: decoded.sub };
  } catch (err) {
    return { valid: false, reason: 'TOKEN_INVALID' };
  }
}
```

## Routes API

```bash
# Déconnexion normale
POST /api/portail/logout

# Vérifier validité session (ping)
GET /api/portail/session/check

# Déconnexion forcée (admin uniquement)
POST /api/admin/portail/logout-all/:contactId
```

## cURL Examples

```bash
# Déconnexion
curl -X POST \
  -H "Authorization: Bearer $PORTAIL_TOKEN" \
  "http://localhost:5000/api/portail/logout"

# Vérifier session
curl -X GET \
  -H "Authorization: Bearer $PORTAIL_TOKEN" \
  "http://localhost:5000/api/portail/session/check"
```

## Output (Logout Success)

```json
{
  "success": true,
  "sessionDuration": 3600,
  "logoutTime": "2026-07-21T13:00:00Z"
}
```

## Output (Session Check)

```json
{
  "valid": true,
  "expiresAt": "2026-07-22T12:00:00Z"
}
```

## Codes Erreur

| Code | Description |
|------|-------------|
| `INVALID_SESSION_TYPE` | Type de session incorrect |
| `TOKEN_MISMATCH` | Token ne correspond pas à la session |
| `TOKEN_INVALID` | Token invalide ou expiré |
| `SESSION_NOT_FOUND` | Session inexistante |

## Notes

- La déconnexion est idempotente (réussit même si déjà déconnecté)
- Les sessions expirées sont automatiquement nettoyées par un cron
- L'archivage permet de conserver les stats d'utilisation
