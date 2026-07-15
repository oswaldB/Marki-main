# Workflow : Basculer en vue liste

## Écran
`dashboard.html`

## Élément déclencheur
Bouton avec `@click="viewMode = 'list'"`

## Action
Basculer l'affichage en mode liste

## Description
- Change le mode d'affichage des éléments
- Affiche les données sous forme de liste détaillée
- Persiste le choix en localStorage

## Data Model
**Page Function:** `dashboardPage()`

**Stores Alpine.js:**
- $store.ui
- $store.sync

**Données:**
- `kpis`
- `chartData`
- `activiteRecente`
- `periode`
- `lastSyncTime`

**États UI:**
- `loading`
- `error`
- `syncing`

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
    └── dashboard/
        ├── index.html
        ├── components/
        │   └── (composants partagés)
        └── js/
            └── switch-view-list.js
```

### Fichier principal
- **HTML** : `frontend/app/dashboard/index.html`
- **Point d'entrée** : Initialise la page Alpine.js

### Fichier workflow
- **JS** : `frontend/app/dashboard/js/switch-view-list.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/dashboard/js/switch-view-list.js
export function switchViewList() {
  // Implementation du workflow
}
```

## Implementation

```javascript
switchView(mode) {
  this.currentView = mode;
  // Persist preference
  localStorage.setItem('dashboard_view', mode);
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
| `start` | `console.log('[WORKFLOW.dashboard-switch-view-list] START: Bascule en vue liste')` |
| `state-changed` | `console.log('[WORKFLOW.dashboard-switch-view-list] STEP: viewMode = "list"')` |
| `persisted` | `console.log('[WORKFLOW.dashboard-switch-view-list] STEP: Préférence persistée en localStorage (dashboard_view = list)')` |
| `re-rendered` | `console.log('[WORKFLOW.dashboard-switch-view-list] STEP: DOM ré-affiché en mode liste')` |
| `end` | `console.log('[WORKFLOW.dashboard-switch-view-list] SUCCESS: Vue liste activée en', duree, 'ms')` |
| `error` | `console.error('[WORKFLOW.dashboard-switch-view-list] ERROR:', error)` |