# Workflow : Fermer le modal relance (PouchDB)

## Écran
`relances.html`

## Élément déclencheur
Bouton avec `@click="showRelanceModal = false"`

## Action
Fermer le modal de relance

## Description
- Masque le modal actuel
- Retour à la liste
- Réinitialise les états temporaires (pas de modification PouchDB)

## Data Model
**Page Function:** `relancesPage()`

**Stores Alpine.js:**
- $store.ui

**Données (depuis PouchDB, affichées dans le modal):**
- `payeurs` - payeurs depuis PouchDB
- `stats` - statistiques calculées côté client
- `sequences` - séquences depuis PouchDB
- `searchQuery`
- `filterStatut`
- `editorContent`
- `editorMode`

**États UI:**
- `loading`
- `error`
- `expandedPayeur`
- `showNewRelanceModal`
- `showEditRelanceModal`
- `showSequenceModal`

## State Changes

**Modifications:**
- `showNewRelanceModal` ← `false`
- `showEditRelanceModal` ← `false`
- `showSequenceModal` ← `false`
- `selectedItem` ← `null`
- `editingItem` ← `null`
- `validationErrors` ← `{}`

## PouchDB Operations

**Aucun** - Ce workflow est purement une action UI. Il ne modifie pas PouchDB.

Les données affichées dans le modal proviennent de PouchDB (chargées par `initial-load`), mais la fermeture du modal n'implique aucune opération de base de données.

## API Calls

**Pas d'appel API** - Action côté client uniquement

## Organisation des fichiers

```
frontend/
└── app/
    └── relances/
        ├── index.html
        ├── components/
        │   └── (composants partagés)
        └── js/
            └── close-modal.js
```

### Fichier principal
- **HTML** : `frontend/app/relances/index.html`
- **Point d'entrée** : Initialise la page Alpine.js avec PouchDB

### Fichier workflow
- **JS** : `frontend/app/relances/js/close-modal.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/relances/js/close-modal.js
export function closeModal() {
  // Implementation avec PouchDB (pas d'opération DB)
}
```

## Implementation

```javascript
closeModal() {
  // 1. Hide modal
  this.showNewRelanceModal = false;
  this.showEditRelanceModal = false;
  this.showSequenceModal = false;
  
  // 2. Reset selected
  this.selectedItem = null;
  this.editingItem = null;
  
  // 3. Clear validation errors
  this.validationErrors = {};
  this.error = null;
  
  // 4. Optionnel: Réinitialiser le contenu de l'éditeur
  this.editorContent = '';
  this.editorMode = 'create';
}
```

## Notes

- **Action UI uniquement** : Ce workflow ne touche pas à PouchDB
- **Données PouchDB** : Les données affichées dans le modal proviennent de PouchDB (chargées par d'autres workflows comme `initial-load` ou `open-modal`)
- **Pas d'annulation** : Si des modifications ont été faites dans le modal sans sauvegarder, elles sont perdues à la fermeture
- **Instantané** : La fermeture est immédiate

---

## Migration depuis l'ancienne architecture

| Aspect | Avant | Après (PouchDB) |
|--------|-------|-----------------|
| Action | Côté client | **Conservé** - Côté client |
| Source données | Props/Store | PouchDB (affichage uniquement) |
| Latence | Instantanée | Instantanée |
| Offline | ✅ Oui | ✅ Oui |
