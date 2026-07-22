# Workflow : Filtrer tous événements

## Écran
`evenements.html`

## Élément déclencheur
Bouton avec `@click="filterType = 'all'"`

## Action
Afficher tous les événements

## Description
- Sans filtre sur le type
- Tous les événements
- **Filtrage côté client sur données PouchDB déjà chargées**

## Data Model
**Page Function:** `evenementsPage()`

**Stores Alpine.js:**
- $store.ui

**Données (depuis PouchDB):**
- `evenements` - chargés depuis PouchDB via `events-manager`
- `searchQuery`
- `filterType`
- `filterDateStart`
- `filterDateEnd`
- `filterUser`
- `page`
- `perPage`

**États UI:**
- `loading` - chargement depuis PouchDB
- `loadingMore`
- `error` - erreur PouchDB
- `selectedEvent`
- `showDetailModal`

## State Changes

**Modifications:**
- `page` modifié
- `searchQuery` modifié
- `filter*` modifié

## PouchDB Calls

**Aucun** - Ce workflow effectue un filtrage **côté client** sur les données déjà chargées depuis PouchDB par le workflow `events-manager`.



## Organisation des fichiers

```
frontend/
└── app/
    └── evenements/
        ├── index.html
        ├── components/
        │   └── (composants partagés)
        └── js/
            └── filter-all.js
```

### Fichier principal
- **HTML** : `frontend/app/evenements/index.html`
- **Point d'entrée** : Initialise la page Alpine.js avec PouchDB

### Fichier workflow
- **JS** : `frontend/app/evenements/js/filter-all.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/evenements/js/filter-all.js
export function filterAll() {
  // Implementation du workflow - filtrage côté client
}
```

## Implementation

```javascript
// Filter properties are bound to inputs via x-model
// Computed property handles filtering on PouchDB data:

get filteredData() {
  // Les données proviennent déjà de PouchDB (via events-manager)
  let result = this.evenements;
  
  // 1. Search filter (côté client)
  if (this.searchQuery) {
    const query = this.searchQuery.toLowerCase();
    result = result.filter(item => 
      item.title?.toLowerCase().includes(query) ||
      item.description?.toLowerCase().includes(query)
    );
  }
  
  // 2. Type filter (côté client)
  if (this.filterType && this.filterType !== 'all') {
    result = result.filter(item => item.event_type === this.filterType);
  }
  
  // 3. Date range filter (côté client)
  if (this.filterDateStart) {
    const start = new Date(this.filterDateStart);
    result = result.filter(item => new Date(item.created_at) >= start);
  }
  
  if (this.filterDateEnd) {
    const end = new Date(this.filterDateEnd);
    result = result.filter(item => new Date(item.created_at) <= end);
  }
  
  // 4. Sort
  result = result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  
  return result;
}
```

---

## Migration PouchDB

Ce workflow **ne nécessite pas de migration** car il n'utilise pas d'appel API.
Le filtrage est effectué **côté client** sur les données déjà chargées depuis PouchDB.

| Aspect | Implémentation |
|--------|----------------|
| Source de données | PouchDB (via `events-manager`) |
| Filtrage | Côté client (JavaScript array methods) |
| Appels réseau | Aucun |
| Offline | ✅ Fonctionne offline |
| Performance | Instantané (filtrage mémoire) |
