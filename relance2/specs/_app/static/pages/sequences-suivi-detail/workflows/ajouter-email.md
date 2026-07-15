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
## Logs (console.log) - OBLIGATOIRE

Chaque étape du workflow doit être loguée avec `console.log()`:

| Checkpoint | Instruction console.log |
|------------|------------------------|
| `start` | `console.log('[WORKFLOW.sequences-suivi-detail-ajouter-email] START: Ajout d'un email à la séquence')` |
| `validation` | `console.log('[WORKFLOW.sequences-suivi-detail-ajouter-email] STEP: Validation des champs du formulaire (typeRelance, contenu)')` |
| `state-updated` | `console.log('[WORKFLOW.sequences-suivi-detail-ajouter-email] STEP: Nouvel email ajouté au tableau etapes')` |
| `form-reset` | `console.log('[WORKFLOW.sequences-suivi-detail-ajouter-email] STEP: newSequence réinitialisé, formulaire vidé')` |
| `end` | `console.log('[WORKFLOW.sequences-suivi-detail-ajouter-email] SUCCESS: Email ajouté en', duree, 'ms')` |
| `error` | `console.error('[WORKFLOW.sequences-suivi-detail-ajouter-email] ERROR:', error)` |
```