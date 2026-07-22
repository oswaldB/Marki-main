# Workflow : Modifier une relance (PouchDB)

## Écran
`relances.html`

## Élément déclencheur
Bouton avec `@click="editRelance(relance, payeur)"`

## Action
Ouvrir l'édition d'une relance existante

## Description
- Charge les données de la relance depuis PouchDB
- Affiche le formulaire d'édition
- Permet de modifier date, type, contenu

## Data Model
**Page Function:** `relancesPage()`

**Stores Alpine.js:**
- $store.ui

**Données (depuis PouchDB):**
- `payeurs` - payeurs depuis PouchDB
- `stats` - statistiques calculées côté client
- `sequences` - séquences depuis PouchDB
- `searchQuery`
- `filterStatut`
- `editorContent`
- `editorMode`
- `db` - instance PouchDB

**États UI:**
- `loading`
- `error`
- `expandedPayeur`
- `showNewRelanceModal`
- `showEditRelanceModal`
- `showSequenceModal`

## State Changes

**Modifications:**
- `editingRelance` ← copie des données de la relance à éditer
- `showEditRelanceModal` ← `true`

## PouchDB Operations

**Aucun** - Ce workflow est une action UI qui prépare l'édition. Les modifications sont sauvegardées par un autre workflow (ex: `save-relance` ou `update-relance`).

Les données affichées proviennent de PouchDB (chargées par `initial-load`), mais ce workflow n'effectue aucune opération de base de données.

## API Calls

**Pas d'appel API** - Action côté client uniquement avec données PouchDB déjà chargées

## Organisation des fichiers

```
frontend/
└── app/
    └── relances/
        ├── index.html
        ├── components/
        │   └── (composants partagés)
        └── js/
            └── edit-relance.js
```

### Fichier principal
- **HTML** : `frontend/app/relances/index.html`
- **Point d'entrée** : Initialise la page Alpine.js avec PouchDB

### Fichier workflow
- **JS** : `frontend/app/relances/js/edit-relance.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/relances/js/edit-relance.js
export function editRelance() {
  // Implementation avec données PouchDB
}
```

## Implementation

```javascript
editRelance(item) {
  // 1. Clone item to editing (données depuis PouchDB)
  this.editingRelance = { 
    ...item,
    // S'assurer que les données PouchDB sont bien copiées
    _id: item._id,
    _rev: item._rev,
    type: item.type
  };
  
  // 2. Show edit modal
  this.showEditRelanceModal = true;
  
  // 3. Charger les séquences disponibles depuis PouchDB si besoin
  if (!this.sequences?.length) {
    this.loadSequences();
  }
}

// Option: Charger les séquences depuis PouchDB
async loadSequences() {
  try {
    const result = await dbSequences.allDocs({
      startkey: 'sequence:',
      endkey: 'sequence:\ufff0',
      include_docs: true
    });
    
    this.sequences = result.rows.map(r => r.doc);
  } catch (error) {
    console.error('Erreur chargement séquences:', error);
  }
}
```

## Notes

- **Action UI uniquement** : Ce workflow prépare l'édition mais ne sauvegarde pas
- **Données PouchDB** : Les données de la relance proviennent de PouchDB
- **Sauvegarde** : Voir workflow `save-relance.md` ou `modifier-relance.md` pour la persistence
- **Instantané** : L'ouverture du modal est immédiate

---

## Migration depuis l'ancienne architecture

| Aspect | Avant | Après (PouchDB) |
|--------|-------|-----------------|
| Action | Côté client | **Conservé** - Côté client |
| Source données | Props/Store | PouchDB (déjà chargé) |
| Latence | Instantanée | Instantanée |
| Offline | ✅ Oui | ✅ Oui |
