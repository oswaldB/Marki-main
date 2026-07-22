# Workflow : Sélectionner une relance (PouchDB)

## Écran
`relances-validation.html`

## Élément déclencheur
Ligne avec `@click="selectRelance(relance)"`

## Action
Sélectionner une relance pour action

## Description
- Met en évidence la relance
- Affiche les actions possibles
- Charge le détail à droite (données PouchDB)

## Data Model
**Page Function:** `relancesValidationPage()`

**Stores Alpine.js:**
- $store.ui

**Données (en mémoire, depuis PouchDB):**
- `relancesAValider` - relances depuis PouchDB
- `selectedRelances`
- `selectAll`

**États UI:**
- `loading`
- `error`
- `previewMode`
- `previewRelance`
- `processing`

## State Changes

**Modifications:**
- `selectedRelance` ← relance sélectionnée
- `previewMode` ← `true`

## PouchDB Operations

**Aucun** - Ce workflow est une action UI. Les données sont déjà en mémoire (chargées depuis PouchDB par `initial-load`).

## API Calls

**Pas d'appel API** - Action côté client uniquement

## Organisation des fichiers

```
frontend/
└── app/
    └── relances-validation/
        ├── index.html
        ├── components/
        │   └── (composants partagés)
        └── js/
            └── select-relance.js
```

### Fichier principal
- **HTML** : `frontend/app/relances-validation/index.html`
- **Point d'entrée** : Initialise la page Alpine.js avec PouchDB

### Fichier workflow
- **JS** : `frontend/app/relances-validation/js/select-relance.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/relances-validation/js/select-relance.js
export function selectRelance() {
  // Implementation avec PouchDB (pas d'opération DB)
}
```

## Implementation

```javascript
// Single select
selectRelance(relance) {
  this.selectedRelance = relance; // Données déjà en mémoire depuis PouchDB
  this.previewMode = true;
  this.previewRelance = relance;
}

// Multi-select
toggleSelection(id) {
  const index = this.selectedRelances.indexOf(id);
  if (index === -1) {
    this.selectedRelances.push(id);
  } else {
    this.selectedRelances.splice(index, 1);
  }
}

selectAll(checked) {
  if (checked) {
    // Sélectionner toutes les relances visibles (filtrées depuis PouchDB)
    this.selectedRelances = this.filteredRelances.map(item => item._id);
    this.selectAll = true;
  } else {
    this.selectedRelances = [];
    this.selectAll = false;
  }
}
```

## Notes

- **Action UI uniquement** : Ce workflow ne touche pas à PouchDB
- **Données PouchDB** : Les relances sont chargées depuis PouchDB (par `initial-load`)
- **Instantané** : La sélection est immédiate

---

## Migration depuis l'ancienne architecture

| Aspect | Avant | Après (PouchDB) |
|--------|-------|-----------------|
| Action | Côté client | **Conservé** - Côté client |
| Source données | Props/Store | PouchDB (déjà chargé) |
| Latence | Instantanée | Instantanée |
| Offline | ✅ Oui | ✅ Oui |
