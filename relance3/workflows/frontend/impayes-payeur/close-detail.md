# Workflow : Fermer le détail payeur

## Écran
`impayes-payeur.html`

## Élément déclencheur
Bouton avec `@click="expandedPayeur = null"`

## Action
Fermer le panneau de détail du payeur

## Description
- Masque le détail des factures du payeur
- Retour à la liste compacte
- **Action UI pure - les données proviennent de PouchDB**

## Data Model
**Page Function:** `impayesPayeurPage()`

**Stores Alpine.js:**
- $store.ui

**Données (depuis PouchDB):**
- `payeurs` - chargés depuis PouchDB via `initial-load`
- `searchQuery`
- `filterStatut`
- `sortBy`
- `sortDirection`

**États UI:**
- `loading` - chargement depuis PouchDB
- `error`
- `expandedPayeur` (ID du payeur dont le détail est ouvert)

## State Changes

**Modifications:**
- `expandedPayeur` passe à null

## PouchDB Calls

**Aucun** - Ce workflow est une action **UI uniquement** qui ferme le panneau de détail. Les données affichées proviennent déjà de PouchDB via les workflows parents.

## Organisation des fichiers

```
frontend/
└── app/
    └── impayes-payeur/
        ├── index.html
        ├── components/
        │   └── (composants partagés)
        └── js/
            └── close-detail.js
```

### Fichier principal
- **HTML** : `frontend/app/impayes-payeur/index.html`
- **Point d'entrée** : Initialise la page Alpine.js avec PouchDB

### Fichier workflow
- **JS** : `frontend/app/impayes-payeur/js/close-detail.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/impayes-payeur/js/close-detail.js
export function closeDetail() {
  // Implementation du workflow - action UI pure
}
```

## Implementation

```javascript
closeDetail() {
  // 1. Collapse payeur detail
  this.expandedPayeur = null;
  
  // 2. Clear validation errors
  this.error = null;
  
  // Note: les données (payeurs) proviennent de PouchDB
  // via les workflows parents, pas besoin de recharger
}
```

---

## Migration PouchDB

Ce workflow **ne nécessite pas de migration** car il n'utilise pas d'appel API.
C'est une action purement UI sur des données déjà chargées depuis PouchDB.

| Aspect | Implémentation |
|--------|----------------|
| Données affichées | PouchDB (via workflows parents) |
| Appels réseau | Aucun |
| Offline | ✅ Fonctionne offline |
