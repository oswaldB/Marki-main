# Workflow : Voir détail relance

## Écran
`relances.html`

## Élément déclencheur
Bouton avec `@click="viewRelance(relance)"`

## Action
Afficher le détail d'une relance

## Description
- Ouvre le modal de détail
- Affiche le contenu complet
- Montre l'historique et le statut

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
            └── view-relance.js
```

### Fichier principal
- **HTML** : `frontend/app/relances/index.html`
- **Point d'entrée** : Initialise la page Alpine.js

### Fichier workflow
- **JS** : `frontend/app/relances/js/view-relance.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/relances/js/view-relance.js
export function viewRelance() {
  // Implementation du workflow
}
```

## Implementation

```javascript
viewRelance(id) {
  // 1. Navigate to detail
  window.location.href = `./relances-detail.html?id=${id}`;
}
```

## Logs (console.log) - OBLIGATOIRE

Chaque étape du workflow doit être loguée avec `console.log()`:

| Checkpoint | Instruction console.log |
|------------|------------------------|
| `start` | `console.log('[WORKFLOW.relances-view-relance] START: Affichage du détail relance', {id})` |
| `data-loaded` | `console.log('[WORKFLOW.relances-view-relance] STEP: Données de la relance chargées', relance)` |
| `modal-shown` | `console.log('[WORKFLOW.relances-view-relance] STEP: Modal de détail ouvert')` |
| `state-applied` | `console.log('[WORKFLOW.relances-view-relance] DATA: État après ouverture:', {showRelanceDetailModal, currentRelance, error})` |
| `end` | `console.log('[WORKFLOW.relances-view-relance] SUCCESS: Détail relance affiché en', duree, 'ms')` |
| `error` | `console.error('[WORKFLOW.relances-view-relance] ERROR:', error)` |