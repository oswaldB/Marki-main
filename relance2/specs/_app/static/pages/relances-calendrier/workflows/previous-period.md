# Workflow : Période précédente

## Écran
`relances-calendrier.html`

## Élément déclencheur
Bouton avec `@click="previousPeriod()"`

## Action
Naviguer vers la période précédente

## Description
- Recule d'un mois/semaine selon la vue
- Charge les relances de la période
- Met à jour l'affichage calendrier

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
            └── previous-period.js
```

### Fichier principal
- **HTML** : `frontend/app/relances-calendrier/index.html`
- **Point d'entrée** : Initialise la page Alpine.js

### Fichier workflow
- **JS** : `frontend/app/relances-calendrier/js/previous-period.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/relances-calendrier/js/previous-period.js
export function previousPeriod() {
  // Implementation du workflow
}
```

## Implementation

```javascript
previousPeriod() {
  // 1. Decrement period
  if (this.viewMode === 'month') {
    this.currentDate = subMonths(this.currentDate, 1);
  } else {
    this.currentDate = subWeeks(this.currentDate, 1);
  }
  
  // 2. Reload data
  this.loadDataForDate(this.currentDate);
}
```

## Logs (console.log) - OBLIGATOIRE

Chaque étape du workflow doit être loguée avec `console.log()`:

| Checkpoint | Instruction console.log |
|------------|------------------------|
| `start` | `console.log('[WORKFLOW.relances-calendrier-previous-period] START: Navigation vers la période précédente')` |
| `period-decremented` | `console.log('[WORKFLOW.relances-calendrier-previous-period] STEP: currentDate décrémenté de', decrement, viewMode === 'month' ? 'mois' : 'semaine')` |
| `data-fetched` | `console.log('[WORKFLOW.relances-calendrier-previous-period] DATA: Relances chargées pour', currentDate, '-', relancesProgrammees.length, 'entrées')` |
| `calendar-rerendered` | `console.log('[WORKFLOW.relances-calendrier-previous-period] STEP: Calendrier ré-affiché pour', currentDate)` |
| `end` | `console.log('[WORKFLOW.relances-calendrier-previous-period] SUCCESS: Période précédente affichée en', duree, 'ms')` |
| `error` | `console.error('[WORKFLOW.relances-calendrier-previous-period] ERROR:', error)` |