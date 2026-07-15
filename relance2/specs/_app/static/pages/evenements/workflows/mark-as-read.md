# Workflow : Marquer comme lu

## Écran
`evenements.html`

## Élément déclencheur
Bouton avec `@click="markAsRead(event)"` ou ouverture du détail

## Action
Marquer un événement spécifique comme lu

## Description
- Met à jour le statut `read: true` pour l'event sélectionné
- Met à jour le compteur de notifications
- L'événement reste visible mais sans le badge "Nouveau"

## Data Model

**Page Function:** `evenementsPage()`

**Données:**
- `events` - liste des events
- `unreadCount` - nombre d'events non lus

**États UI:**
- `loading`
- `selectedEvent`

## State Changes

**Modifications:**
- `events[n].read` ← `true`
- `unreadCount` ← décrémenté de 1

## API Calls

**Endpoint:** `PATCH /api/events/:id/read`

**Params:**
- `id` - ID de l'event à marquer comme lu

**Response:** `ApiResponse<Event>`

**Sécurité:** L'API vérifie que `event.user_id === current_user` avant modification.

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
  // Implementation du workflow
}
```

## Implementation

```javascript
async markAsRead(eventId) {
  // 1. Optimistic update - mettre à jour l'UI immédiatement
  const eventIndex = this.events.findIndex(e => e.id === eventId);
  if (eventIndex === -1) return;
  
  const wasUnread = !this.events[eventIndex].read;
  this.events[eventIndex].read = true;
  
  // 2. Décrémenter le compteur si l'event était non lu
  if (wasUnread) {
    this.unreadCount = Math.max(0, this.unreadCount - 1);
    Alpine.store('ui').setUnreadCount(this.unreadCount);
  }
  
  try {
    // 3. Call API
    const response = await fetch(`/api/events/${eventId}/read`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' }
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error?.message);
    }
    
    // 4. Confirm update avec données serveur
    this.events[eventIndex] = {
      ...this.events[eventIndex],
      ...data.data
    };
    
  } catch (error) {
    console.error('Erreur mark as read:', error);
    
    // 5. Rollback en cas d'erreur
    this.events[eventIndex].read = !wasUnread;
    if (wasUnread) {
      this.unreadCount++;
      Alpine.store('ui').setUnreadCount(this.unreadCount);
    }
    
    Alpine.store('ui').addToast('Erreur lors de la mise à jour', 'error');
  }
}
```

## Distinction visuelle

```javascript
// Dans le template HTML
<div :class="{
  'bg-sky-50 border-l-4 border-sky-500': !event.read,  // Non lu
  'bg-white': event.read                                // Lu
}">
  <span x-show="!event.read" class="badge-nouveau">Nouveau</span>
</div>
```

## Notes

- **Optimistic update:** L'UI est mise à jour immédiatement avant la réponse API
- **Rollback:** En cas d'erreur, l'état précédent est restauré
- **Isolation:** Un utilisateur ne peut marquer que ses propres events

## Logs (console.log) - OBLIGATOIRE

Chaque étape du workflow doit être loguée avec `console.log()`:

| Checkpoint | Instruction console.log |
|------------|------------------------|
| `start` | `console.log('[WORKFLOW.evenements-mark-as-read] START: Marquer event comme lu', { eventId, wasUnread })` |
| `api-call-start` | `console.log('[WORKFLOW.evenements-mark-as-read] STEP: Appel API PATCH /api/events/${eventId}/read')` |
| `event-updated` | `console.log('[WORKFLOW.evenements-mark-as-read] DATA: Event mis à jour (optimistic + server)', { eventId, read: true, unreadCount })` |
| `list-rerendered` | `console.log('[WORKFLOW.evenements-mark-as-read] STEP: Liste events re-rendue, badge Nouveau retiré')` |
| `end` | `console.log('[WORKFLOW.evenements-mark-as-read] SUCCESS: Event marqué comme lu en', duree, 'ms')` |
| `error` | `console.error('[WORKFLOW.evenements-mark-as-read] ERROR: Échec mark as read, rollback effectué', error)` |
