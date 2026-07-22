# Workflow : Copier lien de paiement (PouchDB)

## Écran
`sequences-relance-detail.html`

## Élément déclencheur
Bouton avec `@click="copyToClipboard(lien.url)"`

## Action
Copier l'URL d'un lien de paiement

## Description
- Copie l'URL dans le presse-papiers
- Peut être collé dans l'email
- Les liens sont chargés depuis PouchDB (par `initial-load`)

## Data Model
**Page Function:** `sequencesRelanceDetailPage()`

**Stores Alpine.js:**
- $store.ui

**Données (depuis PouchDB):**
- `sequence` - séquence depuis PouchDB
- `etapes`
- `modeles`
- `liensPaiement[]` - liens chargés depuis PouchDB
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

## PouchDB Operations

**Aucun** - Ce workflow est purement une action UI utilisant l'API Clipboard du navigateur.

Les liens de paiement sont chargés depuis PouchDB par le workflow `initial-load`, mais cette action de copie ne modifie pas la base de données.

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
            └── copy-lien.js
```

### Fichier principal
- **HTML** : `frontend/app/sequences-relance-detail/index.html`
- **Point d'entrée** : Initialise la page Alpine.js avec PouchDB

### Fichier workflow
- **JS** : `frontend/app/sequences-relance-detail/js/copy-lien.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/sequences-relance-detail/js/copy-lien.js
export async function copyLien() {
  // Implementation avec PouchDB (pas d'opération DB)
}
```

## Implementation

```javascript
async copyLien(text) {
  try {
    await navigator.clipboard.writeText(text);
    this.toast('Lien copié dans le presse-papier', 'success');
  } catch (err) {
    this.toast('Échec de la copie', 'error');
  }
}
```

## Notes

- **Action UI uniquement** : Ce workflow ne touche pas à PouchDB
- **Source données** : Les liens sont chargés depuis PouchDB (par `initial-load`)
- **API Clipboard** : Utilise l'API native du navigateur
- **Instantané** : La copie est immédiate

---

## Migration depuis l'ancienne architecture

| Aspect | Avant | Après (PouchDB) |
|--------|-------|-----------------|
| Action | Côté client | **Conservé** - Côté client |
| Source liens | Props/Store | PouchDB (déjà chargé) |
| API utilisée | Clipboard API | **Conservé** - Clipboard API |
| Latence | Instantanée | Instantanée |
| Offline | ✅ Oui | ✅ Oui |
