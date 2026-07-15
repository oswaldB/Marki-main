# Workflow : Dupliquer une séquence

## Écran
`sequences.html`

## Élément déclencheur
Bouton avec `@click="duplicateSequence(sequence)"`

## Action
Créer une copie d'une séquence existante

## Description
- Duplique la séquence avec un nouveau nom
- Copie tous les emails et leur configuration
- La nouvelle séquence est inactive par défaut
- Redirige vers l'édition de la nouvelle séquence

## Data Model
**Page Function:** `sequencesPage()`

**Données:**
- `sequence` - la séquence à dupliquer

**États UI:**
- `loading`
- `error`

## State Changes

**Modifications:**
- `loading` → `true` → `false`
- `sequences` ← nouvelle séquence ajoutée

## API Calls

**`POST /api/sequences`** - Crée la copie de la séquence

**Payload:**
```json
{
  "nom": "Copie de Séquence Relance Standard",
  "type_sequence": "relances",
  "actif": false,
  "emails": [
    {
      "email_index": 1,
      "delai": 7,
      "objet": "Relance facture",
      "corps": "..."
    }
  ],
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
            └── duplicate-sequence.js
```

### Fichier principal
- **HTML** : `frontend/app/sequences/index.html`
- **Point d'entrée** : Initialise la page Alpine.js

### Fichier workflow
- **JS** : `frontend/app/sequences/js/duplicate-sequence.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/sequences/js/duplicate-sequence.js
export function duplicateSequence() {
  // Implementation du workflow
}
```

## Implementation

```javascript
async duplicateSequence(sequence) {
  // 1. Confirm action
  if (!confirm(`Dupliquer la séquence "${sequence.nom}" ?`)) return;
  
  // 2. Set loading
  this.loading = true;
  this.error = null;
  
  try {
    // 3. Prepare payload (copy with new name)
    const payload = {
      nom: `Copie de ${sequence.nom}`,
      type_sequence: sequence.type_sequence,
      actif: false, // Inactive by default
      emails: sequence.emails || [],
      validation_obligatoire: sequence.validation_obligatoire || false,
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
      throw new Error(data.error?.message || 'Erreur lors de la duplication');
    }
    
    // 5. Update local array
    this.sequences.unshift(data.data);
    
    // 6. Redirect to edit page
    window.location.href = `/sequences-relance-detail.html?id=${data.data.id}`;
    
    // 7. Notify
    Alpine.store('ui').addToast('Séquence dupliquée', 'success');
    
  } catch (error) {
    this.error = error.message;
    Alpine.store('ui').addToast(error.message, 'error');
  } finally {
    this.loading = false;
  }
}
```

## Notes

- La séquence dupliquée est créée avec le statut `inactif` (actif: false)
- L'utilisateur doit l'activer manuellement après modification
- Tous les emails et leur configuration sont copiés
- Le nom est préfixé par "Copie de "

## Logs (console.log) - OBLIGATOIRE

Chaque étape du workflow doit être loguée avec `console.log()`:

| Checkpoint | Instruction console.log |
|------------|------------------------|
| `start` | `console.log('[WORKFLOW.sequences-duplicate-sequence] START: Duplication séquence', { sequenceId: sequence.id, sequenceName: sequence.nom })` |
| `validation` | `console.log('[WORKFLOW.sequences-duplicate-sequence] STEP: Confirmation utilisateur validée pour', sequence.nom)` |
| `payload-prepared` | `` console.log('[WORKFLOW.sequences-duplicate-sequence] DATA: Payload préparé:', { nom: `Copie de ${sequence.nom}`, type_sequence: sequence.type_sequence, actif: false, emailsCount: sequence.emails?.length || 0 }) `` |
| `api-call` | `console.log('[WORKFLOW.sequences-duplicate-sequence] API: POST /api/sequences', { url: '/api/sequences', method: 'POST' })` |
| `state-updated` | `console.log('[WORKFLOW.sequences-duplicate-sequence] STEP: Nouvelle séquence ajoutée en tête de liste', { newSequenceId: data.data.id })` |
| `redirect` | `` console.log('[WORKFLOW.sequences-duplicate-sequence] STEP: Redirection vers édition de la nouvelle séquence', { targetUrl: `/sequences-relance-detail.html?id=${data.data.id}` }) `` |
| `end` | `console.log('[WORKFLOW.sequences-duplicate-sequence] SUCCESS: Séquence dupliquée avec succès en', duree, 'ms')` |
| `error` | `console.error('[WORKFLOW.sequences-duplicate-sequence] ERROR:', error)` |
