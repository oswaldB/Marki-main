# Workflow: update-sequence-email

## Description

Met à jour un email de séquence (délai) et tous ses scénarios associés (objet, corps, CC, activation).

## Endpoint

```
PUT /api/sequences/:sequenceId/emails/:emailId
```

## Parameters

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sequenceId` | string (UUID) | Oui | Identifiant de la séquence parente |
| `emailId` | string (UUID) | Oui | Identifiant de l'email à modifier |

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `delai` | integer | Non | Délai en jours avant cet email |
| `scenarios` | array | Non | Liste des 4 scénarios à mettre à jour |

#### Scenarios Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `format` | string | Oui | Type: "single", "multiple", "broker_only", "impayes_broker" |
| `active` | integer | Oui | 1 = actif, 0 = inactif |
| `objet` | string | Non | Objet de l'email |
| `corps` | string | Non | Corps HTML de l'email |
| `cc` | string | Non | Adresses CC (séparées par virgule) |
| `smtp_profile_id` | string (UUID) | Non | ID du profil SMTP à utiliser |

## Request

### Headers

```
Authorization: Bearer {token}
Content-Type: application/json
```

### Example Request

```bash
curl -X PUT \
  "https://api.example.com/api/sequences/550e8400-e29b-41d4-a716-446655440000/emails/660e8400-e29b-41d4-a716-446655440001" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "delai": 14,
    "scenarios": [
      {
        "format": "single",
        "active": 1,
        "objet": "Relance facture {{numero_facture}}",
        "corps": "<html>Bonjour {{prenom_client}},...</html>",
        "cc": "comptable@example.com",
        "smtp_profile_id": "880e8400-e29b-41d4-a716-446655440001"
      },
      {
        "format": "multiple",
        "active": 0,
        "objet": "",
        "corps": "",
        "cc": "",
        "smtp_profile_id": null
      },
      {
        "format": "broker_only",
        "active": 0,
        "objet": "",
        "corps": "",
        "cc": "",
        "smtp_profile_id": null
      },
      {
        "format": "impayes_broker",
        "active": 1,
        "objet": "Factures en retard",
        "corps": "<html>Cher courtier...</html>",
        "cc": "",
        "smtp_profile_id": "880e8400-e29b-41d4-a716-446655440001"
      }
    ]
  }'
```

## Response

### Success (200 OK)

```json
{
  "success": true,
  "email_id": "660e8400-e29b-41d4-a716-446655440001",
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
    "delai": ["Le délai doit être un entier positif"],
    "scenarios": ["Exactement 4 scénarios requis"]
  }
}
```

#### 404 Not Found

```json
{
  "error": "Email non trouvé",
  "code": "EMAIL_NOT_FOUND"
}
```

## Database Queries

```sql
-- Vérifier existence de l'email
SELECT id FROM sequences_emails 
WHERE id = ? AND sequence_id = ?;

-- Mise à jour du délai
UPDATE sequences_emails 
SET delai = ?, updated_at = NOW()
WHERE id = ?;

-- Mise à jour des scénarios (transaction)
UPDATE sequences_scenarios 
SET 
  active = ?,
  objet = ?,
  corps = ?,
  cc = ?,
  smtp_profile_id = ?,
  updated_at = NOW()
WHERE sequence_email_id = ? AND format = ?;
```

## Business Rules

1. **Existence** : L'email doit exister et appartenir à la séquence spécifiée
2. **4 scénarios** : Exactement 4 scénarios doivent être fournis
3. **Formats valides** : Les formats doivent être: single, multiple, broker_only, impayes_broker
4. **Délai positif** : Le délai doit être un entier >= 0
5. **Transaction** : La mise à jour est atomique (email + scénarios)

## Checkpoints

### @checkpoint Mise à jour complète
**Given**: Email existant avec 4 scénarios
**When**: PUT avec délai modifié et 4 scénarios complets
**Then**: Email et scénarios mis à jour, retourne 200

### @checkpoint Mise à jour partielle délai seul
**Given**: Email existant
**When**: PUT avec uniquement `{"delai": 21}`
**Then**: Seul le délai est modifié, scénarios inchangés

### @checkpoint Scénarios incomplets
**Given**: Email existant
**When**: PUT avec seulement 3 scénarios
**Then**: Retourne 400 avec erreur "Exactement 4 scénarios requis"

### @checkpoint Email inexistant
**Given**: Aucun email avec id = `non-existent-id` dans la séquence
**When**: PUT sur cet email
**Then**: Retourne 404 avec code "EMAIL_NOT_FOUND"
