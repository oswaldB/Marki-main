# Workflow : Changer de séquence

## Écran
`impayes-detail.html`

## Élément déclencheur
Sélecteur avec `@change="changerSequence($event.target.value)"`

## Action
Modifier la séquence de relance associée à un impayé

## Description
- Affiche un sélecteur avec les séquences disponibles
- Met à jour `sequence_id` dans la table `impayes`
- Relance l'index à 0 (redémarre la séquence depuis le début)

## Data Model

**Page Function:** `impayesDetailPage()`

**Données:**
- `impaye` - impayé en cours de visualisation
- `sequences` - liste des séquences disponibles (chargées depuis `sequences`)
- `selectedSequenceId` - ID de la séquence sélectionnée

**Champs modifiés dans `impayes`:**
- `sequence_id` ← ID de la nouvelle séquence (ou `null` pour aucune)
- `email_index` ← `0` (reset de l'étape de relance)

**États UI:**
- `loading`
- `error`
- `sequences` - liste des séquences disponibles

## State Changes

**Modifications:**
- `impaye.sequence_id` ← nouvelle séquence ID
- `impaye.email_index` ← `0` (reset)

## API Calls

### 1. Charger les séquences disponibles

**Endpoint:** `GET /api/sequences?actif=true`

**Table:** `sequences`

**Response:** `ApiResponse<Sequence[]>`

### 2. Mettre à jour l'impayé

**Endpoint:** `PUT /api/impayes/:id`

**Payload:**
```json
{
  "sequence_id": "seq_001",
  "email_index": 0,
  "updated_at": "2026-07-10T15:30:00Z"
}
```

**Table:** `impayes`

**Response:** `ApiResponse<Impaye>`

## Organisation des fichiers

```
frontend/
└── app/
    └── impayes-detail/
        ├── index.html
        └── js/
            └── changer-sequence.js
```

### Fichier workflow
- **JS** : `frontend/app/impayes-detail/js/changer-sequence.js`

```javascript
// frontend/app/impayes-detail/js/changer-sequence.js
export function changerSequence() {
  // Implementation du workflow
}
```

## Implementation

```javascript
async loadSequences() {
  try {
    const response = await fetch('/api/sequences?actif=true');
    const data = await response.json();
    
    if (data.success) {
      this.sequences = data.data;
    }
  } catch (error) {
    console.error('Erreur chargement séquences:', error);
  }
}

async changerSequence(impayeId, sequenceId) {
  this.loading = true;
  
  try {
    const response = await fetch(`/api/impayes/${impayeId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sequence_id: sequenceId || null,
        email_index: 0, // Reset à la première étape
        updated_at: new Date().toISOString()
      })
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error?.message);
    }
    
    // Update local
    this.impaye.sequence_id = sequenceId;
    this.impaye.email_index = 0;
    
    Alpine.store('ui').addToast('Séquence mise à jour', 'success');
    
  } catch (error) {
    Alpine.store('ui').addToast(error.message, 'error');
  } finally {
    this.loading = false;
  }
}
```

## Notes

- Le changement de séquence reset `email_index` à 0 pour recommencer depuis le début
- Si `sequence_id` est `null`, l'impayé n'est plus dans aucune séquence de relance
- Les séquences disponibles sont filtrées sur `actif: true`
