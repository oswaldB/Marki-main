# Workflow : Supprimer email

## Écran
`sequences-relance-detail.html`

## Élément déclencheur
Bouton avec `@click="supprimerEmail(idx)"`

## Action
Supprimer un email de la séquence

## Description
- Demande confirmation
- Supprime définitivement
- Réorganise les indices

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
            └── supprimer-email.js
```

### Fichier principal
- **HTML** : `frontend/app/sequences-relance-detail/index.html`
- **Point d'entrée** : Initialise la page Alpine.js

### Fichier workflow
- **JS** : `frontend/app/sequences-relance-detail/js/supprimer-email.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/sequences-relance-detail/js/supprimer-email.js
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
```