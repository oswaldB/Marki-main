# Workflow : Copier lien de paiement
## Écran
`sequences-relance-detail.html`

## Élément déclencheur
Bouton avec `@click="copyToClipboard(lien.url)"`

## Action
Copier l'URL d'un lien de paiement

## Description
- Copie l'URL dans le presse-papiers
- Peut être collé dans l'email

## Data Model
**Page Function:** `sequencesRelanceDetailPage()`

**Stores Alpine.js:**
- $store.ui

**Données:**
- `sequence`
- `etapes`
- `modeles`
- `liensPaiement[]` (reçus via GET /api/liens-paiement?statut=actif)
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
- Toast de confirmation 'Lien copié' affiché (succès)
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
            └── copy-lien.js
```

### Fichier principal
- **HTML** : `frontend/app/sequences-relance-detail/index.html`
- **Point d'entrée** : Initialise la page Alpine.js

### Fichier workflow
- **JS** : `frontend/app/sequences-relance-detail/js/copy-lien.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/sequences-relance-detail/js/copy-lien.js
export function copyLien() {
  // Implementation du workflow
}
```

## Implementation

```javascript
async copyLien(text) {
  try {
    await navigator.clipboard.writeText(text);
    Alpine.store('ui').addToast('Lien copié dans le presse-papier', 'success');
  } catch (err) {
    Alpine.store('ui').addToast('Échec de la copie', 'error');
  }
}
```

## Logs (console.log) - OBLIGATOIRE

Chaque étape du workflow doit être loguée avec `console.log()`:

| Checkpoint | Instruction console.log |
|------------|------------------------|
| `start` | `console.log('[WORKFLOW.sequences-relance-detail-copy-lien] START: Copie du lien de paiement', { url: text })` |
| `copied` | `console.log('[WORKFLOW.sequences-relance-detail-copy-lien] STEP: URL copiée dans le presse-papier via navigator.clipboard.writeText')` |
| `toast-shown` | `console.log('[WORKFLOW.sequences-relance-detail-copy-lien] STEP: Toast de confirmation affiché via $store.ui.addToast()')` |
| `end` | `console.log('[WORKFLOW.sequences-relance-detail-copy-lien] SUCCESS: Lien copié en', duree, 'ms')` |
| `error` | `console.error('[WORKFLOW.sequences-relance-detail-copy-lien] ERROR: Échec de la copie (clipboard API refusée)', err)` |
