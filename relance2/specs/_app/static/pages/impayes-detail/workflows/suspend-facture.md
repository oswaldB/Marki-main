# Workflow : Suspendre la facture

## Écran
`impayes-detail.html`

## Élément déclencheur
Bouton avec `@click="showEditFactureModal = true"`

## Action
Afficher le formulaire de suspension

## Description
- Ouvre le formulaire de suspension
- Permet de saisir un motif
- Met à jour le statut en "suspendu"

## Data Model
**Page Function:** `impayesDetailPage()`

**Stores Alpine.js:**
- $store.ui

**Données:**
- `facture`
- `historiquePaiements`
- `historiqueRelances`
- `activeTab`

**États UI:**
- `loading`
- `error`
- `showMarkAsPaidModal`
- `showAddRelanceModal`
- `showEditFactureModal`

## State Changes

**Modifications:** États UI spécifiques selon implémentation

## API Calls

**`POST /api/impayes/{id}/suspend`** - Suspend la facture côté backend

**Payload:**
```json
{
  "motif": "string"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "FAC-2024-001",
    "statut": "suspendue",
    "dateSuspension": "2024-01-15T10:30:00Z"
  }
}
```

## Organisation des fichiers

```
frontend/
└── app/
    └── impayes-detail/
        ├── index.html
        ├── components/
        │   └── (composants partagés)
        └── js/
            └── suspend-facture.js
```

### Fichier principal
- **HTML** : `frontend/app/impayes-detail/index.html`
- **Point d'entrée** : Initialise la page Alpine.js

### Fichier workflow
- **JS** : `frontend/app/impayes-detail/js/suspend-facture.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/impayes-detail/js/suspend-facture.js
export function suspendFacture() {
  // Implementation du workflow
}
```

## Implementation

```javascript
async suspendFacture(id, motif) {
  // 1. Set loading
  this.loading = true;
  
  try {
    // 2. Call API
    const response = await fetch(`/api/impayes/${id}/suspend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ motif })
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error?.message);
    }
    
    // 3. Update local
    const index = this.factures.findIndex(item => item.id === id);
    if (index !== -1) {
      this.factures[index].statut = 'suspendue';
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

## Logs (console.log) - OBLIGATOIRE

Chaque étape du workflow doit être loguée avec `console.log()`:

| Checkpoint | Instruction console.log |
|------------|------------------------|
| `start` | `console.log('[WORKFLOW.impayes-detail-suspend-facture] START: Suspension facture', { id, motif })` |
| `validation` | `console.log('[WORKFLOW.impayes-detail-suspend-facture] STEP: Validation du motif de suspension')` |
| `loading-set` | `console.log('[WORKFLOW.impayes-detail-suspend-facture] STEP: loading = true')` |
| `api-call` | `console.log('[WORKFLOW.impayes-detail-suspend-facture] API_CALL: POST /api/impayes/${id}/suspend', { motif })` |
| `response` | `console.log('[WORKFLOW.impayes-detail-suspend-facture] API_RESPONSE:', response.status, data)` |
| `state-updated` | `console.log('[WORKFLOW.impayes-detail-suspend-facture] STEP: Statut facture mis à jour', { id, statut: 'suspendue', dateSuspension })` |
| `end` | `console.log('[WORKFLOW.impayes-detail-suspend-facture] SUCCESS: Facture suspendue en', duree, 'ms')` |
| `error` | `console.error('[WORKFLOW.impayes-detail-suspend-facture] ERROR:', error)` |
