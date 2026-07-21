---
id: filter-suivi-pouchdb
type: frontend
screen: sequences
description: Filtrer les séquences de suivi avec PouchDB (local-first)
---

# filter-suivi-pouchdb : Filtrer séquences suivi

## Description

Afficher uniquement les séquences de suivi avec l'architecture **PouchDB/CouchDB**.

**Important** : Ce workflow ne fait **pas d'appel API** - le filtrage est effectué côté client sur les données déjà présentes dans PouchDB local.

---

## Changements Architecture

| Aspect | API REST (Avant) | PouchDB (Après) |
|--------|------------------|-----------------|
| **Données** | Chargées via API | Déjà dans IndexedDB (PouchDB) |
| **Filtrage** | Query param `/api/sequences?type=suivi` | `array.filter()` côté client |
| **Performance** | Latence réseau | Instantané (local) |
| **Offline** | Échoue sans réseau | Fonctionne toujours |

---

## Data Flow

```
┌─────────────────────────────────────────────────┐
│                   CLIENT                        │
│                                                 │
│  ┌─────────────┐      ┌─────────────────────┐  │
│  │   Bouton    │─────▶│  Alpine.js          │  │
│  │ "Suivi"     │      │  filterType =       │  │
│  └─────────────┘      │  'suivi'            │  │
│                       └─────────────────────┘  │
│                                │                │
│                                ▼                │
│                       ┌─────────────────────┐  │
│                       │  Computed Property  │  │
│                       │  filteredSequences  │  │
│                       └─────────────────────┘  │
│                                │                │
│                                ▼                │
│                       ┌─────────────────────┐  │
│                       │  PouchDB Local      │  │
│                       │  (déjà en mémoire)  │  │
│                       └─────────────────────┘  │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## Étapes du Workflow

```javascript
/**
 * @action 1: Utilisateur clique sur le bouton filtre "Suivi"
 * @trigger @click="filterSuivi()"
 * @checkpoint filter-button-clicked
 */

/**
 * @action 2: Mettre à jour le state filterType
 * @checkpoint filter-type-set
 */
this.filterType = 'suivi';

/**
 * @action 3: Le computed filteredSequences se recalcule automatiquement
 * @description Pas d'appel API - filtrage sur données locales
 * @checkpoint filtered-sequences-computed
 */
get filteredSequences() {
  let result = [...this.sequences];
  
  if (this.filterType !== 'all') {
    result = result.filter(seq => seq.sequence_type === this.filterType);
  }
  
  return result;
}

/**
 * @action 4: Alpine.js met à jour le DOM automatiquement
 * @checkpoint ui-updated
 */
```

---

## Implementation PouchDB

### Template HTML

```html
<!-- Filtres -->
<div class="filter-buttons" x-data="sequencesFilterPouchDB">
  
  <!-- Bouton Tous -->
  <button 
    @click="filterType = 'all'"
    :class="{ 'active': filterType === 'all' }"
  >
    Toutes (<span x-text="sequences.length"></span>)
  </button>
  
  <!-- Bouton Suivi -->
  <button 
    @click="filterSuivi()"
    :class="{ 'active': filterType === 'suivi' }"
  >
    Suivi (<span x-text="suiviCount"></span>)
  </button>
  
  <!-- Bouton Relance -->
  <button 
    @click="filterRelance()"
    :class="{ 'active': filterType === 'relance' }"
  >
    Relance (<span x-text="relanceCount"></span>)
  </button>
  
  <!-- Recherche -->
  <input 
    type="text" 
    x-model="searchQuery" 
    placeholder="Rechercher..."
  >
  
</div>

<!-- Liste filtrée -->
<div class="sequences-list">
  <template x-for="seq in filteredSequences" :key="seq._id">
    <div class="sequence-card">
      <!-- ... -->
    </div>
  </template>
  
  <!-- Empty state -->
  <div x-show="filteredSequences.length === 0">
    Aucune séquence trouvée
  </div>
</div>
```

### Code JavaScript

```javascript
// Charger PouchDB au niveau page
import { initPouchDB, setupReplication } from './pouchdb-utils.js';

Alpine.data('sequencesPage', () => ({
  db: null,
  sequences: [],
  syncStatus: 'initializing',
  
  async init() {
    // Initialiser PouchDB
    this.db = await initPouchDB('adti_sequences');
    
    // Configurer la réplication
    const sync = setupReplication(this.db);
    this.syncStatus = sync.state.status;
    
    // Charger les séquences
    const result = await this.db.allDocs({
      include_docs: true,
      startkey: 'sequence_',
      endkey: 'sequence_\ufff0'
    });
    
    this.sequences = result.rows
      .filter(row => row.doc.type === 'sequence')
      .map(row => row.doc);
  }
}));
```

---

## Différences avec l'original

### Avant (API REST)
```javascript
async filterSuivi() {
  this.loading = true;
  
  // Appel API avec filtre
  const response = await fetch('/api/sequences?type=suivi');
  this.sequences = await response.json();
  
  this.loading = false;
}
```

### Après (PouchDB)
```javascript
filterSuivi() {
  // Simple changement de state - pas d'appel API
  this.filterType = 'suivi';
  
  // Le computed se recalcule automatiquement
  // filteredSequences = this.sequences.filter(...)
}
```

---

## Avantages PouchDB

1. **Instantané** : Pas de latence réseau
2. **Offline-first** : Fonctionne sans connexion
3. **Moins de charge serveur** : Pas de requêtes pour chaque filtre
4. **UX fluide** : Pas de spinner de chargement

---

## Fichiers

| Fichier | Description |
|---------|-------------|
| `filter-suivi-pouchdb.js` | Composant Alpine.js avec PouchDB |
| `filter-suivi-pouchdb.md` | Cette documentation |
