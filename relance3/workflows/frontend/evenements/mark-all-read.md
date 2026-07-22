# Workflow : Marquer tout comme lu

## Écran
`evenements.html`

## Élément déclencheur
Bouton avec `@click="markAllAsRead()"`

## Action
Marquer tous les événements affichés comme lus

## Description
- Met à jour le statut `read: true` dans **localStorage** pour tous les events affichés
- Réinitialise le compteur de notifications à 0
- Les events restent visibles mais sans badge "Nouveau"
- **Pas d'appel API** - tout est géré localement

## Data Model

**Page Function:** `evenementsPage()`

**Données (depuis PouchDB):**
- `events` - liste des events chargés depuis PouchDB
- `unreadCount` - nombre d'events non lus (computed depuis localStorage)
- `hasUnread` - boolean (computed)
- `readEvents` - Map des events lus depuis localStorage

**États UI:**
- `loading`

## State Changes

**Modifications:**
- `readEvents` ← tous les events passent à `{ read: true, readAt: now }`
- `unreadCount` ← 0 (recalculé automatiquement)
- `hasUnread` ← false (recalculé automatiquement)

## PouchDB Calls

**Aucun** - Le statut "lu/non-lu" est stocké dans **localStorage**.

Les events eux-mêmes proviennent de PouchDB, mais leur statut de lecture est local à chaque navigateur.

**Optionnel:** Pour synchroniser le statut "lu" entre appareils, utiliser une base PouchDB dédiée (`marki-preferences`).



## Organisation des fichiers

```
frontend/
└── app/
    └── evenements/
        ├── index.html
        └── js/
            └── mark-all-read.js
```

### Fichier workflow
- **JS** : `frontend/app/evenements/js/mark-all-read.js`

```javascript
// frontend/app/evenements/js/mark-all-read.js
export function markAllRead() {
  // Implementation avec localStorage
}
```

## Implementation (localStorage)

```javascript
markAllAsRead() {
  // 1. Sauvegarder l'état précédent pour rollback
  const previousReadEvents = { ...this.readEvents };
  const previousUnreadCount = this.unreadCount;
  
  // 2. Marquer tous les events actuels comme lus
  const now = new Date().toISOString();
  this.events.forEach(event => {
    this.readEvents[event.id] = { read: true, readAt: now };
  });
  
  // 3. Sauvegarder dans localStorage
  localStorage.setItem('marki_read_events', JSON.stringify(this.readEvents));
  
  // 4. Forcer recalcul (met à jour unreadCount, hasUnread, badges)
  this.events = [...this.events];
  
  // 5. Toast de confirmation
  this.toast(`${this.events.length} événement(s) marqué(s) comme lu(s)`, 'success');
  
  // Note: Pas d'appel API, pas de gestion d'erreur réseau
  // Si erreur localStorage, le try/catch ci-dessous gère le rollback
}

// Avec gestion d'erreur et rollback
markAllAsReadWithRollback() {
  const previousReadEvents = JSON.parse(localStorage.getItem('marki_read_events') || '{}');
  
  try {
    // Marquer comme lus
    const now = new Date().toISOString();
    this.events.forEach(event => {
      this.readEvents[event.id] = { read: true, readAt: now };
    });
    
    // Sauvegarder
    localStorage.setItem('marki_read_events', JSON.stringify(this.readEvents));
    
    // Forcer recalcul
    this.events = [...this.events];
    
    this.toast('Tous les événements sont marqués comme lus', 'success');
    
  } catch (error) {
    // Rollback
    this.readEvents = previousReadEvents;
    localStorage.setItem('marki_read_events', JSON.stringify(previousReadEvents));
    
    this.toast('Erreur lors de la mise à jour', 'error');
  }
}
```

## Option: Synchronisation via PouchDB

Pour synchroniser le statut "lu" entre appareils :

```javascript
// Utiliser une base PouchDB dédiée pour les préférences
const prefsDb = new PouchDB('marki-preferences');

// Sync avec CouchDB
prefsDb.sync('https://admin:admin@dev.markidiags.com/data/marki-preferences', {
  live: true, retry: true
});

async markAllAsReadPouch() {
  const now = new Date().toISOString();
  
  // Créer un document par event lu
  const docs = this.events.map(event => ({
    _id: `read:${event.id}`,
    type: 'read_status',
    eventId: event.id,
    read: true,
    readAt: now
  }));
  
  // Bulk insert
  await prefsDb.bulkDocs(docs);
  
  // Mettre à jour l'UI
  this.events.forEach(event => {
    this.readEvents[event.id] = { read: true, readAt: now };
  });
  
  this.events = [...this.events];
}
```

## Différence avec clear-events (dashboard)

| Workflow | Usage | Visuel | Stockage |
|----------|-------|--------|----------|
| `clear-events` (dashboard) | Bouton rapide sur le widget dashboard | Cache les notifications | localStorage |
| `mark-all-read` (evenements) | Bouton dans la page événements | Garde les events visibles mais lus | localStorage |

## Différence avec l'ancienne API

| Aspect | Avant (API) | Après (PouchDB/localStorage) |
|--------|-------------|------------------------------|
| Requête | `POST /api/events/mark-read` | `localStorage.setItem()` |
| Persistence | Base de données serveur | localStorage (par navigateur) |
| Sync multi-appareils | ✅ Oui | ❌ Non (sauf avec PouchDB prefs) |
| Latence | ~100-500ms | ~0-1ms (instantané) |
| Offline | ❌ Impossible | ✅ Fonctionne offline |
| Rollback | Complexe (API déjà modifiée) | Facile (restaurer localStorage) |

## Notes

- **Isolation:** Seuls les events affichés sont marqués comme lus
- **Persistence:** Le statut est sauvegardé dans localStorage uniquement
- **Pas de sync:** Par défaut, le statut n'est pas synchronisé entre appareils
- **Option sync:** Utiliser PouchDB `marki-preferences` si sync nécessaire
