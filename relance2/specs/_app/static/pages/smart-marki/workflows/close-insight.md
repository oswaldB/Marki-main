# Workflow : Fermer insight

## Écran
`smart-marki.html`

## Élément déclencheur
Bouton avec `@click="selectedInsight = null"`

## Action
Fermer le panneau détail insight

## Description
- Masque l'insight sélectionné
- Retour à la liste des suggestions

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
- `selectedInsight` (suggestion actuellement affichée)

**États UI:**
- `loading`
- `error`
- `processing`
- `chatOpen`

## State Changes

**Modifications:**
- `selectedInsight` passe à null

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
            └── close-insight.js
```

### Fichier principal
- **HTML** : `frontend/app/smart-marki/index.html`
- **Point d'entrée** : Initialise la page Alpine.js

### Fichier workflow
- **JS** : `frontend/app/smart-marki/js/close-insight.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/smart-marki/js/close-insight.js
export function closeInsight() {
  // Implementation du workflow
}
```

## Implementation

```javascript
closeInsight() {
  // 1. Hide insight detail
  this.selectedInsight = null;

  // 2. Clear any errors
  this.error = null;
}
```

## Logs (console.log) - OBLIGATOIRE

Chaque étape du workflow doit être loguée avec `console.log()`:

| Checkpoint | Instruction console.log |
|------------|------------------------|
| `start` | `console.log('[WORKFLOW.smart-marki-close-insight] START: Fermeture du panneau détail insight')` |
| `insight-hidden` | `console.log('[WORKFLOW.smart-marki-close-insight] STEP: selectedInsight = null')` |
| `error-cleared` | `console.log('[WORKFLOW.smart-marki-close-insight] STEP: Erreurs effacées')` |
| `state-applied` | `console.log('[WORKFLOW.smart-marki-close-insight] DATA: État après fermeture:', {selectedInsight, error})` |
| `end` | `console.log('[WORKFLOW.smart-marki-close-insight] SUCCESS: Insight fermé en', duree, 'ms')` |
| `error` | `console.error('[WORKFLOW.smart-marki-close-insight] ERROR:', error)` |
