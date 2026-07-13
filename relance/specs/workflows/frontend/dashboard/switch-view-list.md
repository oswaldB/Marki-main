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