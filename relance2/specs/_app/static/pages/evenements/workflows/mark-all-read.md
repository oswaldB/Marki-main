# Workflow : Marquer tout comme lu

## Écran
`evenements.html`

## Élément déclencheur
Bouton avec `@click="markAllAsRead()"`

## Action
Marquer tous les événements de l'utilisateur comme lus

## Description
- Met à jour le statut `read: true` pour tous les events de l'utilisateur courant
- Réinitialise le compteur de notifications à 0
- Les events restent visibles mais sans badge "Nouveau"

## Data Model

**Page Function:** `evenementsPage()`

**Données:**
- `events` - liste des events
- `unreadCount` - nombre d'events non lus
- `hasUnread` - boolean (computed)

**États UI:**
- `loading`

## State Changes

**Modifications:**
- `events` ← tous les events passent à `read: true`
- `unreadCount` ← 0
- `hasUnread` ← false

## API Calls

**Endpoint:** `POST /api/events/mark-read`

**Payload:** Aucun (utilise l'utilisateur courant depuis le token)

**Response:** `ApiResponse<{ updated: number }>`

**Note:** L'API ne modifie que les events où `user_id = current_user` et `read = false`.

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
  // Implementation du workflow
}
```

## Implementation

```javascript
async markAllAsRead() {
  // 1. Sauvegarder l'état précédent pour rollback
  const previousEvents = [...this.events];
  const previousUnreadCount = this.unreadCount;
  
  // 2. Optimistic update
  this.events = this.events.map(event => ({
    ...event,
    read: true
  }));
  this.unreadCount = 0;
  Alpine.store('ui').setUnreadCount(0);
  
  try {
    // 3. Call API
    const response = await fetch('/api/events/mark-read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error?.message);
    }
    
    // 4. Toast de confirmation
    const updatedCount = data.data?.updated || previousUnreadCount;
    Alpine.store('ui').addToast(`${updatedCount} événement(s) marqué(s) comme lu(s)`, 'success');
    
  } catch (error) {
    console.error('Erreur mark all as read:', error);
    
    // 5. Rollback
    this.events = previousEvents;
    this.unreadCount = previousUnreadCount;
    Alpine.store('ui').setUnreadCount(previousUnreadCount);
    
    Alpine.store('ui').addToast('Erreur lors de la mise à jour', 'error');
  }
}
```

## Différence avec clear-events (dashboard)

| Workflow | Usage | Visuel |
|----------|-------|--------|
| `clear-events` (dashboard) | Bouton rapide sur le widget dashboard | Cache les notifications |
| `mark-all-read` (evenements) | Bouton dans la page événements | Garde les events visibles mais lus |

## Notes

- **Isolation:** Seuls les events de l'utilisateur courant sont modifiés
- **Batch update:** Une seule requête pour tous les events
- **Persistence:** Le statut est sauvegardé en base via `user_id` + `read`

## Logs (console.log) - OBLIGATOIRE

Chaque étape du workflow doit être loguée avec `console.log()`:

| Checkpoint | Instruction console.log |
|------------|------------------------|
| `start` | `console.log('[WORKFLOW.evenements-mark-all-read] START: Marquage de tous les événements comme lus')` |
| `snapshot-saved` | `console.log('[WORKFLOW.evenements-mark-all-read] STEP: Snapshot enregistré pour rollback', {previousUnreadCount})` |
| `optimistic-update` | `console.log('[WORKFLOW.evenements-mark-all-read] STEP: Optimistic update appliqué (events -> read: true, unreadCount = 0)')` |
| `api-call-start` | `console.log('[WORKFLOW.evenements-mark-all-read] API: Appel POST /api/events/mark-read')` |
| `data-updated` | `console.log('[WORKFLOW.evenements-mark-all-read] DATA: Réponse API reçue', data)` |
| `list-rerendered` | `console.log('[WORKFLOW.evenements-mark-all-read] STEP: Liste ré-rendue, badges "Nouveau" masqués, compteur à 0')` |
| `end` | `console.log('[WORKFLOW.evenements-mark-all-read] SUCCESS: Tous les événements marqués comme lus en', duree, 'ms')` |
| `error` | `console.error('[WORKFLOW.evenements-mark-all-read] ERROR:', error)` |
