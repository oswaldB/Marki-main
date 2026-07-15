# Workflow : Réactiver une facture

## Écran
`impayes.html`

## Élément déclencheur
Bouton avec `@click="unsuspendFacture(facture)"`

## Action
Réactiver une facture impayée suspendue

## Description
- Réinitialise les champs de suspension dans la table `impayes` SQLite
- La facture redevient visible dans la liste normale
- Régénère les relances si séquence attribuée

## Data Model

**Page Function:** `impayesPage()`

**Données:**
- `impayes` - liste des impayés

**Champs modifiés dans `impayes` (SQLite):**
- `is_blacklisted` ← `0`
- `blacklist_date` ← `null`
- `blacklist_motif` ← `null`

**États UI:**
- `loading`
- `error`

## State Changes

**Modifications:**
- `impayes[n].is_blacklisted` ← `0`

## API Calls

**POST /api/impayes/:id/unsuspend**

```javascript
// Requête
POST /api/impayes/imp_xxx/unsuspend
Authorization: Bearer {token}

// Réponse 200
{
  "message": "Impayé réactivé",
  "relances_crees": 1
}
```

## Organisation des fichiers

```
frontend/
└── app/
    └── impayes/
        ├── index.html
        └── js/
            └── unsuspend-facture.js
```

### Fichier workflow
- **JS** : `frontend/app/impayes/js/unsuspend-facture.js`

```javascript
// frontend/app/impayes/js/unsuspend-facture.js
export async function unsuspendFacture(impayeId) {
  const response = await fetch(`/api/impayes/${impayeId}/unsuspend`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Alpine.store('auth').token}`
    }
  });
  
  return await response.json();
}
```

## Implementation

```javascript
async unsuspendFacture(id) {
  this.loading = true;
  
  try {
    const data = await unsuspendFacture(id);
    
    // Update local
    const index = this.impayes.findIndex(item => item.id === id);
    if (index !== -1) {
      this.impayes[index].is_blacklisted = 0;
      this.impayes[index].blacklist_date = null;
      this.impayes[index].blacklist_motif = null;
    }
    
    Alpine.store('ui').addToast('Facture réactivée', 'success');
    
  } catch (error) {
    Alpine.store('ui').addToast(error.message, 'error');
  } finally {
    this.loading = false;
  }
}
```

## Notes

- La réactivation rend la facture visible dans la liste normale
- Les relances sont régénérées automatiquement si une séquence est attribuée
- Voir workflow `suspend-facture` pour suspendre

## Logs (console.log) - OBLIGATOIRE

Chaque étape du workflow doit être loguée avec `console.log()`:

| Checkpoint | Instruction console.log |
|------------|------------------------|
| `start` | `console.log('[WORKFLOW.impayes-unsuspend-facture] START: Réactivation facture', impayeId)` |
| `api-call` | `console.log('[WORKFLOW.impayes-unsuspend-facture] STEP: POST /api/impayes/' + impayeId + '/unsuspend')` |
| `state-updated` | `console.log('[WORKFLOW.impayes-unsuspend-facture] STEP: impayes[' + index + '].is_blacklisted = 0, blacklist_date = null, blacklist_motif = null')` |
| `toast-shown` | `console.log('[WORKFLOW.impayes-unsuspend-facture] STEP: Toast succès affiché — Facture réactivée')` |
| `data` | `console.log('[WORKFLOW.impayes-unsuspend-facture] DATA: Réponse API:', {message, relances_crees})` |
| `end` | `console.log('[WORKFLOW.impayes-unsuspend-facture] SUCCESS: Facture réactivée en', duree, 'ms')` |
| `error` | `console.error('[WORKFLOW.impayes-unsuspend-facture] ERROR:', error)` |
