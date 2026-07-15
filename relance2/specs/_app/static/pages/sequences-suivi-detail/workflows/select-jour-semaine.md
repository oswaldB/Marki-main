# Workflow : Sélectionner jour de semaine

## Écran
`sequences-suivi-detail.html`

## Élément déclencheur
Bouton avec `@click="email.frequence.dayOfWeek = day.value"`

## Action
Choisir le jour de la semaine

## Description
- Lundi à dimanche
- Pour la fréquence hebdomadaire

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
            └── select-jour-semaine.js
```

### Fichier principal
- **HTML** : `frontend/app/sequences-suivi-detail/index.html`
- **Point d'entrée** : Initialise la page Alpine.js

### Fichier workflow
- **JS** : `frontend/app/sequences-suivi-detail/js/select-jour-semaine.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/sequences-suivi-detail/js/select-jour-semaine.js
export function selectJourSemaine() {
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
```

## Logs (console.log) - OBLIGATOIRE

Chaque étape du workflow doit être loguée avec `console.log()`:

| Checkpoint | Instruction console.log |
|------------|------------------------|
| `start` | `console.log('[WORKFLOW.sequences-suivi-detail-select-jour-semaine] START: Sélection du jour de la semaine')` |
| `day-selected` | `console.log('[WORKFLOW.sequences-suivi-detail-select-jour-semaine] STEP: Jour sélectionné =', day.value)` |
| `state-updated` | `console.log('[WORKFLOW.sequences-suivi-detail-select-jour-semaine] STEP: email.frequence.dayOfWeek mis à jour')` |
| `end` | `console.log('[WORKFLOW.sequences-suivi-detail-select-jour-semaine] SUCCESS: Jour de la semaine sélectionné')` |
| `error` | `console.error('[WORKFLOW.sequences-suivi-detail-select-jour-semaine] ERROR:', error)` |