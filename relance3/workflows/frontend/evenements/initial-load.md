---
id: evenements-initial-load
type: frontend
folder: specs/workflows/frontend/evenements/
description: Charger l'historique des événements depuis PouchDB avec filtres
depends_on: [auth-check]
screen: evenements
global: false
mockup_entry: specs/mockups/evenements.html
---

# evenements-initial-load : Chargement initial Journal d'Événements

## Description

Charger l'historique des événements système depuis **PouchDB local** (synchronisations, relances, paiements, alertes, imports) avec filtres et pagination.

Les données sont synchronisées automatiquement avec CouchDB distant.

## Étapes

```javascript
/**
 * @action Initialiser PouchDB et le sync avec CouchDB
 * @checkpoint pouchdb-initialized, base events prête
 * 
 * Code:
 * this.dbEvents = new PouchDB('marki-events');
 * this.dbEvents.sync(remoteUrl, { live: true, retry: true });
 */

/**
 * @action Initialiser les filtres par défaut (type='', read='')
 * @checkpoint state-initialized, filtres et pagination prêts
 */

/**
 * @action Afficher le spinner de chargement
 * @checkpoint loading-shown, liste en chargement
 */

/**
 * @action Récupérer les événements via PouchDB
 * @checkpoint evenements-fetched, events reçus depuis PouchDB
 * 
 * Query:
 * const result = await dbEvents.allDocs({
 *   startkey: 'event:',
 *   endkey: 'event:\ufff0',
 *   include_docs: true,
 *   limit: 50
 * });
 */

/**
 * @action Configurer le listener pour les changements temps réel
 * @checkpoint changes-listener-active, nouveaux events ajoutés automatiquement
 * 
 * Code:
 * dbEvents.changes({ since: 'now', live: true, include_docs: true })
 *   .on('change', (change) => { this.handleEventChange(change.doc) });
 */

/**
 * @action Extraire les types d'événements uniques pour le filtre
 * @checkpoint types-extracted, options de filtrage par type calculées
 * 
 * Calcul:
 * const types = [...new Set(events.map(e => e.event_type))];
 */

/**
 * @action Stocker les données dans Alpine.store('evenements')
 * @checkpoint data-stored, événements et types disponibles
 */

/**
 * @action Rendre la liste avec icônes par type et indicateur non lu
 * @checkpoint list-rendered, events colorés par type avec badge "Nouveau" si non lu
 */

/**
 * @action Activer le bouton "Charger plus" pour pagination
 * @checkpoint load-more-enabled, bouton de pagination fonctionnel (skip=50, etc.)
 */
```

## PouchDB Operations

### Initialisation

```javascript
async initEventsDB() {
  // Créer la base PouchDB pour les événements
  this.dbEvents = new PouchDB('marki-events');
  
  // Sync avec CouchDB distant
  const remoteUrl = 'https://admin:admin@dev.markidiags.com/data/marki-events';
  this.dbEvents.sync(remoteUrl, {
    live: true,
    retry: true
  });
  
  // Charger l'état "lu" depuis localStorage
  this.readEvents = JSON.parse(localStorage.getItem('marki_read_events') || '{}');
}
```

### Charger les événements

```javascript
async loadEvents() {
  this.loading = true;
  
  try {
    const result = await this.dbEvents.allDocs({
      startkey: 'event:',
      endkey: 'event:\ufff0',
      include_docs: true,
      limit: 50
    });
    
    // Transformer les documents PouchDB
    this.events = result.rows
      .map(row => row.doc)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .map(event => ({
        ...event,
        time: this.formatRelativeDate(event.created_at),
        isRead: !!this.readEvents[event.id]
      }));
    
    // Extraire les types uniques pour le filtre
    this.eventTypes = [...new Set(this.events.map(e => e.event_type))];
    
  } catch (error) {
    console.error('Erreur chargement events:', error);
    this.error = error.message;
  } finally {
    this.loading = false;
  }
}
```

### Live Sync (temps réel)

```javascript
// Écouter les nouveaux événements
dbEvents.changes({
  since: 'now',
  live: true,
  include_docs: true
}).on('change', (change) => {
  if (change.doc.type === 'event') {
    // Ajouter le nouvel event en haut de la liste
    const newEvent = {
      ...change.doc,
      time: "À l'instant",
      isRead: !!this.readEvents[change.doc.id]
    };
    this.events.unshift(newEvent);
  }
});
```

### Pagination (Charger plus)

```javascript
async loadMoreEvents() {
  if (this.loadingMore) return;
  
  this.loadingMore = true;
  
  try {
    const currentCount = this.events.length;
    
    const result = await this.dbEvents.allDocs({
      startkey: 'event:',
      endkey: 'event:\ufff0',
      include_docs: true,
      limit: 50,
      skip: currentCount
    });
    
    const newEvents = result.rows
      .map(row => row.doc)
      .map(event => ({
        ...event,
        time: this.formatRelativeDate(event.created_at),
        isRead: !!this.readEvents[event.id]
      }));
    
    // Ajouter à la liste existante
    this.events.push(...newEvents);
    
  } catch (error) {
    console.error('Erreur chargement plus:', error);
  } finally {
    this.loadingMore = false;
  }
}
```

### Filtrer par type (côté client)

```javascript
async filterByType(type) {
  this.filterType = type;
  
  // Recharger depuis PouchDB avec filtre côté client
  const result = await this.dbEvents.allDocs({
    startkey: 'event:',
    endkey: 'event:\ufff0',
    include_docs: true
  });
  
  this.events = result.rows
    .map(row => row.doc)
    .filter(e => !type || e.event_type === type)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 50)
    .map(event => ({
      ...event,
      time: this.formatRelativeDate(event.created_at),
      isRead: !!this.readEvents[event.id]
    }));
}
```

## Structure des données PouchDB (type 'event')

```javascript
{
  "_id": "event:550e8400-e29b-41d4-a716-446655440000",
  "_rev": "1-abc123...",
  "type": "event",
  "id": "evt-001",
  "user_id": "user-123",
  "event_type": "sync",  // 'sync' | 'payment' | 'relance' | 'alert' | 'import'
  "title": "Synchronisation terminée",
  "description": "15 factures importées",
  "icon": "fa-sync-alt",
  "metadata": {
    "facture_id": "facture-123",
    "contact_id": "contact-456",
    "montant": 15000,
    "count": 15
  },
  "created_at": "2024-01-15T09:30:00Z",
  "by_marki": true,
  "user_username": null
}
```

## Types d'événements extraits

Les types sont extraits automatiquement des documents PouchDB :

```javascript
// Extraction des types uniques
const eventTypes = [...new Set(events.map(e => e.event_type))];
// Résultat: ['sync', 'payment', 'relance', 'alert', 'import', ...]
```

## Mockups de référence

- `specs/mockups/evenements.html`

---

## Migration depuis l'ancienne API

| Aspect | Avant (API) | Après (PouchDB) |
|--------|-------------|-----------------|
| Source | `GET /api/events?limit=50` | PouchDB local |
| Types | `GET /api/events/types` | Extraits côté client (`[...new Set()]`) |
| Filtrage type | `GET /api/events?type=sync` | Filtrage côté client |
| Filtrage lu | `GET /api/events?read=false` | Filtrage côté client sur localStorage |
| Pagination | `skip` paramètre | `skip` option PouchDB |
| Temps réel | Polling/WebSocket | `db.changes({ live: true })` |
| Latence | ~200-500ms | ~10-50ms (local) |
| Offline | ❌ Impossible | ✅ Fonctionne offline |
