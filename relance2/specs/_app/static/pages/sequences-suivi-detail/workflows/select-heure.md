# Workflow : Sélectionner heure

## Écran
`sequences-suivi-detail.html`

## Élément déclencheur
Bouton avec `@click="email.frequence.hour = hour.toString()"`

## Action
Choisir l'heure d'envoi

## Description
- Heure de 00:00 à 23:00
- Format 24h

## Data Model
**Page Function:** `sequencesSuiviDetailPage()`

**Stores Alpine.js:**
- $store.ui

**Données:**
- `sequence`
- `etapes`
- `typeRelanceOptions`
- `selectedType`

**États UI:**
- `loading`
- `error`
- `saving`

## State Changes

**Modifications:** États UI spécifiques selon implémentation

## API Calls

**Pas d'appel API** - Action côté client uniquement



## Organisation des fichiers

```
frontend/
└── app/
    └── sequences-suivi-detail/
        ├── index.html
        ├── components/
        │   └── (composants partagés)
        └── js/
            └── select-heure.js
```

### Fichier principal
- **HTML** : `frontend/app/sequences-suivi-detail/index.html`
- **Point d'entrée** : Initialise la page Alpine.js

### Fichier workflow
- **JS** : `frontend/app/sequences-suivi-detail/js/select-heure.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/sequences-suivi-detail/js/select-heure.js
export function selectHeure() {
  // Implementation du workflow
}
```

## Implementation

```javascript
// Single select
selectItem(item) {
  this.selectedItem = item;
}

// Multi-select
toggleSelection(id) {
  const index = this.selectedItems.indexOf(id);
  if (index === -1) {
    this.selectedItems.push(id);
  } else {
    this.selectedItems.splice(index, 1);
  }
}

selectAll(checked) {
  if (checked) {
    this.selectedItems = this.filteredData.map(item => item.id);
  } else {
    this.selectedItems = [];
  }
}
```

## Logs (console.log) - OBLIGATOIRE

Chaque étape du workflow doit être loguée avec `console.log()`:

| Checkpoint | Instruction console.log |
|------------|------------------------|
| `start` | `console.log('[WORKFLOW.sequences-suivi-detail-select-heure] START: Sélection de l\'heure d\'envoi')` |
| `time-selected` | `console.log('[WORKFLOW.sequences-suivi-detail-select-heure] STEP: Heure sélectionnée =', hour)` |
| `state-updated` | `console.log('[WORKFLOW.sequences-suivi-detail-select-heure] DATA: email.frequence.hour mis à jour =', this.email.frequence.hour)` |
| `end` | `console.log('[WORKFLOW.sequences-suivi-detail-select-heure] SUCCESS: Heure enregistrée')` |
| `error` | `console.error('[WORKFLOW.sequences-suivi-detail-select-heure] ERROR:', error)` |