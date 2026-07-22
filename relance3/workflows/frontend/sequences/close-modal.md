# Workflow : Fermer le modal nouvelle séquence (PouchDB)

## Écran
`sequences.html`

## Élément déclencheur
Bouton avec `@click="showNewSequenceModal = false"`

## Action
Annuler la création de séquence

## Description
- Ferme le modal
- Annule sans créer
- Aucune opération PouchDB (action UI uniquement)

## Data Model
**Page Function:** `sequencesPage()`

**Stores Alpine.js:**
- $store.ui

**Données (en mémoire, depuis PouchDB):**
- `sequences` - séquences depuis PouchDB
- `searchQuery`
- `filterType`
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
- `showNewSequenceModal` ← `false`
- `editingSequence` ← `null`
- `newSequence` ← réinitialisé

## PouchDB Operations

**Aucun** - Ce workflow est purement une action UI. Il ne modifie pas PouchDB.

Les données des séquences proviennent de PouchDB (chargées par `initial-load`), mais ce workflow n'effectue aucune opération de base de données.

## API Calls

**Pas d'appel API** - Action côté client uniquement

## Organisation des fichiers

```
frontend/
└── app/
    └── sequences/
        ├── index.html
        ├── components/
        │   └── (composants partagés)
        └── js/
            └── close-modal.js
```

### Fichier principal
- **HTML** : `frontend/app/sequences/index.html`
- **Point d'entrée** : Initialise la page Alpine.js avec PouchDB

### Fichier workflow
- **JS** : `frontend/app/sequences/js/close-modal.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/sequences/js/close-modal.js
export function closeModal() {
  // Implementation avec PouchDB (pas d'opération DB)
}
```

## Implementation

```javascript
closeModal() {
  // 1. Hide modal
  this.showNewSequenceModal = false;
  this.showEditSequenceModal = false;
  this.showDeleteModal = false;
  
  // 2. Reset selected
  this.selectedItem = null;
  this.editingItem = null;
  this.editingSequence = null;
  this.deletingSequence = null;
  
  // 3. Reset new sequence form
  this.newSequence = this.getInitialSequenceState();
  
  // 4. Clear validation errors
  this.validationErrors = {};
  this.error = null;
}

getInitialSequenceState() {
  return {
    nom: '',
    description: '',
    etapes: []
  };
}
```

## Notes

- **Action UI uniquement** : Ce workflow ne touche pas à PouchDB
- **Données PouchDB** : Les séquences sont chargées depuis PouchDB (par d'autres workflows)
- **Instantané** : La fermeture est immédiate

---

## Migration depuis l'ancienne architecture

| Aspect | Avant | Après (PouchDB) |
|--------|-------|-----------------|
| Action | Côté client | **Conservé** - Côté client |
| Source données | Props/Store | PouchDB (déjà chargé) |
| Latence | Instantanée | Instantanée |
| Offline | ✅ Oui | ✅ Oui |
