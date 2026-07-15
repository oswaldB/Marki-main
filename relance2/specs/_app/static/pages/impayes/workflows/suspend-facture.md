# Workflow : Suspendre une facture

## Écran
`impayes.html`

## Élément déclencheur
Bouton avec `@click="suspendFacture(facture)"`

## Action
Suspendre une facture impayée (la masquer temporairement)

## Description
- Met à jour les champs de suspension dans la table `impayes` SQLite
- La facture reste en base mais est masquée dans la liste (filtre `is_blacklisted=0`)
- Le motif de suspension est enregistré
- Annule les relances en cours pour ce contact

## Data Model

**Page Function:** `impayesPage()`

**Données:**
- `impayes` - liste des impayés

**Champs modifiés dans `impayes` (SQLite):**
- `is_blacklisted` ← `1`
- `blacklist_date` ← date actuelle (ISO)
- `blacklist_motif` ← motif saisi par l'utilisateur

**États UI:**
- `loading`
- `error`
- `showSuspendModal`
- `suspensionMotif` - saisie utilisateur

## State Changes

**Modifications:**
- `impayes[n].is_blacklisted` ← `1`
- `impayes[n].blacklist_date` ← date
- `impayes[n].blacklist_motif` ← texte

## API Calls

**POST /api/impayes/:id/suspend**

```javascript
// Requête
POST /api/impayes/imp_xxx/suspend
Authorization: Bearer {token}
Content-Type: application/json

{
  "motif": "Client en vacances"
}

// Réponse 200
{
  "message": "Impayé suspendu et relances annulées",
  "relances_annulees": 2
}
```

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
export async function suspendFacture(impayeId, motif) {
  const response = await fetch(`/api/impayes/${impayeId}/suspend`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Alpine.store('auth').token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ motif })
  });
  
  return await response.json();
}
```

## Implementation

```javascript
async suspendFacture(id, motif) {
  this.loading = true;
  
  try {
    const data = await suspendFacture(id, motif);
    
    // Update local
    const index = this.impayes.findIndex(item => item.id === id);
    if (index !== -1) {
      this.impayes[index].is_blacklisted = 1;
      this.impayes[index].blacklist_date = new Date().toISOString();
      this.impayes[index].blacklist_motif = motif;
    }
    
    // Close modal
    this.showSuspendModal = false;
    this.suspensionMotif = '';
    
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
- Les impayés suspendus sont filtrés par défaut dans la liste (`is_blacklisted=0`)
- Les relances en cours sont automatiquement annulées
- Voir workflow `unsuspend-facture` pour réactiver

## Logs (console.log) - OBLIGATOIRE

Chaque étape du workflow doit être loguée avec `console.log()`:

| Checkpoint | Instruction console.log |
|------------|------------------------|
| `start` | `console.log('[WORKFLOW.impayes-suspend-facture] START: Suspension facture impayé', { id, motif })` |
| `validation` | `console.log('[WORKFLOW.impayes-suspend-facture] STEP: Validation du motif (non vide, longueur OK)')` |
| `api-call` | `console.log('[WORKFLOW.impayes-suspend-facture] API: POST /api/impayes/${id}/suspend', { motif })` |
| `response` | `console.log('[WORKFLOW.impayes-suspend-facture] API: Réponse 200 reçue', data)` |
| `state-updated` | `console.log('[WORKFLOW.impayes-suspend-facture] DATA: Impayé mis à jour localement', { is_blacklisted: 1, blacklist_date, blacklist_motif })` |
| `modal-closed` | `console.log('[WORKFLOW.impayes-suspend-facture] STEP: showSuspendModal = false, suspensionMotif reset')` |
| `toast-shown` | `console.log('[WORKFLOW.impayes-suspend-facture] STEP: Toast succès affiché, relances annulées:', data.relances_annulees)` |
| `end` | `console.log('[WORKFLOW.impayes-suspend-facture] SUCCESS: Facture suspendue en', duree, 'ms')` |
| `error` | `console.error('[WORKFLOW.impayes-suspend-facture] ERROR:', error)` |
