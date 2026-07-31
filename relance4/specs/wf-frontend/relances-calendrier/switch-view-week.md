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