# Workflow : Basculer en vue carte

## Écran
`dashboard.html`

## Élément déclencheur
Bouton avec `@click="viewMode = 'card'"`

## Action
Basculer l'affichage en mode carte

## Description
- Change le mode d'affichage des éléments
- Affiche les données sous forme de cartes visuelles
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
            └── switch-view-card.js
```

### Fichier principal
- **HTML** : `frontend/app/dashboard/index.html`
- **Point d'entrée** : Initialise la page Alpine.js

### Fichier workflow
- **JS** : `frontend/app/dashboard/js/switch-view-card.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/dashboard/js/switch-view-card.js
export function switchViewCard() {
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