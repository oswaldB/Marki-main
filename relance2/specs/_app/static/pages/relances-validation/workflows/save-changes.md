# Workflow : Sauvegarder les modifications

## Écran
`relances-validation.html`

## Élément déclencheur
Bouton avec `@click="saveChanges()"`

## Action
Enregistrer les modifications d'une relance

## Description
- Sauvegarde les changements
- Sans valider l'envoi
- Garde pour validation ultérieure

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

**Modifications:**
- `saving` modifié
- `error` ← message si échec

## API Calls

**Endpoint:** `PUT /api/relances/:id` - Met à jour la relance via l'API REST standard

**Payload:**
```json
{
  "objet": "string",
  "corps": "string",
  "updated_at": "2026-07-12T10:00:00Z"
}
```

**Response:** `ApiResponse<Relance>`



## Organisation des fichiers

```
frontend/
└── app/
    └── relances-validation/
        ├── index.html
        ├── components/
        │   └── (composants partagés)
        └── js/
            └── save-changes.js
```

### Fichier principal
- **HTML** : `frontend/app/relances-validation/index.html`
- **Point d'entrée** : Initialise la page Alpine.js

### Fichier workflow
- **JS** : `frontend/app/relances-validation/js/save-changes.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/relances-validation/js/save-changes.js
export function saveChanges() {
  // Implementation du workflow
}
```

## Implementation

```javascript
async saveItem() {
  // 1. Validate
  if (!this.validateForm()) return;
  
  // 2. Set saving state
  this.loading = true;
  this.error = null;
  
  try {
    // 3. Prepare data
    const payload = this.editingItem;
    const id = payload.id;
    
    // 4. Call API
    const response = await fetch(`/api/relances/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error?.message);
    }
    
    // 5. Update local array
    const index = this.items.findIndex(item => item.id === id);
    if (index !== -1) {
      this.items[index] = { ...this.items[index], ...data.data };
    }
    
    // 6. Close modal
    this.selectedRelances = false;
    this.editingItem = null;
    
    // 7. Notify
    Alpine.store('ui').addToast('Modifications sauvegardées', 'success');
    
  } catch (error) {
    this.error = error.message;
    Alpine.store('ui').addToast(error.message, 'error');
  } finally {
    this.loading = false;
  }
}
``

## Logs (console.log) - OBLIGATOIRE

Chaque étape du workflow doit être loguée avec `console.log()`:

| Checkpoint | Instruction console.log |
|------------|------------------------|
| `start` | `console.log('[WORKFLOW.relances-validation-save-changes] START: Sauvegarde des modifications de la relance', { id })` |
| `validation` | `console.log('[WORKFLOW.relances-validation-save-changes] STEP: Validation du formulaire', { valid: isValid, errors })` |
| `api-call` | `console.log('[WORKFLOW.relances-validation-save-changes] API: PUT /api/relances/${id}', payload)` |
| `api-response` | `console.log('[WORKFLOW.relances-validation-save-changes] API: Response', { status: response.status, success: data.success })` |
| `state-updated` | `console.log('[WORKFLOW.relances-validation-save-changes] STEP: items[index] mis à jour, modal fermé, toast affiché', { index, updatedItem })` |
| `state-applied` | `console.log('[WORKFLOW.relances-validation-save-changes] DATA: État final', { selectedRelances, editingItem, loading, error })` |
| `end` | `console.log('[WORKFLOW.relances-validation-save-changes] SUCCESS: Modifications sauvegardées en', duree, 'ms')` |
| `error` | `console.error('[WORKFLOW.relances-validation-save-changes] ERROR:', error)` |
