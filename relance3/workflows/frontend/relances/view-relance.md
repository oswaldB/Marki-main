# Workflow : Voir détail relance (PouchDB)

## Écran
`relances.html`

## Élément déclencheur
Bouton avec `@click="viewRelance(relance)"`

## Action
Afficher le détail d'une relance

## Description
- Ouvre le modal de détail
- Affiche le contenu complet (données depuis PouchDB)
- Montre l'historique et le statut

## Data Model
**Page Function:** `relancesPage()`

**Stores Alpine.js:**
- $store.ui

**Données (depuis PouchDB, déjà chargées):**
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
- `showViewRelanceModal` - modal de visualisation
- `selectedRelance` - relance sélectionnée

## State Changes

**Modifications:**
- `selectedRelance` ← relance à afficher
- `showViewRelanceModal` ← `true`

## PouchDB Operations

**Aucun appel PouchDB direct** - Ce workflow est une action UI qui affiche le détail d'une relance déjà chargée depuis PouchDB.

Si les données complètes de la relance ne sont pas en mémoire, elles peuvent être récupérées via `db.get()`.

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
            └── view-relance.js
```

### Fichier principal
- **HTML** : `frontend/app/relances/index.html`
- **Point d'entrée** : Initialise la page Alpine.js avec PouchDB

### Fichier workflow
- **JS** : `frontend/app/relances/js/view-relance.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/relances/js/view-relance.js
export function viewRelance() {
  // Implementation avec données PouchDB
}
```

## Implementation

```javascript
viewRelance(relance) {
  // 1. Stocker la relance sélectionnée (déjà en mémoire depuis PouchDB)
  this.selectedRelance = relance;
  
  // 2. Afficher le modal de détail
  this.showViewRelanceModal = true;
}

// Option: si on a seulement l'ID, charger depuis PouchDB
async viewRelanceById(id) {
  try {
    this.loading = true;
    
    // Charger depuis PouchDB si pas en mémoire
    const relance = await db.get('relance:' + id);
    this.selectedRelance = relance;
    
    // Charger le payeur associé si besoin
    const payeur = await dbContacts.get('contact:' + relance.contact_id);
    this.selectedPayeur = payeur;
    
    this.showViewRelanceModal = true;
    
  } catch (error) {
    console.error('Erreur chargement relance:', error);
    this.toast('Erreur lors du chargement', 'error');
  } finally {
    this.loading = false;
  }
}

// Navigation vers page de détail (option)
navigateToDetail(id) {
  window.location.href = `./relances-detail.html?id=${id}`;
}
```

## Notes

- **Action UI uniquement** : Ce workflow affiche le modal avec les données déjà présentes
- **Données PouchDB** : Les relances sont chargées depuis PouchDB par d'autres workflows (ex: `initial-load`)
- **Pour données complètes** : Voir workflow `details-relance.md` qui charge toutes les données associées
- **Instantané** : L'affichage est immédiat si les données sont en mémoire

---

## Migration depuis l'ancienne architecture

| Aspect | Avant | Après (PouchDB) |
|--------|-------|-----------------|
| Action | Côté client | **Conservé** - Côté client |
| Source données | Props/Store | PouchDB (déjà chargé) |
| Chargement détail | API si besoin | `db.get()` si données manquantes |
| Latence | Instantanée | Instantanée (données en mémoire) |
| Offline | ✅ Oui | ✅ Oui |
