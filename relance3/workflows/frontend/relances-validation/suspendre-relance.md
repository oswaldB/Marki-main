# Workflow : Suspendre via validation

## Écran
`relances-validation.html`

## Élément déclencheur
Bouton avec `@click="suspendreRelance()"`

## Action
Suspendre la relance

## Description
- Met la relance en attente
- Garde en file pour plus tard
- Ne supprime pas

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

**`POST /api/relances/:id/suspend`** - Appelle le workflow backend pour suspendre la relance

**Payload:** Aucun (l'ID est dans l'URL)

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "rel_abc123",
    "statut": "suspendue",
    "is_suspended": true
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
            └── suspendre-relance.js
```

### Fichier principal
- **HTML** : `frontend/app/relances-validation/index.html`
- **Point d'entrée** : Initialise la page Alpine.js

### Fichier workflow
- **JS** : `frontend/app/relances-validation/js/suspendre-relance.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/relances-validation/js/suspendre-relance.js
export function suspendreRelance() {
  // Implementation du workflow
}
```

## Implementation

```javascript
async suspendRelance(id) {
  // 1. Set loading
  this.loading = true;
  
  try {
    // 2. Call API
    const response = await fetch(`/api/relances/${id}/suspend`, {
      method: 'POST'
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error?.message);
    }
    
    // 3. Update local
    const index = this.relances.findIndex(item => item.id === id);
    if (index !== -1) {
      this.relances[index].statut = 'suspendue';
    }
    
    // 4. Notify
    Alpine.store('ui').addToast('Facture suspendue', 'success');
    
  } catch (error) {
    Alpine.store('ui').addToast(error.message, 'error');
  } finally {
    this.loading = false;
  }
}
```
