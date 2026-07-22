# Workflow : Filtrer tout (PouchDB)

## Écran
`relances-validation.html`

## Élément déclencheur
Bouton avec `@click="filterType = 'all'; filterToday = false"`

## Action
Afficher toutes les relances à valider (données PouchDB)

## Description
- Réinitialise les filtres
- Affiche email et courrier
- Désactive le filtre "aujourd'hui"
- Filtrage côté client sur données PouchDB

## Data Model
**Page Function:** `relancesValidationPage()`

**Stores Alpine.js:**
- $store.ui

**Données (depuis PouchDB):**
- `relancesAValider` - relances depuis PouchDB
- `selectedRelances`
- `selectAll`
- `filterType` ← `'all'`
- `filterToday` ← `false`

**États UI:**
- `loading`
- `error`
- `previewMode`
- `previewRelance`
- `processing`

## State Changes

**Modifications:**
- `filterType` ← `'all'`
- `filterToday` ← `false`
- `filteredRelances` ← toutes les relances

## PouchDB Operations

**Aucun appel direct** - Ce workflow filtre les données déjà chargées depuis PouchDB.

Les données sont chargées par `initial-load` puis filtrées côté client.

## API Calls

**Pas d'appel API** - Filtrage côté client uniquement

## Organisation des fichiers

```
frontend/
└── app/
    └── relances-validation/
        ├── index.html
        ├── components/
        │   └── (composants partagés)
        └── js/
            └── filter-all.js
```

### Fichier principal
- **HTML** : `frontend/app/relances-validation/index.html`
- **Point d'entrée** : Initialise la page Alpine.js avec PouchDB

### Fichier workflow
- **JS** : `frontend/app/relances-validation/js/filter-all.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/relances-validation/js/filter-all.js
export function filterAll() {
  // Implementation avec PouchDB (filtrage côté client)
}
```

## Implementation

```javascript
filterAll() {
  this.filterType = 'all';
  this.filterToday = false;
  // Le computed property filteredRelances se met à jour automatiquement
}

// Computed property pour filtrer
get filteredRelances() {
  let result = [...this.relancesAValider]; // Données depuis PouchDB
  
  // Filtre par type
  if (this.filterType !== 'all') {
    result = result.filter(r => r.type === this.filterType);
  }
  
  // Filtre par date (aujourd'hui)
  if (this.filterToday) {
    const today = new Date().toISOString().split('T')[0];
    result = result.filter(r => r.date_envoi_programmee?.startsWith(today));
  }
  
  // Filtre de recherche
  if (this.searchQuery) {
    const query = this.searchQuery.toLowerCase();
    result = result.filter(r => 
      r.objet?.toLowerCase().includes(query) ||
      r.payeur_nom?.toLowerCase().includes(query)
    );
  }
  
  return result;
}
```

## Notes

- **Filtrage côté client** : Les données proviennent de PouchDB (chargées par `initial-load`)
- **Instantané** : Le filtrage est immédiat
- **Pas de requête** : Aucun appel PouchDB supplémentaire

---

## Migration depuis l'ancienne architecture

| Aspect | Avant | Après (PouchDB) |
|--------|-------|-----------------|
| Action | Côté client | **Conservé** - Côté client |
| Source données | Props/Store | PouchDB (déjà chargé) |
| Filtrage | Côté client | Côté client sur données PouchDB |
| Latence | Instantanée | Instantanée |
| Offline | ✅ Oui | ✅ Oui |
