# Workflow : Modifier une relance

## Écran
`relances.html`

## Élément déclencheur
Bouton avec `@click="editRelance(relance, payeur)"`

## Action
Ouvrir l'édition d'une relance existante

## Description
- Charge les données de la relance
- Affiche le formulaire d'édition
- Permet de modifier date, type, contenu

## Data Model
**Page Function:** `relancesPage()`

**Stores Alpine.js:**
- $store.ui

**Données:**
- `payeurs`
- `stats`
- `sequences`
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

**Modifications:** États UI spécifiques selon implémentation

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
            └── edit-relance.js
```

### Fichier principal
- **HTML** : `frontend/app/relances/index.html`
- **Point d'entrée** : Initialise la page Alpine.js

### Fichier workflow
- **JS** : `frontend/app/relances/js/edit-relance.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/relances/js/edit-relance.js
export function editRelance() {
  // Implementation du workflow
}
```

## Implementation

```javascript
editRelance(item) {
  // 1. Clone item to editing
  this.editingRelance = { ...item };
  
  // 2. Show edit modal
  this.showEditRelanceModal = true;
}
```

## Logs (console.log) - OBLIGATOIRE

Chaque étape du workflow doit être loguée avec `console.log()`:

| Checkpoint | Instruction console.log |
|------------|------------------------|
| `start` | `console.log('[WORKFLOW.relances-edit-relance] START: Édition de la relance', {id: relance.id, payeurId: payeur.id})` |
| `item-cloned` | `console.log('[WORKFLOW.relances-edit-relance] STEP: Relance clonée dans editingRelance', {editingRelance})` |
| `validation` | `console.log('[WORKFLOW.relances-edit-relance] STEP: Validation des champs de la relance', {dateValide, typeValide, contenuValide})` |
| `api-call` | `console.log('[WORKFLOW.relances-edit-relance] API: PATCH /api/relances/{id}', payload)` |
| `state-updated` | `console.log('[WORKFLOW.relances-edit-relance] DATA: État après mise à jour:', {relances, editingRelance, showEditRelanceModal})` |
| `end` | `console.log('[WORKFLOW.relances-edit-relance] SUCCESS: Relance modifiée en', duree, 'ms')` |
| `error` | `console.error('[WORKFLOW.relances-edit-relance] ERROR:', error)` |