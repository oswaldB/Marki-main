# Workflow : Fermer modal événement

## Écran
`evenements.html`

## Élément déclencheur
Bouton avec `@click="showDetailModal = false"`

## Action
Fermer sans marquer comme lu

## Description
- Ferme le modal
- Garde le statut actuel
- **Action UI pure - pas d'appel API ou PouchDB**

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
- `loading`
- `loadingMore`
- `error`
- `selectedEvent`
- `showDetailModal`

## State Changes

**Modifications:**
- `selectedEvent` modifié
- `showDetailModal` modifié

## PouchDB Calls

**Aucun** - Ce workflow ne fait que changer l'état UI.
Les données affichées proviennent déjà de PouchDB via les workflows parents.



## Organisation des fichiers

```
frontend/
└── app/
    └── evenements/
        ├── index.html
        ├── components/
        │   └── (composants partagés)
        └── js/
            └── close-modal.js
```

### Fichier principal
- **HTML** : `frontend/app/evenements/index.html`
- **Point d'entrée** : Initialise la page Alpine.js avec PouchDB

### Fichier workflow
- **JS** : `frontend/app/evenements/js/close-modal.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/evenements/js/close-modal.js
export function closeModal() {
  // Implementation du workflow - action UI pure
}
```

## Implementation

```javascript
closeModal() {
  // 1. Hide modal
  this.showDetailModal = false;
  
  // 2. Reset selected
  this.selectedEvent = null;
  
  // 3. Clear validation errors
  this.error = null;
  
  // Note: les données (evenements) proviennent de PouchDB
  // via les workflows parents, pas besoin de recharger
}
```

---

## Migration PouchDB

Ce workflow **ne nécessite pas de migration** car il n'utilise pas d'appel API.
C'est une action purement UI.

| Aspect | Implémentation |
|--------|----------------|
| Données affichées | PouchDB (via workflows parents) |
| Appels réseau | Aucun |
| Offline | ✅ Fonctionne offline |
