# Workflow : Ouvrir détail facture payeur

## Écran
`impayes-payeur.html`

## Élément déclencheur
Ligne avec `@click="openDetail(facture)"`

## Action
Ouvrir le modal de détail d'une facture

## Description
- Affiche le modal avec les détails complets
- Charge les informations de la facture sélectionnée depuis PouchDB
- Permet d'ajouter une note

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
- `loading`
- `error`
- `expandedPayeur`
- `selectedItem`
- `showModal`

## State Changes

**Modifications:**
- `selectedItem` ← facture sélectionnée
- `showModal` ← `true`

## PouchDB Calls

**Aucun appel direct** - La facture est passée directement depuis la liste (déjà chargée depuis PouchDB par `initial-load`).

**Optionnel:** Si besoin de données complémentaires :
```javascript
async loadDetailFromPouchDB(factureId) {
  const doc = await db.get('facture:' + factureId);
  return doc;
}
```

## Organisation des fichiers

```
frontend/
└── app/
    └── impayes-payeur/
        ├── index.html
        ├── components/
        │   └── (composants partagés)
        └── js/
            └── open-detail.js
```

### Fichier principal
- **HTML** : `frontend/app/impayes-payeur/index.html`
- **Point d'entrée** : Initialise la page Alpine.js avec PouchDB

### Fichier workflow
- **JS** : `frontend/app/impayes-payeur/js/open-detail.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/impayes-payeur/js/open-detail.js
export function openDetail() {
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
async loadDetailFromPouchDB(factureId) {
  try {
    const doc = await db.get('facture:' + factureId);
    this.selectedItemDetails = doc;
  } catch (err) {
    console.error('Erreur chargement détail:', err);
  }
}
```

## Navigation
- **Cible** : Modal détail
- **Fermeture** : Bouton X, clic sur overlay, ou touche Escape

---

## Migration PouchDB

Ce workflow **ne nécessite pas de migration** car il utilise les données déjà chargées depuis PouchDB.

| Aspect | Implémentation |
|--------|----------------|
| Données affichées | PouchDB (via `initial-load`) |
| Appels réseau | Aucun |
| Offline | ✅ Fonctionne offline |
