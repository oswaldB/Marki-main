# Workflow: list-lien-paiements

## Description

Liste les liens de paiement disponibles pour utilisation comme variables dans les templates d'emails.

## Endpoint

```
GET /api/lien-paiements
```

## Parameters

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `actif` | integer | Non | 1 | Filtrer par statut actif |
| `type` | string | Non | - | Filtrer par type (stripe, paypal, virement, etc.) |
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
  "https://api.example.com/api/lien-paiements?actif=1&limit=100" \
  -H "Authorization: Bearer {token}"
```

## Response

### Success (200 OK)

```json
{
  "data": [
    {
      "id": "990e8400-e29b-41d4-a716-446655440001",
      "nom": "Paiement Stripe",
      "url": "https://pay.stripe.com/redirect/{{token_paiement}}",
      "type": "stripe",
      "actif": 1,
      "is_default": 1,
      "description": "Paiement sécurisé par carte bancaire",
      "variable_template": "{{lien_stripe}}",
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:30:00Z"
    },
    {
      "id": "990e8400-e29b-41d4-a716-446655440002",
      "nom": "Virement Bancaire",
      "url": "",
      "type": "virement",
      "actif": 1,
      "is_default": 0,
      "description": "Coordonnées bancaires pour virement",
      "variable_template": "{{coordonnees_bancaires}}",
      "created_at": "2024-01-16T14:00:00Z",
      "updated_at": "2024-01-16T14:00:00Z"
    },
    {
      "id": "990e8400-e29b-41d4-a716-446655440003",
      "nom": "PayPal",
      "url": "https://paypal.me/agenceimmobiliere/{{montant}}",
      "type": "paypal",
      "actif": 1,
      "is_default": 0,
      "description": "Paiement via PayPal",
      "variable_template": "{{lien_paypal}}",
      "created_at": "2024-01-17T09:00:00Z",
      "updated_at": "2024-01-17T09:00:00Z"
    }
  ],
  "pagination": {
    "total": 3,
    "page": 1,
    "limit": 50,
    "pages": 1
  }
}
```

### Alternative - Format Simple (pour insertion dans emails)

```json
{
  "data": [
    {
      "id": "990e8400-e29b-41d4-a716-446655440001",
      "nom": "Paiement Stripe",
      "variable": "{{lien_stripe}}"
    },
    {
      "id": "990e8400-e29b-41d4-a716-446655440002",
      "nom": "Virement Bancaire",
      "variable": "{{coordonnees_bancaires}}"
    },
    {
      "id": "990e8400-e29b-41d4-a716-446655440003",
      "nom": "PayPal",
      "variable": "{{lien_paypal}}"
    }
  ],
  "available_variables": ["{{lien_stripe}}", "{{coordonnees_bancaires}}", "{{lien_paypal}}"]
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
SELECT COUNT(*) as total FROM lien_paiements WHERE actif = ? OR ? IS NULL;

-- Récupérer les liens de paiement
SELECT 
  id, nom, url, type, actif, is_default, 
  description, variable_template, created_at, updated_at
FROM lien_paiements
WHERE actif = ? OR ? IS NULL
ORDER BY is_default DESC, nom ASC
LIMIT ? OFFSET ?;
```

## Business Rules

1. **Variables utilisables** : Chaque lien a un `variable_template` pour insertion dans les emails
2. **Ordre par défaut** : Le lien par défaut (`is_default = 1`) apparaît en premier
3. **Tri alphabétique** : Ensuite tri par nom croissant
4. **URL optionnelle** : Certains types (virement) n'ont pas d'URL mais des coordonnées
5. **Usage dans templates** : Les variables peuvent être utilisées dans les corps d'emails

## Types de Liens Supportés

| Type | Description | Exemple variable |
|------|-------------|------------------|
| `stripe` | Paiement par carte | `{{lien_stripe}}` |
| `paypal` | Paiement PayPal | `{{lien_paypal}}` |
| `virement` | Coordonnées bancaires | `{{coordonnees_bancaires}}` |
| `cheque` | Instructions chèque | `{{instructions_cheque}}` |
| `espece` | Paiement en espèces | `{{adresse_agence}}` |

## Checkpoints

### @checkpoint Liste complète
**Given**: 4 liens de paiement dont 3 actifs
**When**: GET /api/lien-paiements?actif=1
**Then**: Retourne uniquement les 3 liens actifs

### @checkpoint Format variables
**Given**: Lien avec variable_template = "{{lien_stripe}}"
**When**: Récupération de la liste
**Then**: La variable est incluse pour chaque lien

### @checkpoint Ordre par défaut
**Given**: Lien A (is_default=1), Lien B (is_default=0, nom="AAA")
**When**: GET /api/lien-paiements
**Then**: Lien A apparaît en premier (défaut prioritaire)

### @checkpoint Filtrage par type
**Given**: 2 liens stripe, 1 lien virement
**When**: GET /api/lien-paiements?type=stripe
**Then**: Retourne uniquement les 2 liens stripe

### @checkpoint Tous les liens
**Given**: Liens actifs et inactifs
**When**: GET /api/lien-paiements?actif=all
**Then**: Retourne tous les liens sans filtrage
