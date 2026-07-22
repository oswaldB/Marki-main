# Workflow : Fréquence mensuelle

## Écran
`sequences-suivi-detail.html`

## Élément déclencheur
Bouton avec `@click="email.frequence.type = 'mensuel'"`

## Action
Définir la fréquence à mensuelle

## Description
- Envoi une fois par mois
- Jour du mois et heure configurables

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
            └── set-frequence-mensuel.js
```

### Fichier principal
- **HTML** : `frontend/app/sequences-suivi-detail/index.html`
- **Point d'entrée** : Initialise la page Alpine.js

### Fichier workflow
- **JS** : `frontend/app/sequences-suivi-detail/js/set-frequence-mensuel.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/sequences-suivi-detail/js/set-frequence-mensuel.js
export function setFrequenceMensuel() {
  // Implementation du workflow
}
```

## Implementation

```javascript
setSequence(value) {
  // 1. Update state
  this.currentSequence = value;
  
  // 2. Apply side effects
  this.applySequenceChange();
}
```