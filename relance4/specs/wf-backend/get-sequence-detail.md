# Workflow: get-sequence-detail

## Description

Récupère une séquence avec tous ses emails et leurs scénarios associés pour l'écran de détail séquence.

## Endpoint

```
GET /api/sequences/:id
```

## Parameters

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Oui | Identifiant de la séquence |

## Request

### Headers

```
Authorization: Bearer {token}
Content-Type: application/json
```

### Example Request

```bash
curl -X GET \
  "https://api.example.com/api/sequences/550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer {token}"
```

## Response

### Success (200 OK)

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "nom": "Séquence de relance standard",
  "type_sequence": "relance",
  "actif": 1,
  "validation_obligatoire": 0,
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z",
  "emails": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "email_index": 1,
      "delai": 7,
      "created_at": "2024-01-15T10:30:00Z",
      "scenarios": [
        {
          "id": "770e8400-e29b-41d4-a716-446655440001",
          "format": "single",
          "active": 1,
          "objet": "Relance facture {{numero_facture}} - {{nom_client}}",
          "corps": "<html>Bonjour {{prenom_client}},<br><br>Nous vous rappelons...</html>",
          "cc": "comptable@example.com",
          "smtp_profile_id": "880e8400-e29b-41d4-a716-446655440001",
          "smtp_profile_nom": "SMTP Principal"
        },
        {
          "id": "770e8400-e29b-41d4-a716-446655440002",
          "format": "multiple",
          "active": 0,
          "objet": "",
          "corps": "",
          "cc": "",
          "smtp_profile_id": null,
          "smtp_profile_nom": null
        },
        {
          "id": "770e8400-e29b-41d4-a716-446655440003",
          "format": "broker_only",
          "active": 0,
          "objet": "",
          "corps": "",
          "cc": "",
          "smtp_profile_id": null,
          "smtp_profile_nom": null
        },
        {
          "id": "770e8400-e29b-41d4-a716-446655440004",
          "format": "impayes_broker",
          "active": 1,
          "objet": "Factures en retard - {{nom_client}}",
          "corps": "<html>Cher courtier...</html>",
          "cc": "",
          "smtp_profile_id": "880e8400-e29b-41d4-a716-446655440001",
          "smtp_profile_nom": "SMTP Principal"
        }
      ]
    }
  ]
}
```

### Error Responses

#### 404 Not Found

```json
{
  "error": "Séquence non trouvée",
  "code": "SEQUENCE_NOT_FOUND"
}
```

#### 401 Unauthorized

```json
{
  "error": "Token invalide ou expiré",
  "code": "UNAUTHORIZED"
}
```

## Database Queries

```sql
-- Récupérer la séquence
SELECT * FROM sequences WHERE id = ?;

-- Récupérer les emails de la séquence
SELECT * FROM sequences_emails 
WHERE sequence_id = ? 
ORDER BY email_index ASC;

-- Récupérer les scénarios pour chaque email
SELECT ss.*, sp.nom as smtp_profile_nom 
FROM sequences_scenarios ss
LEFT JOIN smtp_profiles sp ON ss.smtp_profile_id = sp.id
WHERE ss.sequence_email_id IN (?);
```

## Business Rules

1. **Séquence existante** : La séquence doit exister
2. **Ordre des emails** : Les emails doivent être triés par `email_index` croissant
3. **Scénarios par défaut** : Chaque email doit avoir 4 scénarios (single, multiple, broker_only, impayes_broker)
4. **Données liées** : Les noms des profils SMTP doivent être joints

## Checkpoints

### @checkpoint Récupération séquence valide
**Given**: Une séquence existe avec id = `test-sequence-id`
**When**: Appel GET `/api/sequences/test-sequence-id`
**Then**: Retourne 200 avec la séquence et ses emails

### @checkpoint Séquence inexistante
**Given**: Aucune séquence avec id = `non-existent-id`
**When**: Appel GET `/api/sequences/non-existent-id`
**Then**: Retourne 404 avec code "SEQUENCE_NOT_FOUND"

### @checkpoint Structure des scénarios
**Given**: Une séquence avec des emails
**When**: Récupération du détail
**Then**: Chaque email contient exactement 4 scénarios dans l'ordre: single, multiple, broker_only, impayes_broker
