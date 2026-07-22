# Workflow : Fermer le panneau édition

## Écran
`relances-calendrier.html`

## Élément déclencheur
Bouton avec `@click="closeEditPanel()"`

## Action
Fermer le panneau d'édition de relance

## Description
- Ferme sans sauvegarder
- Retour au calendrier

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
- `selectedRelance` (relance en cours d'édition)

**États UI:**
- `loading`
- `error`

## State Changes

**Modifications:**
- `selectedRelance` réinitialisé à null

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
            └── close-edit-panel.js
```

### Fichier principal
- **HTML** : `frontend/app/relances-calendrier/index.html`
- **Point d'entrée** : Initialise la page Alpine.js

### Fichier workflow
- **JS** : `frontend/app/relances-calendrier/js/close-edit-panel.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/relances-calendrier/js/close-edit-panel.js
export function closeEditPanel() {
  // Implementation du workflow
}
```

## Implementation

```javascript
closeEditPanel() {
  // 1. Reset selected relance (ferme le panneau)
  this.selectedRelance = null;
  
  // 2. Clear any validation errors
  this.error = null;
}
```
