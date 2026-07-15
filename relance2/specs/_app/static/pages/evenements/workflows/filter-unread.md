# Workflow : Filtrer non lus

## Écran
`evenements.html`

## Élément déclencheur
Bouton avec `@click="filterUnread()"` ou toggle `@click="showOnlyUnread = !showOnlyUnread"`

## Action
Afficher uniquement les événements non lus de l'utilisateur courant

## Description
- Filtre les events avec `read = false`
- Priorise les événements à traiter
- Affiche le nombre de non lus dans le titre

## Data Model

**Page Function:** `evenementsPage()`

**Données:**
- `events` - tous les events de l'utilisateur
- `filteredEvents` - events après filtrage (computed)
- `showOnlyUnread` - boolean pour activer/désactiver le filtre
- `unreadCount` - nombre total d'events non lus

**États UI:**
- `loading`
- `error`

## State Changes

**Modifications:**
- `showOnlyUnread` ← `true` ou `false`
- `filteredEvents` ← recalculé selon le filtre

## API Calls

**Option 1 - Filtrage Frontend (recommandé pour < 100 events):**
Filtrage local sur `events` déjà chargés.

**Option 2 - Filtrage Backend (pour pagination):**

**Endpoint:** `GET /api/events?read=false&limit=50`

**Query Params:**
- `read=false` - filtre les events non lus
- `limit=50` - pagination
- `user_id` implicite (via token JWT)

**Response:** `ApiResponse<Event[]>`

## Organisation des fichiers

```
frontend/
└── app/
    └── evenements/
        ├── index.html
        └── js/
            └── filter-unread.js
```

### Fichier workflow
- **JS** : `frontend/app/evenements/js/filter-unread.js`

## Implementation

### Option 1: Filtrage Frontend (Computed Property)

```javascript
// Computed property
get filteredEvents() {
  let result = this.events;
  
  // Filtre non lus
  if (this.showOnlyUnread) {
    result = result.filter(event => !event.read);
  }
  
  // Autres filtres...
  if (this.filterType) {
    result = result.filter(event => event.type === this.filterType);
  }
  
  // Tri par date décroissante
  result = result.sort((a, b) => 
    new Date(b.created_at) - new Date(a.created_at)
  );
  
  return result;
}

// Nombre de non lus (computed)
get unreadCount() {
  return this.events.filter(event => !event.read).length;
}
```

### Option 2: Filtrage Backend (avec pagination)

```javascript
async loadEvents() {
  this.loading = true;
  
  try {
    const params = new URLSearchParams();
    params.append('limit', '50');
    
    // Filtre non lus
    if (this.showOnlyUnread) {
      params.append('read', 'false');
    }
    
    // Filtre type
    if (this.filterType) {
      params.append('type', this.filterType);
    }
    
    const response = await fetch(`/api/events?${params.toString()}`);
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error?.message);
    }
    
    this.events = data.data;
    
  } catch (error) {
    console.error('Erreur chargement events:', error);
    this.error = error.message;
  } finally {
    this.loading = false;
  }
}
```

## UI - Toggle Filtre

```html
<!-- Toggle switch dans l'interface -->
<button 
  @click="showOnlyUnread = !showOnlyUnread"
  :class="showOnlyUnread ? 'bg-sky-500 text-white' : 'bg-slate-200'"
>
  <i class="fas fa-eye-slash mr-2"></i>
  Non lus uniquement
  <span x-show="unreadCount > 0" class="ml-2 badge" x-text="unreadCount"></span>
</button>
```

## Comportement attendu

| Action | Résultat |
|--------|----------|
| Toggle ON | Affiche uniquement `read = false` |
| Toggle OFF | Affiche tous les events |
| Mark as read sur un event | L'event disparaît si filtre ON |
| Mark all as read | Liste vide si filtre ON |
| Refresh | Garde le filtre actif |

## Notes

- **Isolation:** Le filtre `read=false` retourne uniquement les events de l'utilisateur courant
- **Realtime:** Après "mark as read", l'event disparaît immédiatement si le filtre est actif
- **Compteur:** Le badge affiche toujours le nombre total de non lus, pas seulement ceux affichés

## Logs (console.log) - OBLIGATOIRE

Chaque étape du workflow doit être loguée avec `console.log()`:

| Checkpoint | Instruction console.log |
|------------|------------------------|
| `start` | `console.log('[WORKFLOW.evenements-filter-unread] START: Filtrage des événements non lus')` |
| `filter-applied` | `console.log('[WORKFLOW.evenements-filter-unread] STEP: showOnlyUnread =', showOnlyUnread, '— filtre', showOnlyUnread ? 'ON' : 'OFF')` |
| `list-rerendered` | `console.log('[WORKFLOW.evenements-filter-unread] DATA: Liste re-rendue:', { total: events.length, filtered: filteredEvents.length, unread: unreadCount })` |
| `end` | `console.log('[WORKFLOW.evenements-filter-unread] SUCCESS: Filtre non lus appliqué en', duree, 'ms —', filteredEvents.length, 'événement(s) affiché(s)')` |
| `error` | `console.error('[WORKFLOW.evenements-filter-unread] ERROR:', error)` |
