# Workflow : Suspendre une facture

## Écran
`impayes.html`

## Élément déclencheur
Bouton avec `@click="suspendFacture(facture)"`

## Action
Suspendre une facture impayée (la masquer temporairement)

## Description
- Met à jour les champs de suspension dans la table `impayes`
- La facture reste en base mais est masquée dans la liste (filtre `is_suspended=false`)
- Le motif de suspension est enregistré

## Data Model

**Page Function:** `impayesPage()`

**Données:**
- `impayes` - liste des impayés

**Champs modifiés dans `impayes`:**
- `is_suspended` ← `true`
- `suspension_date` ← date actuelle (ISO)
- `suspension_motif` ← motif saisi par l'utilisateur

**États UI:**
- `loading`
- `error`
- `showSuspendModal`
- `suspensionMotif` - saisie utilisateur

## State Changes

**Modifications:**
- `impayes[n].is_suspended` ← `true`
- `impayes[n].suspension_date` ← date
- `impayes[n].suspension_motif` ← texte

## API Calls

**Endpoint:** `PUT /api/impayes/:id`

**Payload:**
```json
{
  "is_suspended": true,
  "suspension_date": "2026-07-10T15:30:00Z",
  "suspension_motif": "string",
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
            └── suspend-facture.js
```

### Fichier workflow
- **JS** : `frontend/app/impayes/js/suspend-facture.js`

```javascript
// frontend/app/impayes/js/suspend-facture.js
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
    const response = await fetch(`/api/impayes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        is_suspended: true,
        suspension_date: new Date().toISOString(),
        suspension_motif: motif,
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
      this.impayes[index].is_suspended = true;
      this.impayes[index].suspension_date = data.data.suspension_date;
      this.impayes[index].suspension_motif = motif;
    }
    
    // 4. Close modal
    this.showSuspendModal = false;
    this.suspensionMotif = '';
    
    // 5. Notify
    Alpine.store('ui').addToast('Facture suspendue', 'success');
    
  } catch (error) {
    Alpine.store('ui').addToast(error.message, 'error');
  } finally {
    this.loading = false;
  }
}
```

## Notes

- La suspension est **logique** (pas de suppression physique)
- Les impayés suspendus sont filtrés par défaut dans la liste (`is_suspended=false`)
- Voir workflow `unsuspend-facture` pour réactiver
