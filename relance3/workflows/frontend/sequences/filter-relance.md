# Workflow : Filtrer séquences relance (PouchDB)

## Écran
`sequences.html`

## Élément déclencheur
Bouton avec `@click="filterType = 'relance'"`

## Action
Afficher uniquement les séquences de relance (filtrage côté client sur données PouchDB)

## Description
- Filtre sur type = relance
- Masque les séquences de suivi
- Filtrage côté client sur données PouchDB

## Data Model
**Page Function:** `sequencesPage()`

**Stores Alpine.js:**
- $store.ui

**Données (depuis PouchDB):**
- `sequences` - séquences depuis PouchDB
- `searchQuery`
- `filterType` ← `'relance'`
- `newSequence`

**États UI:**
- `loading`
- `error`
- `showNewSequenceModal`
- `showEditSequenceModal`
- `showDeleteModal`
- `editingSequence`
- `deletingSequence`

## State Changes

**Modifications:**
- `filterType` ← `'relance'`
- `filteredSequences` ← séquences de type relance

## PouchDB Operations

**Aucun appel direct** - Ce workflow filtre les données déjà chargées depuis PouchDB.

## API Calls

**Pas d'appel API** - Filtrage côté client uniquement

## Organisation des fichiers

```
frontend/
└── app/
    └── sequences/
        ├── index.html
        ├── components/
        │   └── (composants partagés)
        └── js/
            └── filter-relance.js
```

### Fichier principal
- **HTML** : `frontend/app/sequences/index.html`
- **Point d'entrée** : Initialise la page Alpine.js avec PouchDB

### Fichier workflow
- **JS** : `frontend/app/sequences/js/filter-relance.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/sequences/js/filter-relance.js
export function filterRelance() {
  // Implementation avec PouchDB (filtrage côté client)
}
```

## Implementation

```javascript
filterRelance() {
  this.filterType = 'relance';
  // Le computed property filteredSequences se met à jour automatiquement
}

// Computed property pour filtrer
get filteredSequences() {
  let result = [...this.sequences]; // Données depuis PouchDB
  
  // Filtre par type (relance)
  if (this.filterType === 'relance') {
    result = result.filter(s => s.type_sequence === 'relances');
  }
  
  // Filtre de recherche
  if (this.searchQuery) {
    const query = this.searchQuery.toLowerCase();
    result = result.filter(s => 
      s.nom?.toLowerCase().includes(query) ||
      s.description?.toLowerCase().includes(query)
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
