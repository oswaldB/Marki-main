# Workflow : Ajouter un email

## Écran
`sequences-relance-detail.html`

## Élément déclencheur
Bouton avec `@click="ajouterEmail()"`

## Action
Ajouter un nouvel email à la séquence

## Description
- Crée un nouvel email vide
- Ajoute à la fin de la séquence
- Ouvre l'édition du nouvel email

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

**Pas d'appel API** - Action côté client uniquement. 



## Organisation des fichiers

```
frontend/
└── app/
    └── sequences-relance-detail/
        ├── index.html
        ├── components/
        │   └── (composants partagés)
        └── js/
            └── ajouter-email.js
```

### Fichier principal
- **HTML** : `frontend/app/sequences-relance-detail/index.html`
- **Point d'entrée** : Initialise la page Alpine.js

### Fichier workflow
- **JS** : `frontend/app/sequences-relance-detail/js/ajouter-email.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/sequences-relance-detail/js/ajouter-email.js
export function ajouterEmail() {
  // Implementation du workflow
}
```

## Implementation

```javascript
ajouterSequence() {
  // 1. Add to array
  this.sequences.push({
    id: generateId(),
    ...this.newSequence
  });
  
  // 2. Reset form
  this.newSequence = {};
}
```
