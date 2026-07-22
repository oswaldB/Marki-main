# Workflow : Désélectionner (PouchDB)

## Écran
`relances-validation.html`

## Élément déclencheur
Bouton avec `@click="selectedRelance = null"`

## Action
Désélectionner la relance active

## Description
- Efface la sélection
- Masque le panneau d'action
- Aucune opération PouchDB (action UI uniquement)

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
- `selectedRelances` ← vide ou null
- `selectAll` ← false

## PouchDB Operations

**Aucun** - Ce workflow est purement une action UI. Il ne modifie pas PouchDB.

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
            └── deselect-relance.js
```

### Fichier principal
- **HTML** : `frontend/app/relances-validation/index.html`
- **Point d'entrée** : Initialise la page Alpine.js avec PouchDB

### Fichier workflow
- **JS** : `frontend/app/relances-validation/js/deselect-relance.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/relances-validation/js/deselect-relance.js
export function deselectRelance() {
  // Implementation avec PouchDB (pas d'opération DB)
}
```

## Implementation

```javascript
// Single deselect
deselectRelance() {
  this.selectedRelance = null;
  this.previewMode = false;
}

// Multi-deselect
clearSelection() {
  this.selectedRelances = [];
  this.selectAll = false;
}

// Toggle selection
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
  } else {
    this.selectedRelances = [];
  }
}
```

## Notes

- **Action UI uniquement** : Ce workflow ne touche pas à PouchDB
- **Données PouchDB** : Les relances sont chargées depuis PouchDB (par `initial-load`)
- **Instantané** : La désélection est immédiate

---

## Migration depuis l'ancienne architecture

| Aspect | Avant | Après (PouchDB) |
|--------|-------|-----------------|
| Action | Côté client | **Conservé** - Côté client |
| Source données | Props/Store | PouchDB (déjà chargé) |
| Latence | Instantanée | Instantanée |
| Offline | ✅ Oui | ✅ Oui |
