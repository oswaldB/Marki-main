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
async copySequence(text) {
  try {
    await navigator.clipboard.writeText(text);
    Alpine.store('ui').addToast('Copié dans le presse-papier', 'success');
  } catch (err) {
    Alpine.store('ui').addToast('Échec de la copie', 'error');
  }
}
```