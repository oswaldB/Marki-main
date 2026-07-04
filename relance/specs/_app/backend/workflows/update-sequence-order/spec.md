# Workflow Backend: update-sequence-order

**Feature** : F-011 Configuration séquences  
**Type** : Backend (Cloud Function)  
**Cloud Function** : `updateSequenceOrder`

## Description

Met à jour l'ordre (niveau) des séquences après un drag & drop ou réorganisation.

## Input

```javascript
{
  sequences: Array<{
    id: String,
    niveau: Number
  }>
}
```

## Validation

```javascript
// Vérifier les doublons de niveau
const niveaux = sequences.map(s => s.niveau)
const uniqueNiveaux = [...new Set(niveaux)]

if (niveaux.length !== uniqueNiveaux.length) {
  throw new Error('Niveaux en doublon')
}
```

**CHECKPOINT**: `update-order-validation`

## Mise à jour

```javascript
const Sequence = Parse.Object.extend('SequenceRelance')
const updates = []

for (const seq of sequences) {
  const sequence = Sequence.createWithoutData(seq.id)
  sequence.set('niveau', seq.niveau)
  updates.push(sequence)
}

await Parse.Object.saveAll(updates)
```

**CHECKPOINT**: `update-order-saved`
```json
{
  "updated": 3,
  "sequences": [
    { "id": "seq_1", "niveau": 1 },
    { "id": "seq_2", "niveau": 2 },
    { "id": "seq_3", "niveau": 3 }
  ]
}
```

## Output

```javascript
{
  success: true,
  updated: 3
}
```

## Journalisation

```javascript
const Activite = Parse.Object.extend('Activite')
const activite = new Activite()
activite.set('type', 'sequences_reordonnees')
activite.set('details', `${sequences.length} séquences réordonnées`)
await activite.save()
```
