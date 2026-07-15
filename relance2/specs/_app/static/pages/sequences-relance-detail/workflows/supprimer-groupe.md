# Workflow : Supprimer groupe de variables

## Écran
`sequences-relance-detail.html`

## Élément déclencheur
Bouton avec `@click="supprimerGroupe(gIdx)"`

## Action
Supprimer un groupe de variables

## Description
- Supprime le groupe personnalisé
- Les variables restent disponibles

## Data Model
**Page Function:** `sequencesRelanceDetailPage()`

**Stores Alpine.js:**
- $store.ui

**Données:**
- `sequence`
- `etapes`
- `modeles`
- `activeTab`
- `draggingEtape`
- `editingEtape`
- `editorInstance`

**États UI:**
- `loading`
- `error`
- `saving`
- `hasChanges`
- `showEtapeModal`
- `showModeleModal`
- `showDeleteEtapeModal`

## State Changes

**Modifications:** États UI spécifiques selon implémentation

## API Calls

**Pas d'appel API** - Action côté client uniquement



## Organisation des fichiers

```
frontend/
└── app/
    └── sequences-relance-detail/
        ├── index.html
        ├── components/
        │   └── (composants partagés)
        └── js/
            └── supprimer-groupe.js
```

### Fichier principal
- **HTML** : `frontend/app/sequences-relance-detail/index.html`
- **Point d'entrée** : Initialise la page Alpine.js

### Fichier workflow
- **JS** : `frontend/app/sequences-relance-detail/js/supprimer-groupe.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/sequences-relance-detail/js/supprimer-groupe.js
export function supprimerGroupe() {
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
| `start` | `console.log('[WORKFLOW.sequences-relance-detail-supprimer-groupe] START: Suppression du groupe de variables', gIdx)` |
| `confirmation` | `console.log('[WORKFLOW.sequences-relance-detail-supprimer-groupe] STEP: Confirmation de suppression affichée pour le groupe', gIdx)` |
| `state-updated` | `console.log('[WORKFLOW.sequences-relance-detail-supprimer-groupe] DATA: Groupe retiré du state:', { gIdx, groupesRestants: this.groupesVariables.length })` |
| `end` | `console.log('[WORKFLOW.sequences-relance-detail-supprimer-groupe] SUCCESS: Groupe supprimé en', duree, 'ms')` |
| `error` | `console.error('[WORKFLOW.sequences-relance-detail-supprimer-groupe] ERROR:', error)` |
```