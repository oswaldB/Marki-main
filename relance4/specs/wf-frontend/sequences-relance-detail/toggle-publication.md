# Workflow : Publier/Dépublier séquence

## Écran
`sequences-relance-detail.html`

## Élément déclencheur
Bouton avec `@click="togglePublication()"`

## Action
Basculer le statut de publication de la séquence

## Description
- Publie ou dépublie la séquence
- Une séquence publiée est active
- Une séquence dépubliée est en brouillon

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
- `showEtapeModal` modifié
- `showModeleModal` modifié
- `showDeleteEtapeModal` modifié

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
            └── toggle-publication.js
```

### Fichier principal
- **HTML** : `frontend/app/sequences-relance-detail/index.html`
- **Point d'entrée** : Initialise la page Alpine.js

### Fichier workflow
- **JS** : `frontend/app/sequences-relance-detail/js/toggle-publication.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/sequences-relance-detail/js/toggle-publication.js
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
``