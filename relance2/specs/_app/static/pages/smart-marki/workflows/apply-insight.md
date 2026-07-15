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

## Logs (console.log) - OBLIGATOIRE

Chaque étape du workflow doit être loguée avec `console.log()`:

| Checkpoint | Instruction console.log |
|------------|------------------------|
| `start` | `console.log('[WORKFLOW.smart-marki-apply-insight] START: Application de l\'insight', insight.id)` |
| `validation` | `console.log('[WORKFLOW.smart-marki-apply-insight] STEP: Validation des paramètres d\'entrée', {id: insight.id, type: insight.type})` |
| `processing-set` | `console.log('[WORKFLOW.smart-marki-apply-insight] STEP: processing = true (verrouillage UI)')` |
| `api-call` | `console.log('[WORKFLOW.smart-marki-apply-insight] API_CALL: POST /api/smart-marki/apply/${id}')` |
| `api-response` | `console.log('[WORKFLOW.smart-marki-apply-insight] API_RESPONSE: Réponse reçue', {success: data.success, action: data.action})` |
| `state-updated` | `console.log('[WORKFLOW.smart-marki-apply-insight] STATE_UPDATED: Suggestion retirée de la liste, count =', this.suggestions.length)` |
| `toast-shown` | `console.log('[WORKFLOW.smart-marki-apply-insight] STEP: Toast de succès affiché')` |
| `end` | `console.log('[WORKFLOW.smart-marki-apply-insight] SUCCESS: Insight appliqué en', duree, 'ms')` |
| `error` | `console.error('[WORKFLOW.smart-marki-apply-insight] ERROR:', error.message, error)` |