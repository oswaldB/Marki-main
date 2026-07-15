# Workflow : Sauvegarder l'édition

## Écran
`relances-calendrier.html`

## Élément déclencheur
Bouton avec `@click="saveEdit()"`

## Action
Enregistrer les modifications de la relance

## Description
- Valide les modifications
- Met à jour la relance en base
- Rafraîchit le calendrier

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

**États UI:**
- `loading`
- `error`

## State Changes

**Modifications:**
- `saving` modifié
- `error` ← message si échec

## API Calls

**Endpoint:** `PUT /api/relances/:id`** - Met à jour la relance via l'API REST standard

**Payload:**
```json
{
  "objet": "string",
  "corps": "string",
  "date_envoi": "2026-07-15T10:00:00Z",
  "statut": "string",
  "updated_at": "2026-07-12T10:00:00Z"
}
```

**Response:** `ApiResponse<Relance>`



## Organisation des fichiers

```
frontend/
└── app/
    └── relances-calendrier/
        ├── index.html
        ├── components/
        │   └── (composants partagés)
        └── js/
            └── save-edit.js
```

### Fichier principal
- **HTML** : `frontend/app/relances-calendrier/index.html`
- **Point d'entrée** : Initialise la page Alpine.js

### Fichier workflow
- **JS** : `frontend/app/relances-calendrier/js/save-edit.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/relances-calendrier/js/save-edit.js
export function saveEdit() {
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
    this.selectedRelance = false;
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
```
## Logs (console.log) - OBLIGATOIRE

Chaque étape du workflow doit être loguée avec `console.log()`:

| Checkpoint | Instruction console.log |
|------------|------------------------|
| `start` | `console.log('[WORKFLOW.relances-calendrier-save-edit] START: Sauvegarde édition relance', { id: editingItem?.id })` |
| `validation` | `console.log('[WORKFLOW.relances-calendrier-save-edit] STEP: Validation du formulaire', { valid: validateForm() })` |
| `api-call` | `console.log('[WORKFLOW.relances-calendrier-save-edit] API: PUT /api/relances/:id', { id, payload: editingItem })` |
| `state-updated` | `console.log('[WORKFLOW.relances-calendrier-save-edit] STEP: État local mis à jour (relancesProgrammees[index] merged)')` |
| `modal-closed` | `console.log('[WORKFLOW.relances-calendrier-save-edit] STEP: selectedRelance = false, editingItem = null')` |
| `toast-shown` | `console.log('[WORKFLOW.relances-calendrier-save-edit] STEP: Toast succès affiché "Modifications sauvegardées"')` |
| `end` | `console.log('[WORKFLOW.relances-calendrier-save-edit] SUCCESS: Sauvegarde OK en', duree, 'ms')` |
| `error` | `console.error('[WORKFLOW.relances-calendrier-save-edit] ERROR:', error)` |
