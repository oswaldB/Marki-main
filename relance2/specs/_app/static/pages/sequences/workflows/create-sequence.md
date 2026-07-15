# Workflow : Créer une séquence

## Écran
`sequences.html`

## Élément déclencheur
Bouton avec `@click="createSequence()"` dans le modal de nouvelle séquence

## Action
Créer une nouvelle séquence en base de données

## Description
- Valide les données du formulaire (nom, type_sequence)
- Crée la séquence via API avec emails vides par défaut
- Rafraîchit la liste des séquences
- Ferme le modal
- Redirige vers l'édition pour configurer les emails

## Data Model
**Page Function:** `sequencesPage()`

**Données:**
- `newSequence` - données du formulaire (nom, type_sequence, actif)

**États UI:**
- `loading`
- `error`
- `showNewSequenceModal`

## State Changes

**Modifications:**
- `loading` → `true` → `false`
- `sequences` ← nouvelle séquence ajoutée
- `showNewSequenceModal` → `false`

## API Calls

**`POST /api/sequences`** - Crée une nouvelle séquence

**Payload:**
```json
{
  "nom": "Séquence Relance Standard",
  "type_sequence": "relances",
  "actif": true,
  "emails": [],
  "validation_obligatoire": false,
  "created_at": "2026-07-12T10:00:00Z",
  "updated_at": "2026-07-12T10:00:00Z"
}
```

**Response:** `ApiResponse<Sequence>`

## Organisation des fichiers

```
frontend/
└── app/
    └── sequences/
        ├── index.html
        ├── components/
        │   └── (composants partagés)
        └── js/
            └── create-sequence.js
```

### Fichier principal
- **HTML** : `frontend/app/sequences/index.html`
- **Point d'entrée** : Initialise la page Alpine.js

### Fichier workflow
- **JS** : `frontend/app/sequences/js/create-sequence.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/sequences/js/create-sequence.js
export function createSequence() {
  // Implementation du workflow
}
```

## Implementation

```javascript
async createSequence() {
  // 1. Validate form
  if (!this.newSequence.nom || !this.newSequence.type_sequence) {
    Alpine.store('ui').addToast('Veuillez remplir tous les champs obligatoires', 'error');
    return;
  }
  
  // 2. Set loading
  this.loading = true;
  this.error = null;
  
  try {
    // 3. Prepare payload
    const payload = {
      ...this.newSequence,
      actif: true,
      emails: [],
      validation_obligatoire: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // 4. Call API
    const response = await fetch('/api/sequences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error?.message || 'Erreur lors de la création');
    }
    
    // 5. Update local array
    this.sequences.unshift(data.data);
    
    // 6. Close modal
    this.showNewSequenceModal = false;
    this.newSequence = this.getInitialState();
    
    // 7. Redirect to edit page to configure emails
    window.location.href = `/sequences-relance-detail.html?id=${data.data.id}`;
    
    // 8. Notify
    Alpine.store('ui').addToast('Séquence créée', 'success');
    
  } catch (error) {
    this.error = error.message;
    Alpine.store('ui').addToast(error.message, 'error');
  } finally {
    this.loading = false;
  }
}
```

## Notes

- La séquence est créée avec un tableau `emails` vide
- L'utilisateur est redirigé vers la page d'édition pour configurer les emails de la séquence
- `type_sequence` peut être `relances` ou `suivi`

## Logs (console.log) - OBLIGATOIRE

Chaque étape du workflow doit être loguée avec `console.log()`:

| Checkpoint | Instruction console.log |
|------------|------------------------|
| `start` | `console.log('[WORKFLOW.sequences-create-sequence] START: Création nouvelle séquence', {nom, type_sequence})` |
| `validation` | `console.log('[WORKFLOW.sequences-create-sequence] STEP: Validation formulaire', {nom: !!this.newSequence.nom, type_sequence: !!this.newSequence.type_sequence})` |
| `loading-on` | `console.log('[WORKFLOW.sequences-create-sequence] STEP: loading = true')` |
| `api-call` | `console.log('[WORKFLOW.sequences-create-sequence] API_CALL: POST /api/sequences', payload)` |
| `api-response` | `console.log('[WORKFLOW.sequences-create-sequence] API_RESPONSE: status', response.status, 'success', data.success)` |
| `state-updated` | `console.log('[WORKFLOW.sequences-create-sequence] STATE_UPDATED: sequences.unshift(id)', data.data.id, 'total =', this.sequences.length)` |
| `modal-closed` | `console.log('[WORKFLOW.sequences-create-sequence] STEP: showNewSequenceModal = false, formulaire réinitialisé')` |
| `redirect` | `console.log('[WORKFLOW.sequences-create-sequence] STEP: Redirection vers édition', '/sequences-relance-detail.html?id=' + data.data.id)` |
| `end` | `console.log('[WORKFLOW.sequences-create-sequence] SUCCESS: Séquence créée en', duree, 'ms')` |
| `error` | `console.error('[WORKFLOW.sequences-create-sequence] ERROR:', error.message)` |
