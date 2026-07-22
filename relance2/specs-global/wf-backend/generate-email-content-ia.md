# Workflow: generate-email-content-ia

## Description

Génère l'objet et le corps d'un email via IA selon le contexte (scénario, ton, variables disponibles).

## Endpoint

```
POST /api/sequences/:id/emails/generate
```

## Parameters

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Oui | Identifiant de la séquence (contexte) |

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `scenario` | string | Oui | Type de scénario: "single", "multiple", "broker_only", "impayes_broker" |
| `context` | string | Oui | Contexte/description de ce que doit contenir l'email |
| `tone` | string | Oui | Ton de l'email: "formel", "amicale", "ferme" |
| `variables` | array | Non | Liste des variables disponibles à utiliser |

#### Tone Options

- `formel` : Langage professionnel et courtois
- `amicale` : Ton chaleureux et bienveillant
- `ferme` : Ton assertif sans être agressif

## Request

### Headers

```
Authorization: Bearer {token}
Content-Type: application/json
```

### Example Request

```bash
curl -X POST \
  "https://api.example.com/api/sequences/550e8400-e29b-41d4-a716-446655440000/emails/generate" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "scenario": "single",
    "context": "Première relance pour une facture en retard de 15 jours",
    "tone": "amicale",
    "variables": ["{{nom_client}}", "{{prenom_client}}", "{{numero_facture}}", "{{montant_total}}", "{{date_echeance}}"]
  }'
```

## Response

### Success (200 OK)

```json
{
  "success": true,
  "objet": "Rappel facture {{numero_facture}} - {{nom_client}}",
  "corps": "<html>
  <body style=\"font-family: Arial, sans-serif; line-height: 1.6; color: #333;\">
    <p>Bonjour {{prenom_client}},</p>
    
    <p>J'espère que vous allez bien. Je me permis de vous contacter concernant la facture 
    <strong>n° {{numero_facture}}</strong> d'un montant de <strong>{{montant_total}} €</strong> 
    qui était due le <strong>{{date_echeance}}</strong>.</p>
    
    <p>Si le règlement est déjà en cours, merci de ne pas tenir compte de ce message. 
    Sinon, pourriez-vous m'indiquer quand vous pourriez procéder au paiement ?</p>
    
    <p>Je reste disponible pour toute question.</p>
    
    <p>Cordialement,<br>
    L'équipe comptable</p>
  </body>
</html>",
  "suggested_variables": ["{{nom_client}}", "{{prenom_client}}", "{{numero_facture}}", "{{montant_total}}", "{{date_echeance}}"],
  "generation_id": "gen_abc123xyz"
}
```

### Error Responses

#### 400 Bad Request - Validation

```json
{
  "error": "Données invalides",
  "code": "VALIDATION_ERROR",
  "details": {
    "scenario": ["Scénario invalide, doit être: single, multiple, broker_only, impayes_broker"],
    "tone": ["Ton invalide, doit être: formel, amicale, ferme"]
  }
}
```

#### 429 Too Many Requests

```json
{
  "error": "Limite de génération atteinte",
  "code": "RATE_LIMIT_EXCEEDED",
  "retry_after": 60
}
```

#### 503 Service Unavailable

```json
{
  "error": "Service IA temporairement indisponible",
  "code": "AI_SERVICE_UNAVAILABLE"
}
```

## Business Rules

1. **Scénario valide** : Doit être parmi: single, multiple, broker_only, impayes_broker
2. **Ton valide** : Doit être parmi: formel, amicale, ferme
3. **Variables supportées** : L'IA doit utiliser les variables fournies si pertinentes
4. **Rate limiting** : Maximum 10 générations par minute par utilisateur
5. **Timeout** : Timeout de 30 secondes sur l'appel IA

## Prompt Template

```
Tu es un assistant rédactionnel expert en communication commerciale pour une agence immobilière.

CONTEXTE:
- Type de scénario: {scenario}
- Description: {context}
- Ton souhaité: {tone}

VARIABLES DISPONIBLES (utilise-les si pertinent):
{variables}

INSTRUCTIONS:
1. Rédige un objet d'email concis et professionnel (max 100 caractères)
2. Rédige un corps d'email au format HTML
3. Intègre naturellement les variables disponibles
4. Adapte le ton selon la demande:
   - "formel": professionnel, distant mais courtois
   - "amicale": chaleureux, relationnel, bienveillant
   - "ferme": direct, assertif, sans agressivité

FORMAT DE RÉPONSE (JSON):
{
  "objet": "...",
  "corps": "<html>...</html>"
}
```

## Checkpoints

### @checkpoint Génération standard
**Given**: Scénario = "single", tone = "amicale", contexte valide
**When**: POST /api/sequences/:id/emails/generate
**Then**: Retourne 200 avec objet et corps générés, utilise les variables fournies

### @checkpoint Scénario invalide
**Given**: Scénario = "invalid"
**When**: POST avec ce scénario
**Then**: Retourne 400 avec liste des scénarios valides

### @checkpoint Ton invalide
**Given**: Tone = "agressif"
**When**: POST avec ce ton
**Then**: Retourne 400 avec liste des tons valides

### @checkpoint Rate limiting
**Given**: Utilisateur a déjà fait 10 requêtes dans la minute
**When**: 11ème requête
**Then**: Retourne 429 avec header Retry-After

### @checkpoint Variables utilisées
**Given**: Variables = ["{{nom_client}}", "{{montant_total}}"]
**When**: Génération
**Then**: Le corps contient ces variables dans le format {{variable}}
