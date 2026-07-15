# Workflow : Effacer les événements

## Écran
`dashboard.html`

## Élément déclencheur
Bouton avec `@click="clearEvents()"`

## Action
Marquer tous les événements comme lus (clear notification badge)

## Description
- Marque tous les events de l'utilisateur courant comme `read: true`
- Met à jour le compteur de notifications (unread count passe à 0)
- Ne supprime PAS les events de la base (uniquement changement de statut)

## Data Model

**Page Function:** `dashboardPage()`

**Données:**
- `events` - liste des events affichés
- `unreadCount` - nombre d'events non lus

**États UI:**
- `loading`
- `error`

## State Changes

**Modifications:**
- `events` ← chaque event passe à `read: true`
- `unreadCount` ← 0

## API Calls

**Endpoint:** `POST /api/events/mark-read`

**Payload:** Aucun (utilise l'utilisateur courant depuis le token)

**Response:** `ApiResponse<{ updated: number }>`

**Note:** L'API met à jour uniquement les events où `user_id = current_user` et `read = false`.

## Organisation des fichiers

```
frontend/
└── app/
    └── dashboard/
        ├── index.html
        └── js/
            └── clear-events.js
```

### Fichier workflow
- **JS** : `frontend/app/dashboard/js/clear-events.js`

```javascript
// frontend/app/dashboard/js/clear-events.js
export function clearEvents() {
  // Implementation du workflow
}
```

## Implementation

```javascript
async clearEvents() {
  try {
    // 1. Call API pour marquer tous comme lus
    const response = await fetch('/api/events/mark-read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error?.message);
    }
    
    // 2. Update local state - tous les events deviennent lus
    this.events = this.events.map(event => ({
      ...event,
      read: true
    }));
    
    // 3. Reset unread counter
    this.unreadCount = 0;
    
    // 4. Update UI store notification badge
    Alpine.store('ui').setUnreadCount(0);
    
  } catch (error) {
    console.error('Erreur clear events:', error);
    Alpine.store('ui').addToast('Erreur lors de la mise à jour', 'error');
  }
}
```

## Notes importantes

- **Isolation par utilisateur:** Seuls les events de l'utilisateur courant sont modifiés
- **Persistence:** Le statut `read` est persisté en base via la table `events`
- **Realtime:** Les autres onglets/appareils de l'utilisateur verront le compteur à jour au prochain refresh

## Logs (console.log) - OBLIGATOIRE

Chaque étape du workflow doit être loguée avec `console.log()`:

| Checkpoint | Instruction console.log |
|------------|------------------------|
| `start` | `console.log('[WORKFLOW.dashboard-clear-events] START: Effacement des événements non lus')` |
| `api-call` | `console.log('[WORKFLOW.dashboard-clear-events] STEP: Appel API POST /api/events/mark-read')` |
| `state-cleared` | `console.log('[WORKFLOW.dashboard-clear-events] STEP: events marqués read=true, unreadCount=0')` |
| `end` | `console.log('[WORKFLOW.dashboard-clear-events] SUCCESS: Événements effacés en', duree, 'ms')` |
| `error` | `console.error('[WORKFLOW.dashboard-clear-events] ERROR:', error)` |
