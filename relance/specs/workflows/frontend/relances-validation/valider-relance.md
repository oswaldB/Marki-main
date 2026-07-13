# Workflow : Valider une relance

## Écran
`relances-validation.html`

## Élément déclencheur
Bouton avec `@click="validerRelance()"`

## Action
Approuver l'envoi d'une relance

## Description
- Marque la relance comme validée
- Déclenche l'envoi (immédiat ou programmé)
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

**`PUT /api/relances/:id`** - Met à jour la relance avec `valide=true`

**Payload:**
```json
{
  "valide": true,
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
            └── valider-relance.js
```

### Fichier principal
- **HTML** : `frontend/app/relances-validation/index.html`
- **Point d'entrée** : Initialise la page Alpine.js

### Fichier workflow
- **JS** : `frontend/app/relances-validation/js/valider-relance.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/relances-validation/js/valider-relance.js
export function validerRelance() {
  // Implementation du workflow
}
```

## Implementation

```javascript
async validerRelance(id) {
  // 1. Set loading
  this.loading = true;
  
  try {
    // 2. Call API to validate
    const response = await fetch(`/api/relances/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        valide: true,
        updated_at: new Date().toISOString()
      })
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error?.message || 'Erreur lors de la validation');
    }
    
    // 3. Remove from validation list
    this.relancesAValider = this.relancesAValider.filter(item => item.id !== id);
    
    // 4. Notify
    Alpine.store('ui').addToast('Relance validée', 'success');
    
  } catch (error) {
    Alpine.store('ui').addToast(error.message, 'error');
  } finally {
    this.loading = false;
  }
}
```
