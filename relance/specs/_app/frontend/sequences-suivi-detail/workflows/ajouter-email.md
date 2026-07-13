# Workflow : Ajouter email suivi

## Écran
`sequences-suivi-detail.html`

## Élément déclencheur
Bouton avec `@click="ajouterEmail()"`

## Action
Ajouter un email à la séquence

## Description
- Crée un nouvel email de suivi
- Configure fréquence et contenu

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
            └── ajouter-email.js
```

### Fichier principal
- **HTML** : `frontend/app/sequences-suivi-detail/index.html`
- **Point d'entrée** : Initialise la page Alpine.js

### Fichier workflow
- **JS** : `frontend/app/sequences-suivi-detail/js/ajouter-email.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/sequences-suivi-detail/js/ajouter-email.js
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