# Workflow : Vue mensuelle

## Écran
`relances-calendrier.html`

## Élément déclencheur
Bouton avec `@click="viewMode = 'month'"`

## Action
Basculer en vue mensuelle

## Description
- Affiche le calendrier par mois
- Grille 7x5 ou 7x6 selon le mois

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
            └── switch-view-month.js
```

### Fichier principal
- **HTML** : `frontend/app/relances-calendrier/index.html`
- **Point d'entrée** : Initialise la page Alpine.js

### Fichier workflow
- **JS** : `frontend/app/relances-calendrier/js/switch-view-month.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/relances-calendrier/js/switch-view-month.js
export function switchViewMonth() {
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
| `start` | `console.log('[WORKFLOW.relances-calendrier-switch-view-month] START: Bascule vers la vue mensuelle')` |
| `view-changed` | `console.log('[WORKFLOW.relances-calendrier-switch-view-month] STEP: viewMode = month appliqué')` |
| `view-persisted` | `console.log('[WORKFLOW.relances-calendrier-switch-view-month] STEP: Préférence persistée dans localStorage')` |
| `calendar-rerendered` | `console.log('[WORKFLOW.relances-calendrier-switch-view-month] STEP: Calendrier mensuel ré-affiché (grille 7x5/7x6)')` |
| `data-relinked` | `console.log('[WORKFLOW.relances-calendrier-switch-view-month] DATA: relancesProgrammees re-liées à la grille mensuelle:', {currentDate, relancesDuJour})` |
| `end` | `console.log('[WORKFLOW.relances-calendrier-switch-view-month] SUCCESS: Vue mensuelle active en', duree, 'ms')` |
| `error` | `console.error('[WORKFLOW.relances-calendrier-switch-view-month] ERROR:', error)` |