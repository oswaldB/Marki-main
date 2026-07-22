# Workflow : Marquer comme lu

## Écran
`evenements.html`

## Élément déclencheur
Bouton avec `@click="markAsRead(event)"` ou ouverture du détail

## Action
Marquer un événement spécifique comme lu

## Description
- Met à jour le statut `read: true` dans **localStorage** pour l'event sélectionné
- Met à jour le compteur de notifications
- L'événement reste visible mais sans le badge "Nouveau"
- **Pas d'appel API** - tout est géré localement

## Data Model

**Page Function:** `evenementsPage()`

**Données (depuis PouchDB):**
- `events` - liste des events chargés depuis PouchDB
- `unreadCount` - nombre d'events non lus (computed depuis localStorage)
- `readEvents` - Map des events lus depuis localStorage
- `selectedEvent`

**États UI:**
- `loading`

## State Changes

**Modifications:**
- `readEvents[event.id]` ← `{ read: true, readAt: now }`
- `unreadCount` ← recalculé automatiquement

## PouchDB Calls

**Aucun** - Le statut "lu/non-lu" est stocké dans **localStorage**.

Les events eux-mêmes proviennent de PouchDB, mais leur statut de lecture est local à chaque navigateur.



## Organisation des fichiers

```
frontend/
└── app/
    └── evenements/
        ├── index.html
        └── js/
            └── mark-as-read.js
```

### Fichier workflow
- **JS** : `frontend/app/evenements/js/mark-as-read.js`

```javascript
// frontend/app/evenements/js/mark-as-read.js
export function markAsRead() {
  // Implementation avec localStorage
}
```

## Implementation (localStorage)

```javascript
markAsRead(eventId) {
  // 1. Vérifier si l'event existe
  const event = this.events.find(e => e.id === eventId);
  if (!event) return;
  
  // 2. Vérifier si déjà lu
  if (this.readEvents[eventId]) return;
  
  // 3. Marquer comme lu dans localStorage
  this.readEvents[eventId] = { 
    read: true, 
    readAt: new Date().toISOString() 
  };
  
  // 4. Sauvegarder
  localStorage.setItem('marki_read_events', JSON.stringify(this.readEvents));
  
  // 5. Forcer recalcul pour mettre à jour l'UI
  this.events = [...this.events];
  
  // 6. Optionnel: Toast de confirmation
  // this.toast('Marqué comme lu', 'success');
}

// Avec gestion d'erreur
markAsReadWithErrorHandling(eventId) {
  try {
    // Marquer comme lu
    this.readEvents[eventId] = { 
      read: true, 
      readAt: new Date().toISOString() 
    };
    
    // Sauvegarder
    localStorage.setItem('marki_read_events', JSON.stringify(this.readEvents));
    
    // Forcer recalcul
    this.events = [...this.events];
    
  } catch (error) {
    console.error('Erreur mark as read:', error);
    // Pas de rollback nécessaire car pas d'appel API
  }
}
```

## Distinction visuelle

```javascript
// Dans le template HTML
// isEventRead() vérifie dans localStorage
<div :class="{
  'bg-sky-50 border-l-4 border-sky-500': !isEventRead(event.id),  // Non lu
  'bg-white': isEventRead(event.id)                                // Lu
}">
  <span x-show="!isEventRead(event.id)" class="badge-nouveau">Nouveau</span>
</div>
```

## Méthode utilitaire

```javascript
// Vérifier si un event est lu (depuis localStorage)
isEventRead(eventId) {
  return !!this.readEvents[eventId];
}

// Computed: nombre d'events non lus
get unreadCount() {
  return this.events.filter(e => !this.isEventRead(e.id)).length;
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

async markAsReadPouch(eventId) {
  try {
    const doc = await prefsDb.get(`read:${eventId}`);
    doc.read = true;
    doc.readAt = new Date().toISOString();
    await prefsDb.put(doc);
  } catch (err) {
    // Document n'existe pas, le créer
    await prefsDb.put({
      _id: `read:${eventId}`,
      type: 'read_status',
      eventId: eventId,
      read: true,
      readAt: new Date().toISOString()
    });
  }
  
  // Mettre à jour l'UI
  this.readEvents[eventId] = { read: true, readAt: new Date().toISOString() };
  this.events = [...this.events];
}
```

## Différence avec l'ancienne API

| Aspect | Avant (API) | Après (PouchDB/localStorage) |
|--------|-------------|------------------------------|
| Requête | `PATCH /api/events/:id/read` | `localStorage.setItem()` |
| Persistence | Base de données serveur | localStorage (par navigateur) |
| Optimistic update | Nécessaire | Instantané (local) |
| Rollback | Complexe | Simple (localStorage) |
| Latence | ~50-200ms | ~0-1ms (instantané) |
| Offline | ❌ Impossible | ✅ Fonctionne offline |

## Notes

- **Simplicité:** Pas de rollback complexe car pas d'appel API
- **Performance:** Mise à jour instantanée
- **Isolation:** Le statut est propre à chaque navigateur
- **Pas de sync:** Par défaut, pas de synchronisation entre appareils
- **Option sync:** Utiliser PouchDB `marki-preferences` si nécessaire
