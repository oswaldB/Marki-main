# Workflow : Nouvelle relance

## Écran
`relances.html`

## Élément déclencheur
Bouton avec `@click="openNewRelanceModal(payeur)"`

## Action
Ouvrir le modal de création d'une relance

## Description
- Affiche le formulaire de nouvelle relance
- Pré-remplit avec les infos du payeur
- Permet de choisir type et contenu

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

**Pas d'appel API pour l'ouverture** - Le modal est purement côté client.

> **Note** : Le bouton "Créer" déclenche un workflow séparé `create-relance.md` qui fait un appel API `POST /api/relances`.

## Organisation des fichiers

```
frontend/
└── app/
    └── relances/
        ├── index.html
        ├── components/
        │   └── (composants partagés)
        └── js/
            └── new-relance.js
```

### Fichier principal
- **HTML** : `frontend/app/relances/index.html`
- **Point d'entrée** : Initialise la page Alpine.js

### Fichier workflow
- **JS** : `frontend/app/relances/js/new-relance.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/relances/js/new-relance.js
export function newRelance() {
  // Implementation du workflow
}
```

## Implementation

```javascript
newRelance() {
  // 1. Reset form
  this.newRelance = this.getInitialState();
  
  // 2. Show modal
  this.showNewRelanceModal = true;
  
  // 3. Focus first input
  this.$nextTick(() => {
    this.$refs.firstInput?.focus();
  });
}
```

## Logs (console.log) - OBLIGATOIRE

Chaque étape du workflow doit être loguée avec `console.log()`:

| Checkpoint | Instruction console.log |
|------------|------------------------|
| `start` | `console.log('[WORKFLOW.relances-new-relance] START: Ouverture du modal nouvelle relance')` |
| `state-initialized` | `console.log('[WORKFLOW.relances-new-relance] STEP: Formulaire réinitialisé avec getInitialState()')` |
| `modal-shown` | `console.log('[WORKFLOW.relances-new-relance] STEP: showNewRelanceModal = true')` |
| `first-input-focused` | `console.log('[WORKFLOW.relances-new-relance] STEP: Focus placé sur le premier champ du formulaire')` |
| `state-applied` | `console.log('[WORKFLOW.relances-new-relance] DATA: État après ouverture:', {showNewRelanceModal, newRelance})` |
| `end` | `console.log('[WORKFLOW.relances-new-relance] SUCCESS: Modal nouvelle relance ouvert en', duree, 'ms')` |
| `error` | `console.error('[WORKFLOW.relances-new-relance] ERROR:', error)` |
