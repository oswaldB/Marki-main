# Workflow : Période suivante

## Écran
`relances-calendrier.html`

## Élément déclencheur
Bouton avec `@click="nextPeriod()"`

## Action
Naviguer vers la période suivante

## Description
- Avance d'un mois/semaine selon la vue
- Charge les relances de la période

## Data Model
**Page Function:** `relancesCalendrierPage()`

**Stores Alpine.js:**
- $store.ui

**Données:**
- `relancesProgrammees`
- `currentDate`
- `viewMode`
- `selectedDate`
- `relancesDuJour`

**États UI:**
- `loading`
- `error`

## State Changes

**Modifications:** États UI spécifiques selon implémentation

## API Calls

**Pas d'appel API** - Action côté client uniquement



## Organisation des fichiers

```
frontend/
└── app/
    └── relances-calendrier/
        ├── index.html
        ├── components/
        │   └── (composants partagés)
        └── js/
            └── next-period.js
```

### Fichier principal
- **HTML** : `frontend/app/relances-calendrier/index.html`
- **Point d'entrée** : Initialise la page Alpine.js

### Fichier workflow
- **JS** : `frontend/app/relances-calendrier/js/next-period.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/relances-calendrier/js/next-period.js
export function nextPeriod() {
  // Implementation du workflow
}
```

## Implementation

```javascript
nextPeriod() {
  // 1. Increment period
  if (this.viewMode === 'month') {
    this.currentDate = addMonths(this.currentDate, 1);
  } else {
    this.currentDate = addWeeks(this.currentDate, 1);
  }
  
  // 2. Reload data
  this.loadDataForDate(this.currentDate);
}
```

## Logs (console.log) - OBLIGATOIRE

Chaque étape du workflow doit être loguée avec `console.log()`:

| Checkpoint | Instruction console.log |
|------------|------------------------|
| `start` | `console.log('[WORKFLOW.relances-calendrier-next-period] START: Navigation vers la période suivante depuis', currentDate)` |
| `period-incremented` | `console.log('[WORKFLOW.relances-calendrier-next-period] STEP: currentDate incrémentée vers', newDate, '(viewMode:', viewMode, ')')` |
| `data-fetched` | `console.log('[WORKFLOW.relances-calendrier-next-period] DATA: Relances chargées pour', newDate, '- count:', count)` |
| `calendar-rerendered` | `console.log('[WORKFLOW.relances-calendrier-next-period] STEP: Calendrier re-rendu pour la nouvelle période')` |
| `end` | `console.log('[WORKFLOW.relances-calendrier-next-period] SUCCESS: Période suivante affichée en', duree, 'ms')` |
| `error` | `console.error('[WORKFLOW.relances-calendrier-next-period] ERROR:', error)` |