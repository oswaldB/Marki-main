# Workflow: list-smtp-profiles

## Description

Liste tous les profils SMTP actifs pour sélection dans les scénarios d'emails.

## Endpoint

```
GET /api/smtp-profiles
```

## Parameters

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `actif` | integer | Non | 1 | Filtrer par statut actif (0 = inactifs, 1 = actifs, all = tous) |
| `page` | integer | Non | 1 | Numéro de page |
| `limit` | integer | Non | 50 | Nombre d'items par page (max 100) |

## Request

### Headers

```
Authorization: Bearer {token}
Content-Type: application/json
```

### Example Request

```bash
curl -X GET \
  "https://api.example.com/api/smtp-profiles?actif=1&page=1&limit=20" \
  -H "Authorization: Bearer {token}"
```

## Response

### Success (200 OK)

```json
{
  "data": [
    {
      "id": "880e8400-e29b-41d4-a716-446655440001",
      "nom": "SMTP Principal",
      "from_email": "facturation@agence-immobiliere.fr",
      "from_name": "Agence Immobilière - Facturation",
      "host": "smtp.example.com",
      "port": 587,
      "encryption": "tls",
      "actif": 1,
      "is_default": 1,
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:30:00Z"
    },
    {
      "id": "880e8400-e29b-41d4-a716-446655440002",
      "nom": "SMTP Marketing",
      "from_email": "marketing@agence-immobiliere.fr",
      "from_name": "Agence Immobilière",
      "host": "smtp-marketing.example.com",
      "port": 587,
      "encryption": "tls",
      "actif": 1,
      "is_default": 0,
      "created_at": "2024-01-16T14:00:00Z",
      "updated_at": "2024-01-16T14:00:00Z"
    }
  ],
  "pagination": {
    "total": 2,
    "page": 1,
    "limit": 50,
    "pages": 1
  }
}
```

### Alternative - Format Simple (pour dropdowns)

```json
{
  "data": [
    {
      "id": "880e8400-e29b-41d4-a716-446655440001",
      "nom": "SMTP Principal",
      "from_email": "facturation@agence-immobiliere.fr"
    },
    {
      "id": "880e8400-e29b-41d4-a716-446655440002",
      "nom": "SMTP Marketing",
      "from_email": "marketing@agence-immobiliere.fr"
    }
  ]
}
```

### Error Responses

#### 401 Unauthorized

```json
{
  "error": "Token invalide ou expiré",
  "code": "UNAUTHORIZED"
}
```

## Database Queries

```sql
-- Compter le total
SELECT COUNT(*) as total FROM smtp_profiles WHERE actif = ? OR ? IS NULL;

-- Récupérer les profils (sans le mot de passe)
SELECT 
  id, nom, from_email, from_name, host, port, 
  encryption, actif, is_default, created_at, updated_at
FROM smtp_profiles
WHERE actif = ? OR ? IS NULL
ORDER BY is_default DESC, nom ASC
LIMIT ? OFFSET ?;
```

## Business Rules

1. **Sécurité** : Le mot de passe SMTP n'est jamais retourné dans la réponse
2. **Ordre par défaut** : Le profil par défaut (`is_default = 1`) apparaît en premier
3. **Tri alphabétique** : Ensuite tri par nom croissant
4. **Pagination** : Supporte la pagination avec limit max 100
5. **Filtrage** : Peut filtrer par statut actif/inactif

## Checkpoints

### @checkpoint Liste complète
**Given**: 3 profils SMTP dont 2 actifs et 1 inactif
**When**: GET /api/smtp-profiles?actif=1
**Then**: Retourne uniquement les 2 profils actifs, triés avec défaut en premier

### @checkpoint Tous les profils
**Given**: 3 profils SMTP (2 actifs, 1 inactif)
**When**: GET /api/smtp-profiles?actif=all
**Then**: Retourne les 3 profils

### @checkpoint Pas de mot de passe
**Given**: Profils SMTP existants
**When**: Récupération de la liste
**Then**: Aucun champ "password" ou "mot_de_passe" dans la réponse

### @checkpoint Pagination
**Given**: 25 profils SMTP
**When**: GET /api/smtp-profiles?page=2&limit=10
**Then**: Retourne les items 11-20 avec pagination correcte

### @checkpoint Ordre par défaut
**Given**: Profil A (is_default=0, nom="Z"), Profil B (is_default=1, nom="A")
**When**: GET /api/smtp-profiles
**Then**: Profil B apparaît avant Profil A (défaut prioritaire)
