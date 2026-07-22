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