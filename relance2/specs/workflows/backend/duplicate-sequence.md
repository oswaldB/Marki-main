# Workflow: duplicate-sequence

## Description

Crée une copie d'une séquence existante avec tous ses emails et scénarios. La copie est créée en mode brouillon (actif = 0).

## Endpoint

```
POST /api/sequences/:id/duplicate
```

## Parameters

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Oui | Identifiant de la séquence à dupliquer |

### Request Body (Optional)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `nom` | string | Non | Nom personnalisé pour la copie (sinon auto-généré) |
| `copy_relances` | boolean | Non | Inclure les relances associées (défaut: false) |

## Request

### Headers

```
Authorization: Bearer {token}
Content-Type: application/json
```

### Example Request

```bash
curl -X POST \
  "https://api.example.com/api/sequences/550e8400-e29b-41d4-a716-446655440000/duplicate" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "nom": "Séquence standard - Copie janvier 2024",
    "copy_relances": false
  }'
```

## Response

### Success (201 Created)

```json
{
  "success": true,
  "message": "Séquence dupliquée avec succès",
  "original": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "nom": "Séquence de relance standard"
  },
  "copy": {
    "id": "550e8400-e29b-41d4-a716-446655440999",
    "nom": "Séquence standard - Copie janvier 2024",
    "actif": 0,
    "validation_obligatoire": 0,
    "created_at": "2024-01-20T14:30:00Z",
    "updated_at": "2024-01-20T14:30:00Z"
  },
  "stats": {
    "emails_copied": 3,
    "scenarios_copied": 12
  }
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

#### 409 Conflict - Nom existe

```json
{
  "error": "Une séquence avec ce nom existe déjà",
  "code": "DUPLICATE_NAME",
  "suggested_name": "Séquence standard - Copie (2)"
}
```

## Database Queries

```sql
-- 1. Récupérer la séquence originale
SELECT * FROM sequences WHERE id = ?;

-- 2. Récupérer les emails
SELECT * FROM sequences_emails WHERE sequence_id = ?;

-- 3. Récupérer les scénarios
SELECT ss.* FROM sequences_scenarios ss
JOIN sequences_emails se ON ss.sequence_email_id = se.id
WHERE se.sequence_id = ?;

-- 4. Créer la nouvelle séquence
INSERT INTO sequences (id, nom, type_sequence, actif, validation_obligatoire, created_at, updated_at)
VALUES (?, ?, ?, 0, ?, NOW(), NOW());

-- 5. Créer les nouveaux emails
INSERT INTO sequences_emails (id, sequence_id, email_index, delai, created_at, updated_at)
VALUES (?, ?, ?, ?, NOW(), NOW());

-- 6. Créer les nouveaux scénarios
INSERT INTO sequences_scenarios (
  id, sequence_email_id, format, active, objet, corps, cc, 
  smtp_profile_id, created_at, updated_at
)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW());
```

## Business Rules

1. **Copie complète** : Duplique la séquence + tous les emails + tous les scénarios
2. **Nom auto-généré** : Si non fourni, génère "{nom_original} - Copie" ou "{nom_original} - Copie (2)" si existe
3. **Brouillon** : La copie est toujours créée avec `actif = 0`
4. **Nouveaux IDs** : Tous les éléments reçoivent de nouveaux UUID
5. **Pas de relances** : Par défaut, ne copie pas les relances associées (option `copy_relances`)
6. **Transaction atomique** : Toute la duplication réussit ou échoue

## Nom Auto-Généré

```javascript
// Pseudo-code pour générer le nom
function generateCopyName(originalName) {
  let baseName = `${originalName} - Copie`;
  let counter = 1;
  let finalName = baseName;
  
  while (sequenceNameExists(finalName)) {
    counter++;
    finalName = `${baseName} (${counter})`;
  }
  
  return finalName;
}
```

## Checkpoints

### @checkpoint Duplication complète
**Given**: Séquence avec 3 emails et 12 scénarios
**When**: POST /api/sequences/:id/duplicate
**Then**: Retourne 201 avec nouvelle séquence, nouveaux IDs, actif = 0

### @checkpoint Nom personnalisé
**Given**: Séquence existante avec nom = "Original"
**When**: POST avec `{"nom": "Ma Copie Personnalisée"}`
**Then**: Nouvelle séquence a le nom "Ma Copie Personnalisée"

### @checkpoint Nom auto-généré
**Given**: Séquence "Standard" existe, "Standard - Copie" existe aussi
**When**: POST sans nom spécifié
**Then**: Nouvelle séquence nommée "Standard - Copie (2)"

### @checkpoint Nouveaux UUID
**Given**: Séquence originale avec id = "original-uuid"
**When**: Duplication
**Then**: Nouvelle séquence a un UUID différent, ainsi que tous les emails et scénarios

### @checkpoint Séquence inexistante
**Given**: Aucune séquence avec id = `non-existent-id`
**When**: POST /api/sequences/non-existent-id/duplicate
**Then**: Retourne 404 avec code "SEQUENCE_NOT_FOUND"

### @checkpoint État brouillon
**Given**: Séquence originale avec actif = 1
**When**: Duplication
**Then**: Copie a actif = 0 (brouillon)

### @checkpoint Conservation des données
**Given**: Séquence avec emails ayant délais et scénarios avec contenus
**When**: Duplication
**Then**: Toutes les données (délais, objets, corps, etc.) sont copiées identiques
