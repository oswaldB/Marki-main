# Workflow : Blacklister via validation

## Écran
`relances-validation.html`

## Élément déclencheur
Bouton avec `@click="blacklisterRelance()"`

## Action
Blacklister le payeur depuis validation

## Description
- Ajoute le payeur à la blacklist
- Annule la relance en cours
- Désactive les futures relances

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

**`POST /api/contacts/:id/blacklist`** - Appelle le workflow backend pour blacklister le payeur

**Payload:**
```json
{
  "is_blacklisted": true,
  "updated_at": "2026-07-12T10:00:00Z"
}
```

**Response:** `ApiResponse<Contact>`

> Le blacklisting s'applique au contact (payeur), pas directement à la relance.

## Organisation des fichiers

```
frontend/
└── app/
    └── relances-validation/
        ├── index.html
        ├── components/
        │   └── (composants partagés)
        └── js/
            └── blacklister-relance.js
```

### Fichier principal
- **HTML** : `frontend/app/relances-validation/index.html`
- **Point d'entrée** : Initialise la page Alpine.js

### Fichier workflow
- **JS** : `frontend/app/relances-validation/js/blacklister-relance.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/relances-validation/js/blacklister-relance.js
export function blacklisterRelance() {
  // Implementation du workflow
}
```

## Implementation

```javascript
async blacklisterRelance(relance) {
  // 1. Set loading
  this.loading = true;
  
  try {
    // 2. Call API to blacklist the contact (payeur)
    const response = await fetch(`/api/contacts/${relance.contact_id}/blacklist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        is_blacklisted: true,
        updated_at: new Date().toISOString()
      })
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error?.message || 'Erreur lors du blacklisting');
    }
    
    // 3. Remove relance from validation list
    this.relancesAValider = this.relancesAValider.filter(item => item.id !== relance.id);
    
    // 4. Notify
    Alpine.store('ui').addToast('Payeur blacklisté', 'success');
    
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
| `start` | `console.log('[WORKFLOW.relances-validation-blacklister-relance] START: Blacklist du payeur depuis validation, relance ID:', relance.id, 'contact ID:', relance.contact_id)` |
| `loading-set` | `console.log('[WORKFLOW.relances-validation-blacklister-relance] STEP: loading = true')` |
| `api-call` | `console.log('[WORKFLOW.relances-validation-blacklister-relance] API: POST /api/contacts/' + relance.contact_id + '/blacklist, payload:', {is_blacklisted: true, updated_at: new Date().toISOString()})` |
| `api-response` | `console.log('[WORKFLOW.relances-validation-blacklister-relance] API: Response reçue, success:', data.success)` |
| `state-updated` | `console.log('[WORKFLOW.relances-validation-blacklister-relance] STEP: relance retirée de relancesAValider, taille restante:', this.relancesAValider.length)` |
| `toast-notified` | `console.log('[WORKFLOW.relances-validation-blacklister-relance] STEP: Toast ajouté - Payeur blacklisté')` |
| `end` | `console.log('[WORKFLOW.relances-validation-blacklister-relance] SUCCESS: Blacklist terminé en', duree, 'ms')` |
| `error` | `console.error('[WORKFLOW.relances-validation-blacklister-relance] ERROR:', error.message)` |
| `loading-reset` | `console.log('[WORKFLOW.relances-validation-blacklister-relance] STEP: loading = false (finally)')` |
