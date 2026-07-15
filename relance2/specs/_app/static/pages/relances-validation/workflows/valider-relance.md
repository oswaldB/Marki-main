# Workflow : Valider une relance

## Écran
`relances-validation.html`

## Élément déclencheur
Bouton avec `@click="validerRelance()"`

## Action
Approuver l'envoi d'une relance

## Description
- Marque la relance comme validée
- Change le statut en `pret pour envoi`
- Retire de la liste à valider

## Data Model
**Page Function:** `relancesValidationPage()`

**Stores Alpine.js:**
- $store.ui

**Données:**
- `relancesAValider`
- `selectedRelances`
- `selectAll`

**États UI:**
- `loading`
- `error`
- `previewMode`
- `previewRelance`
- `processing`

## State Changes

**Modifications:** États UI spécifiques selon implémentation

## API Calls

**POST /api/relances/:id/validate**

```javascript
// Requête
POST /api/relances/rel_xxx/validate
Authorization: Bearer {token}

// Réponse 200
{
  "message": "Relance validée",
  "relance": {
    "id": "rel_xxx",
    "statut": "pret pour envoi",
    "valide": 1
  }
}
```

## Organisation des fichiers

```
frontend/
└── app/
    └── relances-validation/
        ├── index.html
        ├── components/
        │   └── (composants partagés)
        └── js/
            └── valider-relance.js
```

### Fichier principal
- **HTML** : `frontend/app/relances-validation/index.html`

### Fichier workflow
- **JS** : `frontend/app/relances-validation/js/valider-relance.js`

```javascript
// frontend/app/relances-validation/js/valider-relance.js
export async function validerRelance(relanceId) {
  const response = await fetch(`/api/relances/${relanceId}/validate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Alpine.store('auth').token}`,
      'Content-Type': 'application/json'
    }
  });
  
  return await response.json();
}
```

## Implementation

```javascript
async validerRelance(id) {
  this.loading = true;
  
  try {
    const data = await validerRelance(id);
    
    // Remove from validation list
    this.relancesAValider = this.relancesAValider.filter(item => item.id !== id);
    
    Alpine.store('ui').addToast('Relance validée', 'success');
    
  } catch (error) {
    Alpine.store('ui').addToast(error.message, 'error');
  } finally {
    this.loading = false;
  }
}
```

## Logs (console.log) - OBLIGATOIRE

Chaque étape du workflow doit être loguée avec `console.log()`:

| Checkpoint | Instruction console.log |
|------------|------------------------|
| `start` | `console.log('[WORKFLOW.relances-validation-valider-relance] START: Validation relance', id)` |
| `validation` | `console.log('[WORKFLOW.relances-validation-valider-relance] STEP: Vérification état avant validation', {loading, processing, selectedRelances})` |
| `api-call` | `console.log('[WORKFLOW.relances-validation-valider-relance] API_CALL: POST /api/relances/' + id + '/validate')` |
| `state-updated` | `console.log('[WORKFLOW.relances-validation-valider-relance] STATE_UPDATED: relance retirée de relancesAValider, statut -> pret pour envoi')` |
| `toast-shown` | `console.log('[WORKFLOW.relances-validation-valider-relance] STEP: Toast succès affiché - Relance validée')` |
| `end` | `console.log('[WORKFLOW.relances-validation-valider-relance] SUCCESS: Relance validée en', duree, 'ms -', id)` |
| `error` | `console.error('[WORKFLOW.relances-validation-valider-relance] ERROR:', error)` |
