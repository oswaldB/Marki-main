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

**Pas d'appel API** - Action frontend uniquement.

**Logique:** Met à jour le state local Alpine.js directement.

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
  const workflowId = crypto.randomUUID();
  log.info('WORKFLOW_START', { workflowId, workflow: 'markAllAsRead' });
  
  try {
    // Mise à jour optimistic du state local
    const updatedCount = this.events.filter(e => !e.lu).length;
    
    this.events = this.events.map(event => ({
      ...event,
      lu: true
    }));
    
    log.debug('STATE_UPDATE', { 
      eventsUpdated: updatedCount, 
      allEventsNowRead: true 
    });
    
    log.info('WORKFLOW_SUCCESS', { workflowId, updatedCount });
    
  } catch (error) {
    log.error('WORKFLOW_ERROR', { workflowId, error: error.message });
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
