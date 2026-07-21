# Workflow: update-sequence

## Description

Met à jour les propriétés générales de la séquence (nom, validation_obligatoire, publication).

## Endpoint

```
PUT /api/sequences/:id
```

## Parameters

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Oui | Identifiant de la séquence |

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `nom` | string | Non | Nom de la séquence (max 255 caractères) |
| `validation_obligatoire` | boolean | Non | Validation obligatoire avant envoi |
| `actif` | boolean | Non | État de publication de la séquence |

## Request

### Headers

```
Authorization: Bearer {token}
Content-Type: application/json
```

### Example Request

```bash
curl -X PUT \
  "https://api.example.com/api/sequences/550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "nom": "Séquence relance standard modifiée",
    "validation_obligatoire": true,
    "actif": 1
  }'
```

## Response

### Success (200 OK)

```json
{
  "success": true,
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "nom": "Séquence relance standard modifiée",
  "validation_obligatoire": 1,
  "actif": 1,
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
    "nom": ["Le nom ne peut pas dépasser 255 caractères"]
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

#### 409 Conflict - Nom dupliqué

```json
{
  "error": "Une séquence avec ce nom existe déjà",
  "code": "DUPLICATE_NAME"
}
```

## Database Queries

```sql
-- Vérifier existence
SELECT id FROM sequences WHERE id = ?;

-- Vérifier doublon de nom
SELECT id FROM sequences WHERE nom = ? AND id != ?;

-- Mise à jour
UPDATE sequences 
SET 
  nom = COALESCE(?, nom),
  validation_obligatoire = COALESCE(?, validation_obligatoire),
  actif = COALESCE(?, actif),
  updated_at = NOW()
WHERE id = ?;
```

## Business Rules

1. **Nom unique** : Le nom doit être unique parmi toutes les séquences
2. **Longueur max** : Nom limité à 255 caractères
3. **Mise à jour partielle** : Seuls les champs fournis sont mis à jour
4. **Timestamp** : `updated_at` est automatiquement mis à jour

## Checkpoints

### @checkpoint Mise à jour complète
**Given**: Séquence existante avec id = `test-sequence-id`
**When**: PUT avec `{"nom": "Nouveau nom", "validation_obligatoire": true, "actif": 1}`
**Then**: Retourne 200, séquence mise à jour avec nouvelles valeurs

### @checkpoint Mise à jour partielle
**Given**: Séquence existante
**When**: PUT avec `{"nom": "Uniquement le nom"}`
**Then**: Seul le nom est modifié, autres champs inchangés

### @checkpoint Nom dupliqué
**Given**: Séquence A avec nom = "Existant", Séquence B avec id = `test-id`
**When**: PUT `{"nom": "Existant"}` sur séquence B
**Then**: Retourne 409 avec code "DUPLICATE_NAME"

### @checkpoint Séquence inexistante
**Given**: Aucune séquence avec id = `non-existent-id`
**When**: PUT sur cette séquence
**Then**: Retourne 404 avec code "SEQUENCE_NOT_FOUND"
