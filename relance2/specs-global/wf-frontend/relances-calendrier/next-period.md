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