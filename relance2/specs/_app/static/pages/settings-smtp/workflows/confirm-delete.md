# Workflow : Confirmer suppression profil SMTP
## Écran
`settings-smtp.html`

## Élément déclencheur
Bouton avec `@click="deleteProfil()"` (dans modal confirmation)

## Action
Confirmer et exécuter la suppression du profil

## Description
- Exécute la suppression en base
- Met à jour la liste locale

## Data Model
**Page Function:** `settingsSmtpPage()`

**Stores Alpine.js:**
- $store.ui

**Données:**
- `profils`
- `deletingProfil`

**États UI:**
- `loading`
- `error`

## State Changes

**Modifications:**
- `profils` filtré (suppression)
- `deletingProfil` réinitialisé

## API Calls

**Endpoint:** `DELETE /api/smtp-profiles/:id`

**Response:** `ApiResponse<void>`

## Organisation des fichiers

```
frontend/
└── app/
    └── settings-smtp/
        ├── index.html
        ├── components/
        │   └── (composants partagés)
        └── js/
            └── confirm-delete-profil.js
```

### Fichier principal
- **HTML** : `frontend/app/settings-smtp/index.html`
- **Point d'entrée** : Initialise la page Alpine.js

### Fichier workflow
- **JS** : `frontend/app/settings-smtp/js/confirm-delete-profil.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/settings-smtp/js/confirm-delete-profil.js
export function deleteProfil() {
  // Implementation du workflow
}
```

## Implementation

```javascript
async deleteProfil() {
  this.loading = true;
  this.error = null;
  
  const id = this.deletingProfil.id;
  
  try {
    const response = await fetch(`/api/smtp-profiles/${id}`, {
      method: 'DELETE'
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error?.message);
    }
    
    // 1. Remove from array
    this.profils = this.profils.filter(item => item.id !== id);
    
    // 2. Close modal
    Alpine.store('ui').modals.confirmation.show = false;
    
    // 3. Reset
    this.deletingProfil = null;
    
    // 4. Notify
    Alpine.store('ui').addToast('Profil SMTP supprimé', 'success');
    
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
| `start` | `console.log('[WORKFLOW.settings-smtp-confirm-delete] START: Confirmation suppression profil SMTP', {id, deletingProfil})` |
| `validation` | `console.log('[WORKFLOW.settings-smtp-confirm-delete] STEP: Validation - profil à supprimer ciblé', id)` |
| `api-call` | `console.log('[WORKFLOW.settings-smtp-confirm-delete] API: DELETE /api/smtp-profiles/${id}')` |
| `api-response` | `console.log('[WORKFLOW.settings-smtp-confirm-delete] API: Réponse reçue', {status: response.status, success: data.success})` |
| `state-updated` | `console.log('[WORKFLOW.settings-smtp-confirm-delete] STEP: Liste profils mise à jour, nombre restant', this.profils.length)` |
| `modal-closed` | `console.log('[WORKFLOW.settings-smtp-confirm-delete] STEP: Modal confirmation fermé, deletingProfil réinitialisé')` |
| `end` | `console.log('[WORKFLOW.settings-smtp-confirm-delete] SUCCESS: Profil SMTP supprimé en', duree, 'ms')` |
| `error` | `console.error('[WORKFLOW.settings-smtp-confirm-delete] ERROR:', error.message)` |
