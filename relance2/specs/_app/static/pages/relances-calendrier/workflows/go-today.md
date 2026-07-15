# Workflow : Aller à aujourd'hui

## Écran
`relances-calendrier.html`

## Élément déclencheur
Bouton avec `@click="goToToday()"`

## Action
Retourner à la période actuelle

## Description
- Réinitialise à la date du jour
- Charge les relances du mois/semaine courant

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
            └── go-today.js
```

### Fichier principal
- **HTML** : `frontend/app/relances-calendrier/index.html`
- **Point d'entrée** : Initialise la page Alpine.js

### Fichier workflow
- **JS** : `frontend/app/relances-calendrier/js/go-today.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/relances-calendrier/js/go-today.js
export function goToday() {
  // Implementation du workflow
}
```

## Implementation

```javascript
goToday() {
  this.currentDate = new Date();
  this.loadDataForDate(this.currentDate);
}
```

## Logs (console.log) - OBLIGATOIRE

Chaque étape du workflow doit être loguée avec `console.log()`:

| Checkpoint | Instruction console.log |
|------------|------------------------|
| `start` | `console.log('[WORKFLOW.relances-calendrier-go-today] START: Retour à la période actuelle (aujourd\'hui)')` |
| `date-reset` | `console.log('[WORKFLOW.relances-calendrier-go-today] STEP: currentDate réinitialisé à', this.currentDate.toISOString())` |
| `loading-started` | `console.log('[WORKFLOW.relances-calendrier-go-today] STEP: Chargement des relances pour la date courante')` |
| `calendar-rerendered` | `console.log('[WORKFLOW.relances-calendrier-go-today] STEP: Calendrier ré-rendu pour', this.currentDate.toISOString().slice(0, 10))` |
| `data-loaded` | `console.log('[WORKFLOW.relances-calendrier-go-today] DATA: Relances du jour chargées:', { currentDate: this.currentDate, viewMode: this.viewMode, relancesDuJour: this.relancesDuJour })` |
| `end` | `console.log('[WORKFLOW.relances-calendrier-go-today] SUCCESS: Retour à aujourd\'hui effectué en', duree, 'ms')` |
| `error` | `console.error('[WORKFLOW.relances-calendrier-go-today] ERROR:', error)` |