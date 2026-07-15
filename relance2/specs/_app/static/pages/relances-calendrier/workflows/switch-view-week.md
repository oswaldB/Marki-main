# Workflow : Vue hebdomadaire

## Écran
`relances-calendrier.html`

## Élément déclencheur
Bouton avec `@click="viewMode = 'week'"`

## Action
Basculer en vue hebdomadaire

## Description
- Affiche le calendrier par semaine
- Vue plus détaillée des 7 jours

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

**Modifications:**
- `currentView` modifié
- `activeTab` modifié
- `viewMode` modifié

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
            └── switch-view-week.js
```

### Fichier principal
- **HTML** : `frontend/app/relances-calendrier/index.html`
- **Point d'entrée** : Initialise la page Alpine.js

### Fichier workflow
- **JS** : `frontend/app/relances-calendrier/js/switch-view-week.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/relances-calendrier/js/switch-view-week.js
export function switchViewWeek() {
  // Implementation du workflow
}
```

## Implementation

```javascript
switchView(mode) {
  this.currentView = mode;
  // Persist preference
  localStorage.setItem('relances-calendrier_view', mode);
}

switchTab(tab) {
  this.activeTab = tab;
  // Load tab data if needed
  if (tab === 'details' && !this.detailData) {
    this.loadDetailData();
  }
}
```

## Logs (console.log) - OBLIGATOIRE

Chaque étape du workflow doit être loguée avec `console.log()`:

| Checkpoint | Instruction console.log |
|------------|------------------------|
| `start` | `console.log('[WORKFLOW.relances-calendrier-switch-view-week] START: Bascule vers la vue hebdomadaire')` |
| `view-changed` | `console.log('[WORKFLOW.relances-calendrier-switch-view-week] STEP: viewMode = week, currentView mis à jour')` |
| `preference-saved` | `console.log('[WORKFLOW.relances-calendrier-switch-view-week] STEP: Préférence persistée dans localStorage')` |
| `calendar-rerendered` | `console.log('[WORKFLOW.relances-calendrier-switch-view-week] STEP: Calendrier re-rendu en vue semaine (7 jours)')` |
| `data-refreshed` | `console.log('[WORKFLOW.relances-calendrier-switch-view-week] DATA: relances de la semaine affichées:', { relancesCount, weekStart, weekEnd })` |
| `end` | `console.log('[WORKFLOW.relances-calendrier-switch-view-week] SUCCESS: Vue semaine activée en', duree, 'ms')` |
| `error` | `console.error('[WORKFLOW.relances-calendrier-switch-view-week] ERROR:', error)` |
