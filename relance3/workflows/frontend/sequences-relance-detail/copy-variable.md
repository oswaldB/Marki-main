# Workflow : Copier variable (PouchDB)

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
- Aucune opération PouchDB (action UI uniquement)

## Data Model
**Page Function:** `sequencesRelanceDetailPage()`

**Stores Alpine.js:**
- $store.ui

**Données (en mémoire):**
- `sequence` - séquence depuis PouchDB
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

## PouchDB Operations

**Aucun** - Ce workflow est purement une action UI utilisant l'API Clipboard du navigateur.

## API Calls

**Pas d'appel API** - Action côté client uniquement avec l'API Clipboard

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
- **Point d'entrée** : Initialise la page Alpine.js avec PouchDB

### Fichier workflow
- **JS** : `frontend/app/sequences-relance-detail/js/copy-variable.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/sequences-relance-detail/js/copy-variable.js
export async function copyVariable() {
  // Implementation avec PouchDB (pas d'opération DB)
}
```

## Implementation

```javascript
async copyVariable(text) {
  try {
    await navigator.clipboard.writeText(text);
    this.toast('Variable copiée', 'success');
  } catch (err) {
    this.toast('Échec de la copie', 'error');
  }
}
```

## Notes

- **Action UI uniquement** : Ce workflow ne touche pas à PouchDB
- **Variables** : Liste de variables prédéfinies (non stockées dans PouchDB)
- **API Clipboard** : Utilise l'API native du navigateur
- **Instantané** : La copie est immédiate

---

## Migration depuis l'ancienne architecture

| Aspect | Avant | Après (PouchDB) |
|--------|-------|-----------------|
| Action | Côté client | **Conservé** - Côté client |
| API utilisée | Clipboard API | **Conservé** - Clipboard API |
| Latence | Instantanée | Instantanée |
| Offline | ✅ Oui | ✅ Oui |
