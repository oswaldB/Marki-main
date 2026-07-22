# Workflow : Ouvrir événement

## Écran
`evenements.html`

## Élément déclencheur
Ligne avec `@click="openEvent(event)"`

## Action
Ouvrir le détail de l'événement

## Description
- Affiche le modal détail
- Montre toutes les informations
- **Les données proviennent de PouchDB** (déjà chargées)

## Data Model
**Page Function:** `evenementsPage()`

**Stores Alpine.js:**
- $store.ui

**Données (depuis PouchDB):**
- `evenements` - chargés depuis PouchDB
- `searchQuery`
- `filterType`
- `filterDateStart`
- `filterDateEnd`
- `filterUser`
- `page`
- `perPage`

**États UI:**
- `loading`
- `loadingMore`
- `error`
- `selectedEvent`
- `showDetailModal`

## State Changes

**Modifications:**
- `selectedEvent` modifié

## PouchDB Calls

**Aucun** - L'event est passé directement depuis la liste (déjà chargée depuis PouchDB par `initial-load`).

**Optionnel:** Si besoin de données complémentaires :
```javascript
async loadEventDetails(eventId) {
  const doc = await dbEvents.get('event:' + eventId);
  return doc;
}
```



## Organisation des fichiers

```
frontend/
└── app/
    └── evenements/
        ├── index.html
        ├── components/
        │   └── (composants partagés)
        └── js/
            └── open-event.js
```

### Fichier principal
- **HTML** : `frontend/app/evenements/index.html`
- **Point d'entrée** : Initialise la page Alpine.js avec PouchDB

### Fichier workflow
- **JS** : `frontend/app/evenements/js/open-event.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/evenements/js/open-event.js
export function openEvent() {
  // Implementation du workflow
}
```

## Implementation

```javascript
openModal(item) {
  // 1. Set selected item (déjà chargé depuis PouchDB)
  this.selectedItem = item;
  
  // 2. Show modal
  this.showModal = true;
  
  // 3. Optionnel: charger des données complémentaires depuis PouchDB
  if (item?.id && this.needsMoreData) {
    this.loadDetailFromPouchDB(item.id);
  }
}

// Charger des détails supplémentaires si nécessaire
async loadDetailFromPouchDB(eventId) {
  try {
    const doc = await dbEvents.get('event:' + eventId);
    this.selectedItemDetails = doc;
  } catch (err) {
    console.error('Erreur chargement détail:', err);
  }
}
```

---

## Migration PouchDB

Ce workflow **ne nécessite pas de migration** car il n'utilise pas d'appel API.
C'est une action UI pure sur des données déjà chargées depuis PouchDB.

| Aspect | Implémentation |
|--------|----------------|
| Données | PouchDB (via `initial-load`) |
| Appels réseau | Aucun |
| Offline | ✅ Fonctionne offline |
