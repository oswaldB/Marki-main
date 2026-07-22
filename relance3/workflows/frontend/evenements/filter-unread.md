# Workflow : Filtrer non lus

## Écran
`evenements.html`

## Élément déclencheur
Bouton avec `@click="filterUnread()"` ou toggle `@click="showOnlyUnread = !showOnlyUnread"`

## Action
Afficher uniquement les événements non lus de l'utilisateur courant

## Description
- Filtre les events avec `read = false` (stocké dans localStorage)
- Priorise les événements à traiter
- Affiche le nombre de non lus dans le titre
- **Filtrage côté client sur données PouchDB déjà chargées**

## Data Model

**Page Function:** `evenementsPage()`

**Données (depuis PouchDB):**
- `events` - tous les events chargés depuis PouchDB
- `filteredEvents` - events après filtrage (computed)
- `showOnlyUnread` - boolean pour activer/désactiver le filtre
- `unreadCount` - nombre total d'events non lus
- `readEvents` - Map des events lus depuis localStorage

**États UI:**
- `loading` - chargement depuis PouchDB
- `error` - erreur PouchDB

## State Changes

**Modifications:**
- `showOnlyUnread` ← `true` ou `false`
- `filteredEvents` ← recalculé selon le filtre

## PouchDB Calls

**Aucun** - Ce workflow effectue un filtrage **côté client** sur les données déjà chargées depuis PouchDB par le workflow `events-manager`.

L'état "lu/non-lu" est stocké dans `localStorage` (clé `marki_read_events`), pas dans PouchDB.



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

### Filtrage Frontend (Computed Property)

```javascript
// Les données proviennent de PouchDB (via events-manager)
// L'état "lu" est stocké dans localStorage

// Computed property
get filteredEvents() {
  let result = this.events; // From PouchDB
  
  // Filtre non lus (basé sur localStorage)
  if (this.showOnlyUnread) {
    result = result.filter(event => !this.isEventRead(event.id));
  }
  
  // Autres filtres...
  if (this.filterType && this.filterType !== 'all') {
    result = result.filter(event => event.event_type === this.filterType);
  }
  
  // Tri par date décroissante
  result = result.sort((a, b) => 
    new Date(b.created_at) - new Date(a.created_at)
  );
  
  return result;
}

// Vérifier si un event est lu (depuis localStorage)
isEventRead(eventId) {
  return !!this.readEvents[eventId];
}

// Nombre de non lus (computed)
get unreadCount() {
  return this.events.filter(event => !this.isEventRead(event.id)).length;
}

// Charger l'état lu depuis localStorage
loadReadStatus() {
  this.readEvents = JSON.parse(localStorage.getItem('marki_read_events') || '{}');
}
```

### Marquer comme lu (met à jour localStorage)

```javascript
markEventAsRead(eventId) {
  this.readEvents[eventId] = { 
    read: true, 
    readAt: new Date().toISOString() 
  };
  localStorage.setItem('marki_read_events', JSON.stringify(this.readEvents));
  
  // Force recalcul pour mettre à jour la liste si filtre actif
  this.events = [...this.events];
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
| Toggle ON | Affiche uniquement events non lus (lu = localStorage) |
| Toggle OFF | Affiche tous les events |
| Mark as read sur un event | L'event disparaît si filtre ON |
| Mark all as read | Liste vide si filtre ON |
| Refresh | Garde le filtre actif |

---

## Migration PouchDB

Ce workflow **ne nécessite pas de migration API** car il utilise déjà le filtrage côté client.

| Aspect | Implémentation |
|--------|----------------|
| Source events | PouchDB (via `events-manager`) |
| État "lu/non-lu" | localStorage (inchangé) |
| Filtrage | Côté client (JavaScript array methods) |
| Appels réseau | Aucun |
| Offline | ✅ Fonctionne offline |
| Performance | Instantané (filtrage mémoire) |
