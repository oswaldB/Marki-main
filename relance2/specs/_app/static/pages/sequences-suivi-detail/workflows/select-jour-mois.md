# Workflow : Sélectionner jour du mois

## Écran
`sequences-suivi-detail.html`

## Élément déclencheur
Bouton avec `@click="email.frequence.dayOfMonth = day.value"`

## Action
Choisir le jour du mois

## Description
- 1er à 31 du mois
- Pour la fréquence mensuelle

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
            └── select-jour-mois.js
```

### Fichier principal
- **HTML** : `frontend/app/sequences-suivi-detail/index.html`
- **Point d'entrée** : Initialise la page Alpine.js

### Fichier workflow
- **JS** : `frontend/app/sequences-suivi-detail/js/select-jour-mois.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/sequences-suivi-detail/js/select-jour-mois.js
export function selectJourMois() {
  // Implementation du workflow
}
```

## Implementation

```javascript
// Single select
selectItem(item) {
  this.selectedItem = item;
}

// Multi-select
toggleSelection(id) {
  const index = this.selectedItems.indexOf(id);
  if (index === -1) {
    this.selectedItems.push(id);
  } else {
    this.selectedItems.splice(index, 1);
  }
}

selectAll(checked) {
  if (checked) {
    this.selectedItems = this.filteredData.map(item => item.id);
  } else {
    this.selectedItems = [];
  }
}
``

## Logs (console.log) - OBLIGATOIRE

Chaque étape du workflow doit être loguée avec `console.log()`:

| Checkpoint | Instruction console.log |
|------------|------------------------|
| `start` | `console.log('[WORKFLOW.sequences-suivi-detail-select-jour-mois] START: Sélection du jour du mois')` |
| `day-selected` | `console.log('[WORKFLOW.sequences-suivi-detail-select-jour-mois] STEP: Jour sélectionné =', day.value)` |
| `state-updated` | `console.log('[WORKFLOW.sequences-suivi-detail-select-jour-mois] STEP: email.frequence.dayOfMonth mis à jour')` |
| `state-applied` | `console.log('[WORKFLOW.sequences-suivi-detail-select-jour-mois] DATA: État après sélection:', {frequence: email.frequence})` |
| `end` | `console.log('[WORKFLOW.sequences-suivi-detail-select-jour-mois] SUCCESS: Jour du mois sélectionné en', duree, 'ms')` |
| `error` | `console.error('[WORKFLOW.sequences-suivi-detail-select-jour-mois] ERROR:', error)` |