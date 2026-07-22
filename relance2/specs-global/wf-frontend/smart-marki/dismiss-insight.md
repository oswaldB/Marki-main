# Workflow : Ignorer insight

## Écran
`smart-marki.html`

## Élément déclencheur
Bouton avec `@click="dismissInsight(selectedInsight)"`

## Action
Rejeter la recommandation

## Description
- Marque comme ignoré
- Retire de la liste
- Apprend pour éviter similarité

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
            └── dismiss-insight.js
```

### Fichier principal
- **HTML** : `frontend/app/smart-marki/index.html`
- **Point d'entrée** : Initialise la page Alpine.js

### Fichier workflow
- **JS** : `frontend/app/smart-marki/js/dismiss-insight.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/smart-marki/js/dismiss-insight.js
export function dismissInsight() {
  // Implementation du workflow
}
```

## Implementation

```javascript
dismissSuggestion(id) {
  // 1. Remove from list
  this.suggestions = this.suggestions.filter(item => item.id !== id);
  
  // 2. Call API
  fetch(`/api/smart-marki/dismiss/${id}`, { method: 'POST' });
}
```