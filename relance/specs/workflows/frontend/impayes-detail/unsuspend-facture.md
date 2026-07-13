# Workflow : Réactiver une facture

## Écran
`impayes-detail.html`

## Élément déclencheur
Bouton avec `@click="unsuspendFacture(impaye)"`

## Action
Réactiver une facture impayée suspendue

## Description
- Réinitialise les champs de suspension dans la table `impayes`
- La facture redevient visible dans la liste normale
- Conserve l'historique dans `suspension_date` et `suspension_motif` (optionnel)

## Data Model

**Page Function:** `impayesDetailPage()`

**Données:**
- `impaye` - impayé en cours de visualisation

**Champs modifiés dans `impayes`:**
- `is_suspended` ← `false`
- `updated_at` ← date actuelle

**États UI:**
- `loading`
- `error`

## State Changes

**Modifications:**
- `impaye.is_suspended` ← `false`

## API Calls

**`POST /api/factures/{id}/unsuspend`** - Réactive la facture côté backend

> **Note:** Route à confirmer avec la documentation backend.
**Payload:** Aucun (l'ID est dans l'URL)

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "FAC-2024-001",
    "statut": "impayee",
    "is_suspended": false,
    "dateReactivation": "2024-01-15T10:30:00Z"
  }
}
```

## Organisation des fichiers

```
frontend/
└── app/
    └── impayes-detail/
        ├── index.html
        └── js/
            └── unsuspend-facture.js
```

### Fichier workflow
- **JS** : `frontend/app/impayes-detail/js/unsuspend-facture.js`

```javascript
// frontend/app/impayes-detail/js/unsuspend-facture.js
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
    const response = await fetch(`/api/factures/${id}/unsuspend`, {
      method: 'POST'
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error?.message);
    }
    
    // 3. Update local
    this.impaye.is_suspended = false;
    this.impaye.statut = data.data.statut;
    
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
