# Workflow : Éditer une relance calendrier (PouchDB)

## Écran
`relances-calendrier.html`

## Élément déclencheur
Bouton avec `@click="openEditRelance(relance)"`

## Action
Ouvrir l'édition d'une relance depuis le calendrier

## Description
- Ouvre le modal d'édition
- Charge les données de la relance (depuis PouchDB)
- Permet de modifier date et contenu

## Data Model
**Page Function:** `relancesCalendrierPage()`

**Stores Alpine.js:**
- $store.ui

**Données (depuis PouchDB):**
- `relancesProgrammees` - relances depuis PouchDB
- `currentDate`
- `viewMode`
- `selectedDate`
- `relancesDuJour`
- `editingItem` - relance en cours d'édition
- `db` - instance PouchDB

**États UI:**
- `loading`
- `error`
- `showEditPanel` - état d'affichage du panneau d'édition

## State Changes

**Modifications:**
- `editingItem` ← copie des données de la relance à éditer
- `showEditPanel` ← `true`
- `selectedRelance` ← relance sélectionnée

## PouchDB Operations

**Aucun appel PouchDB direct** - Ce workflow est une action UI qui prépare l'édition. Les données de la relance sont déjà chargées depuis PouchDB (par `initial-load`).

Si des données complémentaires sont nécessaires, elles peuvent être chargées via `db.get()`.

## API Calls

**Pas d'appel API** - Action côté client uniquement avec données PouchDB déjà chargées

## Organisation des fichiers

```
frontend/
└── app/
    └── relances-calendrier/
        ├── index.html
        ├── components/
        │   └── (composants partagés)
        └── js/
            └── open-edit-relance.js
```

### Fichier principal
- **HTML** : `frontend/app/relances-calendrier/index.html`
- **Point d'entrée** : Initialise la page Alpine.js avec PouchDB

### Fichier workflow
- **JS** : `frontend/app/relances-calendrier/js/open-edit-relance.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/relances-calendrier/js/open-edit-relance.js
export function openEditRelance() {
  // Implementation avec données PouchDB
}
```

## Implementation

```javascript
openEditRelance(relance) {
  // 1. Stocker la relance sélectionnée (déjà en mémoire depuis PouchDB)
  this.selectedRelance = relance;
  
  // 2. Cloner pour l'édition (pour ne pas modifier l'original directement)
  this.editingItem = {
    id: relance._id?.replace('relance:', ''),
    objet: relance.objet,
    corps: relance.corps,
    date_envoi: relance.date_envoi_programmee,
    statut: relance.statut,
    _rev: relance._rev
  };
  
  // 3. Afficher le panneau d'édition
  this.showEditPanel = true;
}

// Option: charger des données complémentaires depuis PouchDB
async openEditRelanceWithDetails(relanceId) {
  this.loading = true;
  
  try {
    // Charger depuis PouchDB si données complètes nécessaires
    const doc = await db.get('relance:' + relanceId);
    this.selectedRelance = doc;
    
    this.editingItem = {
      id: relanceId,
      objet: doc.objet,
      corps: doc.corps,
      date_envoi: doc.date_envoi_programmee,
      statut: doc.statut,
      _rev: doc._rev
    };
    
    this.showEditPanel = true;
    
  } catch (error) {
    console.error('Erreur chargement relance:', error);
    this.toast('Erreur lors du chargement', 'error');
  } finally {
    this.loading = false;
  }
}
```

## Notes

- **Action UI uniquement** : Ce workflow prépare l'édition mais ne sauvegarde pas
- **Données PouchDB** : Les relances sont chargées depuis PouchDB (par `initial-load`)
- **Sauvegarde** : Voir workflow `save-edit.md` pour la persistence dans PouchDB
- **Instantané** : L'ouverture du panneau est immédiate

---

## Migration depuis l'ancienne architecture

| Aspect | Avant | Après (PouchDB) |
|--------|-------|-----------------|
| Action | Côté client | **Conservé** - Côté client |
| Source données | Props/Store | PouchDB (déjà chargé) |
| Chargement détail | API si besoin | `db.get()` si nécessaire |
| Latence | Instantanée | Instantanée |
| Offline | ✅ Oui | ✅ Oui |
