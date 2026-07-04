# Workflow Backend: valider-relance-backend

**Feature** : F-009 Validation relances  
**Type** : Backend (Cloud Function)  
**Cloud Function** : `validateRelance`

## Description

Validation serveur d'une relance. Vérifie les permissions et met à jour le statut.

## Input

```javascript
{
  relanceId: String,
  userId: String
}
```

## Vérifications

### 1. Existence

```javascript
const relance = await new Parse.Query('Relance').get(relanceId)
if (!relance) throw new Error('Relance non trouvée')
```

### 2. Permissions

```javascript
const user = await new Parse.Query(Parse.User).get(userId)
const role = user.get('role')

if (!['agent', 'admin', 'manager'].includes(role)) {
  throw new Error('Permission insuffisante')
}
```

**CHECKPOINT**: `validate-relance-permission-check`

### 3. État actuel

```javascript
if (relance.get('valide')) {
  throw new Error('Déjà validée')
}

if (relance.get('envoyee')) {
  throw new Error('Déjà envoyée')
}

if (relance.get('statut') === 'annulee') {
  throw new Error('Relance annulée')
}
```

**CHECKPOINT**: `validate-relance-state-check`

## Validation

```javascript
relance.set('valide', true)
relance.set('dateValidation', new Date())
relance.set('validePar', user)
relance.set('statut', 'valide')
await relance.save()
```

**CHECKPOINT**: `validate-relance-success`
```json
{
  "relanceId": "rel_abc123",
  "validatedBy": "user_456",
  "timestamp": "2024-06-30T10:30:00Z"
}
```

## Output

```javascript
{
  success: true,
  relanceId: "rel_abc123",
  status: "valide"
}
```

## Erreurs possibles

- Relance non trouvée (404)
- Permission insuffisante (403)
- Déjà validée (400)
- Déjà envoyée (400)
- Annulée (400)
