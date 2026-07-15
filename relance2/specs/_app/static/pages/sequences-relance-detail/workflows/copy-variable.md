# Workflow : Copier variable

## Écran
`sequences-relance-detail.html`

## Élément déclencheur
Tag avec `@click="copyVariable(v)"`

## Action
Copier une variable dans le presse-papiers

## Description
- Copie la syntaxe [[variable]]
- Peut être collé dans le contenu
- Variables disponibles : payeur, montant, etc.

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

**Modifications:**
- Toast de confirmation 'Variable copiée' affiché (succès)
- Toast d'erreur affiché si le navigateur refuse l'accès au presse-papiers
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
            └── copy-variable.js
```

### Fichier principal
- **HTML** : `frontend/app/sequences-relance-detail/index.html`
- **Point d'entrée** : Initialise la page Alpine.js

### Fichier workflow
- **JS** : `frontend/app/sequences-relance-detail/js/copy-variable.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/sequences-relance-detail/js/copy-variable.js
export function copyVariable() {
  // Implementation du workflow
}
```

## Implementation

```javascript
async copyVariable(text) {
  try {
    await navigator.clipboard.writeText(text);
    Alpine.store('ui').addToast('Variable copiée', 'success');
  } catch (err) {
    Alpine.store('ui').addToast('Échec de la copie', 'error');
  }
}
```

## Logs (console.log) - OBLIGATOIRE

Chaque étape du workflow doit être loguée avec `console.log()`:

| Checkpoint | Instruction console.log |
|------------|------------------------|
| `start` | `console.log('[WORKFLOW.sequences-relance-detail-copy-variable] START: Copie de la variable', text)` |
| `copied` | `console.log('[WORKFLOW.sequences-relance-detail-copy-variable] STEP: Variable copiée dans le presse-papiers via navigator.clipboard.writeText')` |
| `toast-shown` | `console.log('[WORKFLOW.sequences-relance-detail-copy-variable] STEP: Toast de confirmation "Variable copiée" affiché (success)')` |
| `end` | `console.log('[WORKFLOW.sequences-relance-detail-copy-variable] SUCCESS: Copie terminée en', duree, 'ms')` |
| `error` | `console.error('[WORKFLOW.sequences-relance-detail-copy-variable] ERROR: Échec de la copie dans le presse-papiers', err)` |
