# Workflow : Publier/Dépublier séquence suivi

## Écran
`sequences-suivi-detail.html`

## Élément déclencheur
Bouton avec `@click="togglePublication()"`

## Action
Basculer le statut de publication

## Description
- Active/désactive la séquence de suivi
- Publie ou met en brouillon

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
            └── toggle-publication.js
```

### Fichier principal
- **HTML** : `frontend/app/sequences-suivi-detail/index.html`
- **Point d'entrée** : Initialise la page Alpine.js

### Fichier workflow
- **JS** : `frontend/app/sequences-suivi-detail/js/toggle-publication.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/sequences-suivi-detail/js/toggle-publication.js
export function togglePublication() {
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
```

## Logs (console.log) - OBLIGATOIRE

Chaque étape du workflow doit être loguée avec `console.log()`:

| Checkpoint | Instruction console.log |
|------------|------------------------|
| `start` | `console.log('[WORKFLOW.sequences-suivi-detail-toggle-publication] START: Basculement du statut de publication')` |
| `state-toggled` | `console.log('[WORKFLOW.sequences-suivi-detail-toggle-publication] STEP: Statut publication inversé', {previousStatus, newStatus})` |
| `api-call` | `console.log('[WORKFLOW.sequences-suivi-detail-toggle-publication] API: PATCH /api/sequences-suivi/:id/publish avec payload', {published: newStatus})` |
| `state-updated` | `console.log('[WORKFLOW.sequences-suivi-detail-toggle-publication] STEP: Séquence mise à jour avec nouveau statut', {id: sequence.id, published: newStatus})` |
| `end` | `console.log('[WORKFLOW.sequences-suivi-detail-toggle-publication] SUCCESS: Statut publication basculé en', duree, 'ms')` |
| `error` | `console.error('[WORKFLOW.sequences-suivi-detail-toggle-publication] ERROR:', error)` |
