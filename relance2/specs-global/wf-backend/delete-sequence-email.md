# Workflow: delete-sequence-email

## Description

Supprime un email de séquence et tous ses scénarios associés.

## Endpoint

```
DELETE /api/sequences/:sequenceId/emails/:emailId
```

## Parameters

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sequenceId` | string (UUID) | Oui | Identifiant de la séquence parente |
| `emailId` | string (UUID) | Oui | Identifiant de l'email à supprimer |

## Request

### Headers

```
Authorization: Bearer {token}
Content-Type: application/json
```

### Example Request

```bash
curl -X DELETE \
  "https://api.example.com/api/sequences/550e8400-e29b-41d4-a716-446655440000/emails/660e8400-e29b-41d4-a716-446655440001" \
  -H "Authorization: Bearer {token}"
```

## Response

### Success (200 OK)

```json
{
  "success": true,
  "message": "Email supprimé avec succès",
  "deleted_email_id": "660e8400-e29b-41d4-a716-446655440001",
  "deleted_at": "2024-01-20T14:30:00Z"
}
```

### Error Responses

#### 404 Not Found

```json
{
  "error": "Email non trouvé",
  "code": "EMAIL_NOT_FOUND"
}
```

#### 409 Conflict - Email en utilisation

```json
{
  "error": "Impossible de supprimer cet email",
  "code": "EMAIL_IN_USE",
  "details": "Cet email est référencé par des relances actives"
}
```

## Database Queries

```sql
-- Vérifier existence de l'email
SELECT id FROM sequences_emails 
WHERE id = ? AND sequence_id = ?;

-- Vérifier si l'email est utilisé
SELECT COUNT(*) as count 
FROM relances 
WHERE current_email_id = ?;

-- Suppression en cascade (transaction)
-- 1. D'abord les scénarios
DELETE FROM sequences_scenarios 
WHERE sequence_email_id = ?;

-- 2. Puis l'email
DELETE FROM sequences_emails 
WHERE id = ?;

-- 3. Réordonner les emails restants
UPDATE sequences_emails 
SET email_index = email_index - 1,
    updated_at = NOW()
WHERE sequence_id = ? 
  AND email_index > ?;
```

## Business Rules

1. **Existence** : L'email doit exister et appartenir à la séquence spécifiée
2. **Non-utilisation** : L'email ne doit pas être référencé par des relances actives
3. **Cascade** : Les scénarios associés sont supprimés automatiquement
4. **Réordonnancement** : Les emails suivants sont réindexés (email_index - 1)
5. **Transaction** : Toute l'opération est atomique

## Checkpoints

### @checkpoint Suppression réussie
**Given**: Email existant non utilisé avec email_index = 3
**When**: DELETE de cet email
**Then**: Email et scénarios supprimés, emails suivants réindexés

### @checkpoint Suppression dernier email
**Given**: Email existant avec email_index = 5 (dernier)
**When**: DELETE de cet email
**Then**: Email supprimé, aucun réordonnancement nécessaire

### @checkpoint Email utilisé
**Given**: Email référencé par des relances actives
**When**: DELETE de cet email
**Then**: Retourne 409 avec code "EMAIL_IN_USE"

### @checkpoint Email inexistant
**Given**: Aucun email avec id = `non-existent-id` dans la séquence
**When**: DELETE sur cet email
**Then**: Retourne 404 avec code "EMAIL_NOT_FOUND"
