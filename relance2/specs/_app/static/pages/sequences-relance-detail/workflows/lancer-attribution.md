# Workflow : Lancer attribution manuelle

## Écran
`sequences-relance-detail.html`

## Élément déclencheur
Bouton avec `@click="lancerAttribution()"`

## Action
Exécuter l'attribution des impayés

## Description

Déclenche l'attribution automatique des impayés en appelant le workflow backend `attribution-impayes`.
- Le backend parcourt les impayés non assignés
- Le backend applique les règles d'attribution
- Le backend assigne les impayés à cette séquence

## Data Model
**Page Function:** `sequencesRelanceDetailPage()`

**Stores Alpine.js:**
- $store.ui

**Données:**
- `sequence`
- `etapes`
- `modeles`
- `activeTab`
- `draggingEtape`
- `editingEtape`
- `editorInstance`

**États UI:**
- `loading`
- `error`
- `saving`
- `hasChanges`
- `showEtapeModal`
- `showModeleModal`
- `showDeleteEtapeModal`

## State Changes

**Modifications:**
- `processing` = `true` pendant l'exécution
- Toast 'Attribution en cours...' (info) au lancement
- Toast 'Attribution terminée' (succès) ou message d'erreur
- `processing` = `false` à la fin
## API Calls

**POST** `/api/workflows/attribution-impayes/execute`
- Body: `{ sequence_id: string }`
- Retour: `{ success: boolean, assigned_count: number }`



## Organisation des fichiers

```
frontend/
└── app/
    └── sequences-relance-detail/
        ├── index.html
        ├── components/
        │   └── (composants partagés)
        └── js/
            └── lancer-attribution.js
```

### Fichier principal
- **HTML** : `frontend/app/sequences-relance-detail/index.html`
- **Point d'entrée** : Initialise la page Alpine.js

### Fichier workflow
- **JS** : `frontend/app/sequences-relance-detail/js/lancer-attribution.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/sequences-relance-detail/js/lancer-attribution.js
export function lancerAttribution() {
  // Appel au workflow backend attribution-impayes
}
```

## Implementation

```javascript
async lancerAttribution() {
  this.processing = true;
  Alpine.store('ui').addToast('Attribution en cours...', 'info');
  
  try {
    const response = await fetch('/api/workflows/attribution-impayes/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sequence_id: this.sequence.id })
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error?.message || 'Erreur lors de l\'attribution');
    }
    
    Alpine.store('ui').addToast(`${data.assigned_count} impayés attribués`, 'success');
    
  } catch (error) {
    Alpine.store('ui').addToast(error.message, 'error');
  } finally {
    this.processing = false;
  }
}
```

## Logs (console.log) - OBLIGATOIRE

Chaque étape du workflow doit être loguée avec `console.log()`:

| Checkpoint | Instruction console.log |
|------------|------------------------|
| `start` | `console.log('[WORKFLOW.sequences-relance-detail-lancer-attribution] START: Lancement attribution manuelle pour séquence', this.sequence?.id)` |
| `validation` | `console.log('[WORKFLOW.sequences-relance-detail-lancer-attribution] STEP: Validation pré-appel (sequence.id présent, processing=false)')` |
| `processing-on` | `console.log('[WORKFLOW.sequences-relance-detail-lancer-attribution] STEP: processing = true, toast info "Attribution en cours..."')` |
| `api-call` | `console.log('[WORKFLOW.sequences-relance-detail-lancer-attribution] API: POST /api/workflows/attribution-impayes/execute avec payload', { sequence_id: this.sequence.id })` |
| `api-response` | `console.log('[WORKFLOW.sequences-relance-detail-lancer-attribution] API: Réponse reçue', data)` |
| `state-updated` | `console.log('[WORKFLOW.sequences-relance-detail-lancer-attribution] DATA: État après attribution:', { processing: this.processing, assigned_count: data.assigned_count })` |
| `end` | `console.log('[WORKFLOW.sequences-relance-detail-lancer-attribution] SUCCESS: Attribution terminée -', data.assigned_count, 'impayés assignés en', duree, 'ms')` |
| `error` | `console.error('[WORKFLOW.sequences-relance-detail-lancer-attribution] ERROR:', error)` |
