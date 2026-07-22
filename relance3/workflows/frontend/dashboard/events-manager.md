---
id: dashboard-events-manager
type: frontend
folder: specs/workflows/frontend/dashboard/
description: Gérer les événements récents - récupération depuis PouchDB, synchronisation localStorage, états lu/non-lu
depends_on: [auth-check]
screen: dashboard
global: false
mockup_entry: specs/mockups/dashboard.html
---

# Events Manager - Gestion des Événements

## Description

Workflow complet pour la gestion des événements récents du dashboard via **PouchDB** :
- Récupération des événements depuis la base PouchDB locale
- Synchronisation bidirectionnelle avec localStorage (état lu/non-lu)
- **Affichage de tous les événements** avec indicateur lu/non-lu (pastille)
- Marquage individuel ou global comme lu

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  PouchDB    │────▶│   Alpine.js  │◀───▶│ localStorage│
│   events    │     │   State      │     │  readEvents │
└─────────────┘     └──────────────┘     └─────────────┘
                            │
                            ▼
                     ┌──────────────┐
                     │     UI       │
                     │ - Liste      │
                     │ - Badge      │
                     │ - Marquer lu │
                     └──────────────┘
```

## Étapes

```javascript
/**
 * @action Initialiser PouchDB et localStorage
 * @checkpoint pouchdb-initialized, événements lus restaurés
 * 
 * Code:
 * this.db = new PouchDB('marki-events');
 * const readEvents = JSON.parse(localStorage.getItem('marki_read_events') || '{}');
 * this.readEvents = readEvents;
 */

/**
 * @action Configurer le sync temps réel depuis PouchDB
 * @checkpoint changes-listener-active, sync activé
 * 
 * Code:
 * this.db.changes({ since: 'now', live: true, include_docs: true })
 *   .on('change', (change) => { this.handleEventChange(change.doc); });
 */

/**
 * @action Récupérer les événements depuis PouchDB
 * @checkpoint events-fetched, données locales chargées
 * 
 * Requête: db.allDocs({ startkey: 'event:', endkey: 'event:\ufff0', limit: 20 })
 */

/**
 * @action Transformer les événements avec format dates
 * @checkpoint events-formatted, dates relatives calculées
 * 
 * Format date relatif:
 * - < 1 min: "À l'instant"
 * - < 1h: "Il y a X minutes"
 * - < 24h: "Il y a X heures"
 * - Hier: "Hier à HH:MM"
 * - < 7j: "Il y a X jours"
 * - Sinon: "Le DD/MM/YYYY à HH:MM"
 */

/**
 * @action Calculer les événements avec leur état lu/non-lu
 * @checkpoint events-with-read-state-calculated, chaque event a sa propriété isRead
 * 
 * Code:
 * this.eventsWithReadState = this.events.map(event => ({
 *   ...event,
 *   isRead: !!this.readEvents[event.id]
 * }));
 */

/**
 * @action Calculer le nombre d'événements non lus
 * @checkpoint unread-count-calculated, badge count prêt
 * 
 * Code:
 * this.unreadCount = this.events.filter(event => !this.readEvents[event.id]).length;
 */

/**
 * @action Afficher le badge "non lus" si count > 0
 * @checkpoint badge-displayed, badge rouge affiché avec nombre
 */

/**
 * @action Au clic sur "Marquer comme lu" - sauvegarder dans localStorage
 * @checkpoint events-marked-as-read, tous les events marqués comme lus
 * 
 * Code:
 * markAllAsRead() {
 *   const now = new Date().toISOString();
 *   this.events.forEach(event => {
 *     this.readEvents[event.id] = { read: true, readAt: now };
 *   });
 *   localStorage.setItem('marki_read_events', JSON.stringify(this.readEvents));
 *   // Force recalcul pour mettre à jour les pastilles
 *   this.events = [...this.events];
 * }
 */

/**
 * @action Au clic sur l'icône ✓ d'un event - marquer seul comme lu
 * @checkpoint single-event-marked-as-read, event spécifique marqué
 * 
 * Code:
 * markEventAsRead(eventId) {
 *   this.readEvents[eventId] = { 
 *     read: true, 
 *     readAt: new Date().toISOString() 
 *   };
 *   localStorage.setItem('marki_read_events', JSON.stringify(this.readEvents));
 *   // Force recalcul pour masquer la pastille
 *   this.events = [...this.events];
 * }
 */

/**
 * @action Rafraîchir la liste (events se met à jour automatiquement)
 * @checkpoint list-refreshed, pastilles mises à jour
 */

/**
 * @action Mettre à jour le badge (count = 0)
 * @checkpoint badge-updated, badge disparaît ou affiche 0
 */
```

## PouchDB Operations

### Initialisation

```javascript
// Créer la base PouchDB pour les événements
const eventsDb = new PouchDB('marki-events');

// Sync avec CouchDB distant (optionnel)
eventsDb.sync('https://admin:admin@dev.markidiags.com/data/marki-events', {
  live: true,
  retry: true
});
```

### Récupérer les événements

```javascript
// Charger les 20 derniers événements
async loadEvents() {
  try {
    const result = await eventsDb.allDocs({
      startkey: 'event:',
      endkey: 'event:\ufff0',
      include_docs: true,
      limit: 20
    });
    
    this.events = result.rows
      .map(row => row.doc)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .map(event => ({
        ...event,
        time: this.formatRelativeDate(event.created_at),
        icon: this.getIconForType(event.type)
      }));
      
  } catch (error) {
    console.error('Failed to load events:', error);
  }
}
```

### Live Sync (temps réel)

```javascript
// Écouter les nouveaux événements
eventsDb.changes({
  since: 'now',
  live: true,
  include_docs: true
}).on('change', (change) => {
  if (change.doc.type === 'event') {
    // Ajouter le nouvel événement en haut de la liste
    const newEvent = {
      ...change.doc,
      time: "À l'instant",
      icon: this.getIconForType(change.doc.type)
    };
    this.events.unshift(newEvent);
    
    // Notification sonore ou toast
    this.showNotification(newEvent);
  }
});
```

## Structure des données

### Événement PouchDB (type 'event')

```javascript
{
  "_id": "event:550e8400-e29b-41d4-a716-446655440000",
  "_rev": "1-abc123def456",
  "type": "event",
  "id": "evt-001",
  "event_type": "relance",  // 'sync', 'payment', 'relance', 'alert', etc.
  "title": "Relance R2 envoyée",
  "description": "Relance niveau 2 envoyée à TechStart SARL...",
  "created_at": "2024-01-15T10:30:00Z",
  "user_id": null,
  "user_username": null,
  "by_marki": true
}
```

### Événement Frontend (transformé)

```javascript
{
  _id: "event:550e8400-...",
  _rev: "1-abc...",
  type: "event",
  id: "evt-001",
  event_type: "relance",
  icon: "fa-paper-plane",  // FontAwesome class
  title: "Relance R2 envoyée",
  description: "Relance niveau 2 envoyée à TechStart SARL...",
  time: "Il y a 2 heures",  // Format relatif
  created_at: "2024-01-15T10:30:00Z",
  user_id: null,
  user_username: null,
  by_marki: true
}
```

### localStorage : marki_read_events

```javascript
{
  "evt-001": { read: true, readAt: "2024-01-15T10:30:00Z" },
  "evt-002": { read: true, readAt: "2024-01-15T11:15:00Z" }
}
```

## PouchDB Queries

### Récupération des événements

```javascript
// Option 1: allDocs (rapide)
const result = await eventsDb.allDocs({
  startkey: 'event:',
  endkey: 'event:\ufff0',
  include_docs: true,
  limit: 20
});

// Option 2: Mango query avec pouchdb-find
const result = await eventsDb.find({
  selector: { type: { $eq: 'event' } },
  sort: [{ created_at: 'desc' }],
  limit: 20
});
```

### Créer l'index Mango (optionnel)

```javascript
// Créer un index pour optimiser les requêtes par date
await eventsDb.createIndex({
  index: {
    fields: ['type', 'created_at']
  },
  name: 'idx-events-by-date'
});
```

## Computed Properties

### `unreadCount`

```javascript
// Nombre d'événements non lus (pour le badge)
get unreadCount() {
  return this.events.filter(event => !this.readEvents[event.id]).length;
}
```

### `hasUnreadEvents`

```javascript
// Boolean pour afficher/masquer le badge
get hasUnreadEvents() {
  return this.unreadCount > 0;
}
```

### `isEventRead(eventId)` (méthode utilitaire)

```javascript
// Vérifie si un event est lu
isEventRead(eventId) {
  return !!this.readEvents[eventId];
}
```

## Méthodes

### `loadEvents()`

```javascript
async loadEvents() {
  try {
    const result = await eventsDb.allDocs({
      startkey: 'event:',
      endkey: 'event:\ufff0',
      include_docs: true,
      limit: 20
    });
    
    this.events = result.rows
      .map(row => row.doc)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .map(event => ({
        ...event,
        time: this.formatRelativeDate(event.created_at),
        icon: this.getIconForType(event.type)
      }));
  } catch (error) {
    console.error('Failed to load events:', error);
  }
}
```

### `markAllAsRead()`

```javascript
markAllAsRead() {
  const now = new Date().toISOString();
  
  // Marquer tous les events non lus comme lus
  this.events.forEach(event => {
    if (!this.readEvents[event.id]) {
      this.readEvents[event.id] = { read: true, readAt: now };
    }
  });
  
  // Sauvegarder dans localStorage
  localStorage.setItem('marki_read_events', JSON.stringify(this.readEvents));
  
  // Forcer le recalcul pour mettre à jour les pastilles
  this.events = [...this.events];
}
```

### `markEventAsRead(eventId)`

```javascript
markEventAsRead(eventId) {
  if (!this.readEvents[eventId]) {
    this.readEvents[eventId] = { 
      read: true, 
      readAt: new Date().toISOString() 
    };
    localStorage.setItem('marki_read_events', JSON.stringify(this.readEvents));
    // Forcer le recalcul pour masquer la pastille de cet event
    this.events = [...this.events];
  }
}
```

### `clearReadHistory()`

```javascript
// Pour debug ou reset complet
clearReadHistory() {
  localStorage.removeItem('marki_read_events');
  this.readEvents = {};
  this.events = [...this.events]; // Rafraîchir
}
```

## Utilitaires

### Formatage des dates relatives

```javascript
formatRelativeDate(isoDate) {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  // Hier à HH:MM
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();
  
  if (diffMins < 1) return "À l'instant";
  if (diffMins < 60) return `Il y a ${diffMins} minute${diffMins > 1 ? 's' : ''}`;
  if (diffHours < 24) return `Il y a ${diffHours} heure${diffHours > 1 ? 's' : ''}`;
  if (isYesterday) return `Hier à ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
  if (diffDays < 7) return `Il y a ${diffDays} jour${diffDays > 1 ? 's' : ''}`;
  
  return `Le ${date.toLocaleDateString('fr-FR')} à ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
}
```

### Mapping icônes

```javascript
getIconForType(type) {
  const icons = {
    sync: 'fa-sync-alt',
    payment: 'fa-check-circle',
    relance: 'fa-paper-plane',
    alert: 'fa-exclamation-circle',
    import: 'fa-file-import',
    relance_cleaned: 'fa-broom',
    contact_blacklisted: 'fa-ban',
    payment_suspended: 'fa-pause-circle'
  };
  return icons[type] || 'fa-info-circle';
}
```

## Interface utilisateur

### Badge "Non lus" (Header)

| Élément | Sélecteur | Condition |
|---------|-----------|-----------|
| Badge rouge | `.event-badge` | `x-show="hasUnreadEvents"` |
| Nombre | `.event-badge-count` | `x-text="unreadCount"` |

### Liste des événements (Tous affichés)

| Élément | Sélecteur | Condition |
|---------|-----------|-----------|
| Container | `.events-list` | `x-show="events.length > 0"` |
| Événement | `.event-item` | Boucle sur `events` (tous visibles) |
| Pastille non-lu | `.event-unread-dot` | `x-show="!isEventRead(event.id)"` |
| État lu | `.event-read` | Opacité réduite ou fond différent |
| Empty state | `.events-empty` | `x-show="events.length === 0"` |

### Bouton "Marquer comme lu" (Global)

| Élément | Action |
|---------|--------|
| Bouton header | `@click="markAllAsRead()"` |
| Texte | "Marquer comme lu" |
| État disabled | `:disabled="!hasUnreadEvents"` |

### Bouton "Marquer comme lu" (Par Event)

| Élément | Sélecteur | Action |
|---------|-----------|--------|
| Icône check | `.event-check-btn` | `@click="markEventAsRead(event.id)"` |
| Apparition | - | Visible au hover de l'event |
| Tooltip | - | "Marquer comme lu" |

### Indicateur "Non Lu" (Pastille)

| Élément | Description |
|---------|-------------|
| Pastille bleue/rouge | Petit point à côté du titre ou de l'icône |
| Style | `bg-sky-500`, taille `8px`, position absolue |
| Condition | Visible uniquement si `!isEventRead(event.id)` |

### Item Event (Structure complète)

```html
<div 
  class="event-item" 
  :class="{ 'event-read': isEventRead(event.id), 'event-unread': !isEventRead(event.id) }"
  x-data="{ hovered: false }"
  @mouseenter="hovered = true" 
  @mouseleave="hovered = false"
>
  <!-- Icône type avec pastille non-lu -->
  <div class="event-icon relative">
    <i class="fas" :class="event.icon"></i>
    <!-- Pastille non-lu -->
    <span 
      x-show="!isEventRead(event.id)"
      class="absolute -top-1 -right-1 w-2 h-2 bg-sky-500 rounded-full"
    ></span>
  </div>
  
  <!-- Contenu -->
  <div class="event-content flex-1">
    <!-- Titre avec indicateur non-lu -->
    <div class="flex items-center gap-2">
      <p class="event-title font-medium" x-text="event.title"></p>
      <!-- Pastille texte -->
      <span 
        x-show="!isEventRead(event.id)"
        class="px-1.5 py-0.5 bg-sky-100 text-sky-700 text-[10px] rounded-full"
      >
        Non lu
      </span>
    </div>
    <p class="event-description text-sm text-slate-500" x-text="event.description"></p>
    <div class="event-meta flex items-center gap-2 mt-1">
      <span class="event-time text-xs text-slate-400" x-text="event.time"></span>
      <span class="text-slate-300">·</span>
      <span class="event-author text-xs" x-text="event.by_marki ? 'Marki' : '@' + event.user_username"></span>
    </div>
  </div>
  
  <!-- Bouton marquer comme lu (visible au hover) -->
  <button 
    x-show="hovered"
    @click="markEventAsRead(event.id)"
    class="event-check-btn ml-2 p-1.5 text-slate-400 hover:text-sky-600"
    title="Marquer comme lu"
  >
    <i class="fas fa-check text-xs"></i>
  </button>
</div>
```

### Styles CSS suggérés

```css
.event-item {
  @apply flex items-start gap-3 px-6 py-3 hover:bg-slate-50/50 transition-colors;
}

.event-item.event-unread {
  @apply bg-sky-50/30; /* Légère différence de fond pour non-lus */
}

.event-item.event-read {
  @apply opacity-75; /* Légèrement atténué quand lu */
}

.event-icon {
  @apply w-8 h-8 rounded-full flex items-center justify-center relative;
}
```

## State Alpine.js

```javascript
{
  // Données
  events: [],           // Tous les événements récupérés (affichés tous)
  readEvents: {},      // Map des events lus (depuis localStorage)
  db: null,            // Instance PouchDB
  
  // Computed
  get unreadCount() { 
    return this.events.filter(e => !this.readEvents[e.id]).length; 
  },
  get hasUnreadEvents() { 
    return this.unreadCount > 0; 
  },
  
  // Méthode utilitaire
  isEventRead(eventId) {
    return !!this.readEvents[eventId];
  },
  
  // Initialisation
  async init() {
    this.db = new PouchDB('marki-events');
    
    // Sync avec CouchDB
    this.db.sync('https://admin:admin@dev.markidiags.com/data/marki-events', {
      live: true,
      retry: true
    });
    
    // Charger données
    this.readEvents = JSON.parse(localStorage.getItem('marki_read_events') || '{}');
    await this.loadEvents();
    
    // Écouter les changements temps réel
    this.db.changes({ since: 'now', live: true, include_docs: true })
      .on('change', (change) => this.handleEventChange(change.doc));
  }
}
```

## Cycle de vie

```
1. Initialisation
   ├── Créer PouchDB 'marki-events'
   ├── Configurer sync avec CouchDB
   ├── Charger readEvents depuis localStorage
   ├── Charger events depuis PouchDB
   └── Afficher tous les events avec pastille si non lus

2. Affichage initial
   ├── Tous les events sont visibles
   ├── Pastille "Non lu" sur ceux non lus
   └── Badge header avec nombre total de non lus

3. Interaction utilisateur - Marquer tous
   ├── Clic "Marquer comme lu" (header)
   ├── Sauvegarder tous les events dans localStorage
   ├── Disparaître toutes les pastilles "Non lu"
   └── Masquer badge (count = 0)

4. Interaction utilisateur - Marquer un seul
   ├── Hover sur un event → apparition bouton ✓
   ├── Clic bouton ✓
   ├── Sauvegarder event.id dans localStorage
   ├── Disparaître pastille de cet event uniquement
   └── Mettre à jour badge (count - 1)

5. Nouveau événement (PouchDB changes)
   ├── Change reçu de CouchDB
   ├── Ajouter event à events[] (en haut de la liste)
   ├── Afficher avec pastille "Non lu"
   └── Badge réapparaît (count + 1)
```

## Error Handling

| Code | Comportement |
|------|--------------|
| PouchDB indisponible | Afficher message "Base de données non disponible" |
| Pas d'événements | Afficher empty state |
| localStorage indisponible | Fonctionner en mode "sans mémoire" (pas de persistance) |

## Notes

- Les événements sont **récupérés depuis PouchDB local** et synchronisés avec CouchDB
- Seul l'état "lu/non-lu" est stocké en localStorage
- Le localStorage peut être vidé sans impact fonctionnel (juste perte de l'historique de lecture)
- L'utilisateur peut voir un event, le marquer comme lu, puis il réapparaîtra si un nouvel event du même type est créé
- Les événements sont ajoutés en temps réel via le sync PouchDB

---

## Migration depuis l'ancienne API

| Avant (API) | Après (PouchDB) |
|-------------|-----------------|
| `GET /api/events?limit=20` | `db.allDocs({ startkey: 'event:', endkey: 'event:\ufff0', limit: 20 })` |
| Polling/WebSocket | `db.changes({ live: true })` |
| Réponse JSON avec array `data` | `result.rows.map(r => r.doc)` |
| Nouveaux events via API/WebSocket | Nouveaux events via sync PouchDB |
