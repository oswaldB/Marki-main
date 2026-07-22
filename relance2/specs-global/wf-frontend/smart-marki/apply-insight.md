# Workflow : Appliquer insight

## Écran
`smart-marki.html`

## Élément déclencheur
Bouton avec `@click="applyInsight(selectedInsight)"`

## Action
Appliquer la recommandation IA

## Description
- Exécute l'action suggérée
- Modifie les paramètres
- Crée la relance/séquence

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
            └── apply-insight.js
```

### Fichier principal
- **HTML** : `frontend/app/smart-marki/index.html`
- **Point d'entrée** : Initialise la page Alpine.js

### Fichier workflow
- **JS** : `frontend/app/smart-marki/js/apply-insight.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/smart-marki/js/apply-insight.js
export function applyInsight() {
  // Implementation du workflow
}
```

## Implementation

```javascript
async applySuggestion(id) {
  // 1. Set processing
  this.processing = true;
  
  try {
    // 2. Call API
    const response = await fetch(`/api/smart-marki/apply/${id}`, {
      method: 'POST'
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error?.message);
    }
    
    // 3. Remove from suggestions
    this.suggestions = this.suggestions.filter(s => s.id !== id);
    
    // 4. Notify
    Alpine.store('ui').addToast('Suggestion appliquée', 'success');
    
  } catch (error) {
    Alpine.store('ui').addToast(error.message, 'error');
  } finally {
    this.processing = false;
  }
}
```