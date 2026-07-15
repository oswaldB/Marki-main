# Workflow : Tout marquer lu Smart Marki

## Écran
`smart-marki.html`

## Élément déclencheur
Bouton avec `@click="markAllAsRead()"`

## Action
Marquer toutes les insights comme lues

## Description
- Réinitialise les notifications
- Met à jour les compteurs

## Data Model
**Page Function:** `smartMarkiPage()`

**Stores Alpine.js:**
- $store.ui

**Données:**
- `suggestions`
- `historiqueActions`
- `stats`
- `features`
- `chatMessages`
- `chatInput`

**États UI:**
- `loading`
- `error`
- `processing`
- `chatOpen`

## State Changes

**Modifications:** États UI spécifiques selon implémentation

## API Calls

**Pas d'appel API** - Action côté client uniquement



## Organisation des fichiers

```
frontend/
└── app/
    └── smart-marki/
        ├── index.html
        ├── components/
        │   └── (composants partagés)
        └── js/
            └── mark-all-read.js
```

### Fichier principal
- **HTML** : `frontend/app/smart-marki/index.html`
- **Point d'entrée** : Initialise la page Alpine.js

### Fichier workflow
- **JS** : `frontend/app/smart-marki/js/mark-all-read.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/smart-marki/js/mark-all-read.js
export function markAllRead() {
  // Implementation du workflow
}
```

## Implementation

```javascript
async markAsRead(id) {
  // 1. Update local
  const index = this.suggestions.findIndex(item => item.id === id);
  if (index !== -1) {
    this.suggestions[index].lu = true;
  }
  
  // 2. Call API (fire and forget)
  fetch(`/api/smart-marki/mark-read/${id}`, { method: 'POST' });
}
```

## Logs (console.log) - OBLIGATOIRE

Chaque étape du workflow doit être loguée avec `console.log()`:

| Checkpoint | Instruction console.log |
|------------|------------------------|
| `start` | `console.log('[WORKFLOW.smart-marki-mark-all-read] START: Marquage de toutes les insights comme lues')` |
| `api-call` | `console.log('[WORKFLOW.smart-marki-mark-all-read] STEP: Appel API batch POST /api/smart-marki/mark-all-read')` |
| `state-updated` | `console.log('[WORKFLOW.smart-marki-mark-all-read] STEP: Toutes les suggestions mises à jour localement (lu=true)', { count: this.suggestions.length })` |
| `list-rerendered` | `console.log('[WORKFLOW.smart-marki-mark-all-read] STEP: Liste des insights ré-affichée, compteurs réinitialisés (notifications + stats)')` |
| `end` | `console.log('[WORKFLOW.smart-marki-mark-all-read] SUCCESS: Toutes les insights marquées comme lues en', duree, 'ms')` |
| `error` | `console.error('[WORKFLOW.smart-marki-mark-all-read] ERROR:', error)` |
