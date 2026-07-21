# Workflow: reorder-sequence-emails

## Description

Met à jour l'ordre des emails (email_index) après déplacement dans l'interface de gestion de séquence.

## Endpoint

```
PUT /api/sequences/:id/emails/reorder
```

## Parameters

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Oui | Identifiant de la séquence |

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `emails` | array | Oui | Liste des emails avec leur nouvel ordre |

#### Email Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string (UUID) | Oui | Identifiant de l'email |
| `email_index` | integer | Oui | Nouvelle position (1-based) |

## Request

### Headers

```
Authorization: Bearer {token}
Content-Type: application/json
```

### Example Request

```bash
curl -X PUT \
  "https://api.example.com/api/sequences/550e8400-e29b-41d4-a716-446655440000/emails/reorder" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "emails": [
      {
        "id": "660e8400-e29b-41d4-a716-446655440001",
        "email_index": 1
      },
      {
        "id": "660e8400-e29b-41d4-a716-446655440003",
        "email_index": 2
      },
      {
        "id": "660e8400-e29b-41d4-a716-446655440002",
        "email_index": 3
      }
    ]
  }'
```

## Response

### Success (200 OK)

```json
{
  "success": true,
  "sequence_id": "550e8400-e29b-41d4-a716-446655440000",
  "updated_count": 3,
  "emails": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "email_index": 1
    },
    {
      "id": "660e8400-e29b-41d4-a716-446655440003",
      "email_index": 2
    },
    {
      "id": "660e8400-e29b-41d4-a716-446655440002",
      "email_index": 3
    }
  ],
  "updated_at": "2024-01-20T14:30:00Z"
}
```

### Error Responses

#### 400 Bad Request - Validation

```json
{
  "error": "Données invalides",
  "code": "VALIDATION_ERROR",
  "details": {
    "emails": [
      "La liste doit contenir tous les emails de la séquence",
      "Les indices doivent être uniques et consécutifs"
    ]
  }
}
```

#### 404 Not Found

```json
{
  "error": "Séquence non trouvée",
  "code": "SEQUENCE_NOT_FOUND"
}
```

#### 422 Unprocessable Entity - Email invalide

```json
{
  "error": "Email invalide dans la liste",
  "code": "INVALID_EMAIL_ID",
  "details": {
    "invalid_ids": ["non-existent-uuid"]
  }
}
```

## Database Queries

```sql
-- Vérifier existence de la séquence
SELECT id FROM sequences WHERE id = ?;

-- Récupérer les emails actuels pour validation
SELECT id, email_index FROM sequences_emails WHERE sequence_id = ?;

-- Mise à jour transactionnelle
UPDATE sequences_emails 
SET email_index = ?, updated_at = NOW()
WHERE id = ? AND sequence_id = ?;
```

## Business Rules

1. **Tous les emails** : La liste doit contenir exactement tous les emails de la séquence
2. **Indices consécutifs** : Les `email_index` doivent être 1, 2, 3... sans trou ni doublon
3. **Email appartenant** : Chaque email doit appartenir à la séquence spécifiée
4. **Transaction atomique** : Toutes les mises à jour réussissent ou échouent ensemble
5. **Validation stricte** : Rejet si la liste ne correspond pas aux emails actuels

## Validation Rules

```javascript
// Pseudo-code de validation
function validateReorder(emails, currentEmails) {
  // Vérifier même nombre d'emails
  if (emails.length !== currentEmails.length) {
    return { valid: false, error: "Nombre d'emails incorrect" };
  }
  
  // Vérifier que tous les IDs existent
  const currentIds = new Set(currentEmails.map(e => e.id));
  const newIds = new Set(emails.map(e => e.id));
  if (![...newIds].every(id => currentIds.has(id))) {
    return { valid: false, error: "IDs d'emails invalides" };
  }
  
  // Vérifier indices consécutifs 1-based
  const indices = emails.map(e => e.email_index).sort((a, b) => a - b);
  for (let i = 0; i < indices.length; i++) {
    if (indices[i] !== i + 1) {
      return { valid: false, error: "Indices doivent être consécutifs de 1 à n" };
    }
  }
  
  return { valid: true };
}
```

## Checkpoints

### @checkpoint Réordonnancement complet
**Given**: Séquence avec 3 emails (indices: 1, 2, 3)
**When**: PUT avec ordre inversé (3→1, 2→2, 1→3)
**Then**: Retourne 200, tous les indices mis à jour

### @checkpoint Liste incomplète
**Given**: Séquence avec 3 emails
**When**: PUT avec seulement 2 emails
**Then**: Retourne 400 avec erreur "Nombre d'emails incorrect"

### @checkpoint Indices non consécutifs
**Given**: Séquence avec 3 emails
**When**: PUT avec indices [1, 2, 4] (manque 3)
**Then**: Retourne 400 avec erreur "Indices non consécutifs"

### @checkpoint ID email invalide
**Given**: Séquence avec emails [A, B, C]
**When**: PUT avec emails [A, B, D(invalide)]
**Then**: Retourne 422 avec liste des IDs invalides

### @checkpoint Séquence inexistante
**Given**: Aucune séquence avec id = `non-existent-id`
**When**: PUT sur cette séquence
**Then**: Retourne 404 avec code "SEQUENCE_NOT_FOUND"

### @checkpoint Doublon d'indices
**Given**: Séquence avec 3 emails
**When**: PUT avec deux emails ayant email_index = 2
**Then**: Retourne 400 avec erreur "Indices doivent être uniques"
