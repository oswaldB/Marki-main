# Workflow Backend : Portail - Logger Vue

## Objectifs
- Logger chaque vue du portail par un client
- Tracker les pages visitées et la durée
- Alimenter les statistiques d'engagement

## Base de données
- **SQLite** : `backend/data/marki.db`
- **Tables** : `portail_views` (à créer), `events`

## Data Models SQLite

### Table `portail_views`

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | TEXT | Identifiant (pview_xxx) |
| `contact_id` | TEXT | ID du contact |
| `session_id` | TEXT | ID de la session portail |
| `page` | TEXT | Page visitée (`mission`, `documents`, `relances`, etc.) |
| `referrer` | TEXT | Page source |
| `ip_address` | TEXT | Adresse IP |
| `user_agent` | TEXT | User agent |
| `duration` | INTEGER | Durée de visite en secondes |
| `created_at` | TEXT | Date de création |
| `updated_at` | TEXT | Date de mise à jour |

## Process

```javascript
const { v4: uuidv4 } = require('uuid');

/**
 * Logger une vue du portail
 * @param {string} contactId - ID du contact
 * @param {string} sessionId - ID de session
 * @param {Object} viewData - Données de la vue
 * @returns {Object} Enregistrement créé
 */
async function logPortailView(contactId, sessionId, viewData) {
  const {
    page,
    referrer = null,
    ipAddress,
    userAgent,
    duration = null
  } = viewData;
  
  const now = new Date().toISOString();
  const viewId = `pview_${uuidv4().slice(0, 8)}`;
  
  // Créer l'enregistrement
  db.create('portail_views', {
    id: viewId,
    contact_id: contactId,
    session_id: sessionId,
    page: page,
    referrer: referrer,
    ip_address: ipAddress,
    user_agent: userAgent,
    duration: duration,
    created_at: now,
    updated_at: now
  });
  
  // Mettre à jour les stats de la session
  db.run(`
    UPDATE portail_sessions 
    SET last_activity = ?
    WHERE id = ?
  `, [now, sessionId]);
  
  // Créer un événement pour la première vue de la session
  const sessionViews = db.query(`
    SELECT COUNT(*) as count 
    FROM portail_views 
    WHERE session_id = ?
  `, [sessionId]);
  
  if (sessionViews[0]?.count === 1) {
    // Première vue de la session
    db.create('events', {
      id: `evt_${uuidv4().slice(0, 8)}`,
      type: 'portail_session_start',
      titre: 'Début session portail',
      description: `Page: ${page}`,
      entity_type: 'contact',
      entity_id: contactId,
      by_marki: 0,
      created_at: now
    });
  }
  
  return { viewId, createdAt: now };
}

/**
 * Mettre à jour la durée d'une vue (appelé au départ de la page)
 */
async function updateViewDuration(viewId, duration) {
  db.update('portail_views', viewId, {
    duration: duration,
    updated_at: new Date().toISOString()
  });
}

/**
 * Récupérer les statistiques de vues d'un contact
 */
async function getPortailViewStats(contactId, period = '30d') {
  // Calculer la date de début
  const days = parseInt(period);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  // Nombre total de vues
  const totalViews = db.query(`
    SELECT COUNT(*) as count
    FROM portail_views
    WHERE contact_id = ? AND created_at >= ?
  `, [contactId, startDate.toISOString()]);
  
  // Vues par page
  const viewsByPage = db.query(`
    SELECT page, COUNT(*) as count
    FROM portail_views
    WHERE contact_id = ? AND created_at >= ?
    GROUP BY page
    ORDER BY count DESC
  `, [contactId, startDate.toISOString()]);
  
  // Sessions uniques
  const uniqueSessions = db.query(`
    SELECT COUNT(DISTINCT session_id) as count
    FROM portail_views
    WHERE contact_id = ? AND created_at >= ?
  `, [contactId, startDate.toISOString()]);
  
  // Durée moyenne
  const avgDuration = db.query(`
    SELECT AVG(duration) as avg_duration
    FROM portail_views
    WHERE contact_id = ? 
      AND created_at >= ?
      AND duration IS NOT NULL
  `, [contactId, startDate.toISOString()]);
  
  return {
    period,
    totalViews: totalViews[0]?.count || 0,
    uniqueSessions: uniqueSessions[0]?.count || 0,
    averageDuration: Math.round(avgDuration[0]?.avg_duration || 0),
    viewsByPage: viewsByPage.reduce((acc, v) => {
      acc[v.page] = v.count;
      return acc;
    }, {})
  };
}

/**
 * Récupérer l'historique de vues d'une session
 */
async function getSessionViews(sessionId) {
  return db.query(`
    SELECT 
      page,
      referrer,
      duration,
      created_at
    FROM portail_views
    WHERE session_id = ?
    ORDER BY created_at ASC
  `, [sessionId]);
}
```

## Routes API

```bash
# Logger une vue
POST /api/portail/log/view

# Mettre à jour la durée
PUT /api/portail/log/view/:viewId/duration

# Récupérer les stats (admin)
GET /api/portail/stats/views
```

## cURL Examples

```bash
# Logger une vue
curl -X POST \
  -H "Authorization: Bearer $PORTAIL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "page": "mission",
    "referrer": "login",
    "ipAddress": "192.168.1.1",
    "userAgent": "Mozilla/5.0..."
  }' \
  "http://localhost:5000/api/portail/log/view"

# Mettre à jour la durée
curl -X PUT \
  -H "Authorization: Bearer $PORTAIL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"duration": 120}' \
  "http://localhost:5000/api/portail/log/view/pview_xxx/duration"
```

## Input (Log View)

```json
{
  "page": "mission",
  "referrer": "login",
  "ipAddress": "192.168.1.1",
  "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)...",
  "duration": null
}
```

## Output (Log View)

```json
{
  "success": true,
  "viewId": "pview_abc123",
  "createdAt": "2026-07-21T12:00:00Z"
}
```

## Output (Stats)

```json
{
  "success": true,
  "stats": {
    "period": "30d",
    "totalViews": 15,
    "uniqueSessions": 5,
    "averageDuration": 180,
    "viewsByPage": {
      "mission": 8,
      "documents": 4,
      "relances": 3
    }
  }
}
```

## Pages Trackées

| Page | Description |
|------|-------------|
| `login` | Page de connexion |
| `mission` | Page mission/impayés |
| `documents` | Liste des documents |
| `relances` | Historique des relances |
| `paiement` | Initiation paiement |
| `message` | Envoi de message |
| `profil` | Profil utilisateur |

## Notes

- Les vues sont automatiquement liées à la session via le token
- La durée est calculée côté frontend et envoyée au changement de page
- Les stats sont agrégées pour le dashboard admin
