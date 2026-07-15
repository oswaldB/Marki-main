# Workflow : Fréquence hebdomadaire

## Écran
`sequences-suivi-detail.html`

## Élément déclencheur
Bouton avec `@click="email.frequence.type = 'hebdomadaire'"`

## Action
Définir la fréquence à hebdomadaire

## Description
- Envoi une fois par semaine
- Jour et heure configurables

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
            └── set-frequence-hebdomadaire.js
```

### Fichier principal
- **HTML** : `frontend/app/sequences-suivi-detail/index.html`
- **Point d'entrée** : Initialise la page Alpine.js

### Fichier workflow
- **JS** : `frontend/app/sequences-suivi-detail/js/set-frequence-hebdomadaire.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/sequences-suivi-detail/js/set-frequence-hebdomadaire.js
export function setFrequenceHebdomadaire() {
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

## Logs (console.log) - OBLIGATOIRE

Chaque étape du workflow doit être loguée avec `console.log()`:

| Checkpoint | Instruction console.log |
|------------|------------------------|
| `start` | `console.log('[WORKFLOW.sequences-suivi-detail-set-frequence-hebdomadaire] START: Définition de la fréquence à hebdomadaire')` |
| `frequence-updated` | `console.log('[WORKFLOW.sequences-suivi-detail-set-frequence-hebdomadaire] STEP: email.frequence.type = hebdo (jour: ${jour}, heure: ${heure})')` |
| `state-applied` | `console.log('[WORKFLOW.sequences-suivi-detail-set-frequence-hebdomadaire] DATA: État après mise à jour:', {type, jour, heure, selectedType})` |
| `end` | `console.log('[WORKFLOW.sequences-suivi-detail-set-frequence-hebdomadaire] SUCCESS: Fréquence hebdomadaire appliquée en', duree, 'ms')` |
| `error` | `console.error('[WORKFLOW.sequences-suivi-detail-set-frequence-hebdomadaire] ERROR:', error)` |