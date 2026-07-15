# Workflow : Supprimer email suivi

## Écran
`sequences-suivi-detail.html`

## Élément déclencheur
Bouton avec `@click="supprimerEmail(idx)"`

## Action
Supprimer un email de la séquence

## Description
- Demande confirmation
- Supprime définitivement

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
            └── supprimer-email.js
```

### Fichier principal
- **HTML** : `frontend/app/sequences-suivi-detail/index.html`
- **Point d'entrée** : Initialise la page Alpine.js

### Fichier workflow
- **JS** : `frontend/app/sequences-suivi-detail/js/supprimer-email.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/sequences-suivi-detail/js/supprimer-email.js
export function supprimerEmail() {
  // Implementation du workflow
}
```

## Implementation

```javascript
supprimerSequence(index) {
  // 1. Remove from array
  this.sequences.splice(index, 1);
}

## Logs (console.log) - OBLIGATOIRE

Chaque étape du workflow doit être loguée avec `console.log()`:

| Checkpoint | Instruction console.log |
|------------|------------------------|
| `start` | `console.log('[WORKFLOW.sequences-suivi-detail-supprimer-email] START: Suppression d\'un email de la séquence')` |
| `confirmation` | `console.log('[WORKFLOW.sequences-suivi-detail-supprimer-email] STEP: Demande de confirmation affichée pour l\'email à l\'index', idx)` |
| `confirmed` | `console.log('[WORKFLOW.sequences-suivi-detail-supprimer-email] STEP: Confirmation acceptée par l\'utilisateur, suppression effective')` |
| `state-updated` | `console.log('[WORKFLOW.sequences-suivi-detail-supprimer-email] DATA: Email supprimé de etapes. Nouvel état:', {etapesLength: this.etapes.length, deletedIndex: idx})` |
| `end` | `console.log('[WORKFLOW.sequences-suivi-detail-supprimer-email] SUCCESS: Email supprimé en', duree, 'ms')` |
| `error` | `console.error('[WORKFLOW.sequences-suivi-detail-supprimer-email] ERROR:', error)` |
```