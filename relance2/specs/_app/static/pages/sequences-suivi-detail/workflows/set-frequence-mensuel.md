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

## Logs (console.log) - OBLIGATOIRE

Chaque étape du workflow doit être loguée avec `console.log()`:

| Checkpoint | Instruction console.log |
|------------|------------------------|
| `start` | `console.log('[WORKFLOW.sequences-suivi-detail-set-frequence-mensuel] START: Définition de la fréquence sur mensuel')` |
| `frequence-updated` | `console.log('[WORKFLOW.sequences-suivi-detail-set-frequence-mensuel] STEP: email.frequence.type = "mensuel"')` |
| `state-applied` | `console.log('[WORKFLOW.sequences-suivi-detail-set-frequence-mensuel] DATA: État après mise à jour:', {currentSequence, selectedType, emailFrequenceType})` |
| `end` | `console.log('[WORKFLOW.sequences-suivi-detail-set-frequence-mensuel] SUCCESS: Fréquence mensuelle appliquée en', duree, 'ms')` |
| `error` | `console.error('[WORKFLOW.sequences-suivi-detail-set-frequence-mensuel] ERROR:', error)` |