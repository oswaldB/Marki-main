---
id: dashboard-clear-events
type: frontend
folder: specs/workflows/frontend/dashboard/
description: Marquer tous les événements comme lus (via localStorage)
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
Marquer tous les événements affichés comme lus dans localStorage

## Description
- Marque tous les events comme `read: true` dans localStorage
- Met à jour le compteur de notifications (unread count passe à 0)
- **Ne supprime PAS les events de la liste** - ils restent visibles mais sans la pastille "Non lu"
- Les pastilles "Non lu" disparaissent pour tous les events

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

## localStorage

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

## Implementation

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

- **Persistence:** Le statut `read` est stocké uniquement dans localStorage (pas d'appel API)
- **Local uniquement:** Chaque navigateur/appareil a son propre historique de lecture
- **Events conservés:** Contrairement à l'ancienne version, les events ne sont pas filtrés - ils restent tous visibles
- **Clear possible:** L'utilisateur peut vider son localStorage pour revoir toutes les pastilles "Non lu"
