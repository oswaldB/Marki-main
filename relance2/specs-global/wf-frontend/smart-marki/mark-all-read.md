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