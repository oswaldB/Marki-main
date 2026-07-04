# Workflow Backend: regenerate-relances

**Feature** : F-011 Configuration séquences  
**Type** : Backend (Cloud Function)  
**Cloud Function** : `regenerateRelances`

## Description

Régénère les relances d'une séquence avec options pour réinitialiser les dates et inclure les relances envoyées.

## Input

```javascript
{
  sequenceId: String,
  resetDates: Boolean,      // Repartir de 0 avec nouvelles dates
  includeSent: Boolean      // Inclure les relances déjà envoyées
}
```

## Étapes

### 1. Récupération

```javascript
const Sequence = Parse.Object.extend('SequenceRelance')
const sequence = await new Parse.Query(Sequence).get(sequenceId)

const Relance = Parse.Object.extend('Relance')
const query = new Parse.Query(Relance)
query.equalTo('sequence', sequence)

if (!includeSent) {
  query.equalTo('envoyee', false)
  query.notEqualTo('statut', 'envoyee')
}

const relances = await query.find()
```

**CHECKPOINT**: `regenerate-loaded`
```json
{ "sequence": "Relance J+15", "count": 12 }
```

### 2. Suppression

```javascript
// Supprime les relances existantes
await Parse.Object.destroyAll(relances)
```

**CHECKPOINT**: `regenerate-deleted`

### 3. Régénération

```javascript
// Relance generate-relances pour cette séquence uniquement
const result = await generateRelancesForSequence(sequence, {
  resetDates: resetDates
})
```

**CHECKPOINT**: `regenerate-created`
```json
{ "newCount": 10 }
```

### 4. Journalisation

```javascript
const Activite = Parse.Object.extend('Activite')
const activite = new Activite()
activite.set('type', 'relances_regenerees')
activite.set('details', `Régénération de ${relances.length} relances`)
activite.set('sequence', sequence)
activite.set('metadata', { resetDates, includeSent, newCount: result.count })
await activite.save()
```

**CHECKPOINT**: `regenerate-completed`

## Output

```javascript
{
  success: true,
  deleted: 12,
  created: 10,
  sequence: "Relance J+15"
}
```

## Règles métier

- Les relances envoyées ne sont supprimées que si `includeSent: true`
- Les relances annulées sont toujours recréées
- Les dates reprennent à J si `resetDates: true`
