# Workflow : Réactiver une facture

## Écran
`impayes.html`

## Élément déclencheur
Bouton avec `@click="unsuspendFacture(facture)"`

## Action
Réactiver une facture impayée suspendue

## Description
- Réinitialise les champs de suspension dans la table `impayes`
- La facture redevient visible dans la liste normale
- Conserve l'historique dans `suspension_date` et `suspension_motif` (optionnel)

## Data Model

**Page Function:** `impayesPage()`

**Données:**
- `impayes` - liste des impayés

**Champs modifiés dans `impayes`:**
- `is_suspended` ← `false`
- `updated_at` ← date actuelle

**États UI:**
- `loading`
- `error`

## State Changes

**Modifications:**
- `impayes[n].is_suspended` ← `false`

## API Calls

**Endpoint:** `PUT /api/impayes/:id`

**Payload:**
```json
{
  "is_suspended": false,
  "updated_at": "2026-07-10T15:30:00Z"
}
```

**Table:** `impayes`

**Response:** `ApiResponse<Impaye>`

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
export function unsuspendFacture() {
  // Implementation du workflow
}
```

## Implementation

```javascript
async unsuspendFacture(id) {
  // 1. Set loading
  this.loading = true;
  
  try {
    // 2. Call API
    const response = await fetch(`/api/impayes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        is_suspended: false,
        updated_at: new Date().toISOString()
      })
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error?.message);
    }
    
    // 3. Update local
    const index = this.impayes.findIndex(item => item.id === id);
    if (index !== -1) {
      this.impayes[index].is_suspended = false;
    }
    
    // 4. Notify
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
- Les champs `suspension_date` et `suspension_motif` peuvent être conservés pour audit
- Voir workflow `suspend-facture` pour suspendre
