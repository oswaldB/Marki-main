---
id: dashboard-clear-events
type: frontend
folder: specs/workflows/frontend/dashboard/
description: Marquer tous les événements comme lus (localStorage ou PouchDB local)
depends_on: [auth-check]
screen: dashboard
global: false
mockup_entry: specs/mockups/dashboard.html
---

# Workflow : Marquer tous les événements comme lus

## Écran
`dashboard.html`

## Élément déclencheur
Bouton avec `@click="markAllAsRead()"`

## Action
Marquer tous les événements affichés comme lus dans **localStorage** (option: PouchDB pour sync)

## Description
- Marque tous les events comme `read: true` dans localStorage
- Met à jour le compteur de notifications (unread count passe à 0)
- **Ne supprime PAS les events de la liste** - ils restent visibles mais sans la pastille "Non lu"
- Les pastilles "Non lu" disparaissent pour tous les events
- **Pas d'appel API** - tout est géré localement

## Data Model

**Page Function:** `dashboardPage()`

**Données:**
- `events` - liste des events affichés (tous restent visibles)
- `readEvents` - Map des events lus depuis localStorage
- `unreadCount` - nombre d'events non lus (computed)
- `hasUnreadEvents` - boolean pour afficher le badge (computed)

## State Changes

**Modifications:**
- `readEvents` ← ajoute tous les event.id avec `{ read: true, readAt: now }`
- `unreadCount` ← 0 (recalculé automatiquement)
- `hasUnreadEvents` ← false (recalculé automatiquement)
- Pastilles "Non lu" ← disparaissent pour tous les events

## Stockage (localStorage)

**Clé:** `marki_read_events`

**Action:** Ajoute tous les event.id actuels avec leur timestamp de lecture

```javascript
// Exemple après markAllAsRead()
{
  "evt-001": { read: true, readAt: "2024-01-15T10:30:00Z" },
  "evt-002": { read: true, readAt: "2024-01-15T10:30:00Z" },
  "evt-003": { read: true, readAt: "2024-01-15T10:30:00Z" }
}
```

## Implementation (localStorage)

```javascript
markAllAsRead() {
  // Récupérer les events déjà lus
  const readEvents = JSON.parse(localStorage.getItem('marki_read_events') || '{}');
  
  // Marquer tous les events actuels comme lus
  const now = new Date().toISOString();
  this.events.forEach(event => {
    readEvents[event.id] = { read: true, readAt: now };
  });
  
  // Sauvegarder dans localStorage
  localStorage.setItem('marki_read_events', JSON.stringify(readEvents));
  
  // Forcer le recalcul pour mettre à jour les pastilles
  this.events = [...this.events];
}
```

## Alternative: Stockage dans PouchDB (optionnel)

Pour synchroniser le statut "lu" entre appareils (si plusieurs devices utilisent CouchDB):

```javascript
// Créer une base PouchDB pour les préférences utilisateur
const prefsDb = new PouchDB('marki-preferences');

// Sync avec CouchDB (optionnel)
prefsDb.sync('https://admin:admin@dev.markidiags.com/data/marki-preferences', {
  live: true,
  retry: true
});

// Marquer comme lu dans PouchDB
async markAllAsReadPouch() {
  const now = new Date().toISOString();
  
  for (const event of this.events) {
    try {
      const doc = await prefsDb.get(`read:${event.id}`);
      doc.read = true;
      doc.readAt = now;
      await prefsDb.put(doc);
    } catch (err) {
      // Document n'existe pas, le créer
      await prefsDb.put({
        _id: `read:${event.id}`,
        type: 'read_status',
        eventId: event.id,
        read: true,
        readAt: now
      });
    }
  }
  
  // Forcer le recalcul
  this.events = [...this.events];
}

// Charger les statuts depuis PouchDB
async loadReadStatus() {
  const result = await prefsDb.allDocs({
    startkey: 'read:',
    endkey: 'read:\ufff0',
    include_docs: true
  });
  
  this.readEvents = result.rows.reduce((acc, row) => {
    acc[row.doc.eventId] = { read: row.doc.read, readAt: row.doc.readAt };
    return acc;
  }, {});
}
```

## UI Behavior

### Avant le clic
- Badge "Non lu" visible dans le header avec le nombre
- Chaque event non lu a une pastille bleue
- Badge "Non lu" texte visible sur chaque event

### Après le clic
- Badge header disparaît (ou affiche 0)
- Toutes les pastilles bleues disparaissent
- Les badges "Non lu" textes disparaissent
- **Tous les events restent visibles** dans la liste

## Différence avec markEventAsRead()

| Action | Portée | Effet sur la liste |
|--------|--------|-------------------|
| `markAllAsRead()` | Tous les events | Pastilles disparaissent pour tous |
| `markEventAsRead(id)` | Un seul event | Pastille disparaît pour cet event uniquement |

## Notes importantes

- **Persistence:** Par défaut, le statut `read` est stocké uniquement dans localStorage (pas d'appel API)
- **Local uniquement:** Chaque navigateur/appareil a son propre historique de lecture
- **Events conservés:** Contrairement à l'ancienne version, les events ne sont pas filtrés - ils restent tous visibles
- **Clear possible:** L'utilisateur peut vider son localStorage pour revoir toutes les pastilles "Non lu"
- **Pas d'API:** Ce workflow ne fait aucun appel `/api/` - il est déjà compatible architecture PouchDB

---

## Migration PouchDB

Ce workflow ne nécessite pas de migration vers PouchDB car il n'utilise pas de backend API. 

**Optionnel:** Pour synchroniser le statut "lu" entre appareils, remplacer localStorage par une base PouchDB dédiée (`marki-preferences`) avec sync vers CouchDB.
