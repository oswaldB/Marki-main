# Workflow : Déplier/Replier email

## Écran
`sequences-suivi-detail.html`

## Élément déclencheur
Bouton avec `@click="email.collapsed = !email.collapsed"`

## Action
Basculer l'affichage d'un email

## Description
- Déplie pour éditer
- Replie pour compacter la vue

## Data Model
**Page Function:** `sequencesSuiviDetailPage()`

**Stores Alpine.js:**
- $store.ui

**Données:**
- `sequence`
- `etapes`
- `typeRelanceOptions`
- `selectedType`

**États UI:**
- `loading`
- `error`
- `saving`

## State Changes

**Modifications:** États UI spécifiques selon implémentation

## API Calls

**Pas d'appel API** - Action côté client uniquement



## Organisation des fichiers

```
frontend/
└── app/
    └── sequences-suivi-detail/
        ├── index.html
        ├── components/
        │   └── (composants partagés)
        └── js/
            └── toggle-collapse.js
```

### Fichier principal
- **HTML** : `frontend/app/sequences-suivi-detail/index.html`
- **Point d'entrée** : Initialise la page Alpine.js

### Fichier workflow
- **JS** : `frontend/app/sequences-suivi-detail/js/toggle-collapse.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/sequences-suivi-detail/js/toggle-collapse.js
export function toggleCollapse() {
  // Implementation du workflow
}
```

## Implementation

```javascript
toggleItem() {
  // 1. Toggle boolean state
  this.showModal = !this.showModal;
  // OR
  this.isExpanded = !this.isExpanded;
  
  // 2. If opening, prepare data
  if (this.showModal) {
    this.prepareModalData();
  }
}
``
## Logs (console.log) - OBLIGATOIRE

Chaque étape du workflow doit être loguée avec `console.log()`:

| Checkpoint | Instruction console.log |
|------------|------------------------|
| `start` | `console.log('[WORKFLOW.sequences-suivi-detail-toggle-collapse] START: Bascule du pli/dépli d\\'un email')` |
| `state-toggled` | `console.log('[WORKFLOW.sequences-suivi-detail-toggle-collapse] STEP: email.collapsed =', email.collapsed)` |
| `ui-updated` | `console.log('[WORKFLOW.sequences-suivi-detail-toggle-collapse] STEP: DOM mis à jour (classe CSS / x-show appliqué)')` |
| `data-synced` | `console.log('[WORKFLOW.sequences-suivi-detail-toggle-collapse] DATA: État après bascule:', { collapsed: email.collapsed, id: email.id })` |
| `end` | `console.log('[WORKFLOW.sequences-suivi-detail-toggle-collapse] SUCCESS: Email', email.collapsed ? 'replié' : 'déplié', 'en', duree, 'ms')` |
| `error` | `console.error('[WORKFLOW.sequences-suivi-detail-toggle-collapse] ERROR:', error)` |
