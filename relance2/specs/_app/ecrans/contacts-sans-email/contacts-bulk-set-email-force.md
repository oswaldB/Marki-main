# Workflow Backend: contacts-bulk-set-email-force

## Objectifs

Ce workflow permet de mettre à jour en masse le champ `email_force` pour un ensemble de contacts. Il offre :
- Une mise à jour batch efficace des contacts valides
- Une validation individuelle des contacts (existence, permissions)
- Un retour détaillé des succès et échecs par contact
- Une gestion des erreurs partielles sans rollback global

## Route API

```python
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
import sqlite3
import re
from datetime import datetime

router = APIRouter(prefix="/api/contacts", tags=["contacts"])

DB_PATH = "app/data/marki.db"

@router.post("/bulk-set-email-force", response_model=BulkSetEmailForceResponse)
async def bulk_set_email_force(
    request: BulkSetEmailForceRequest,
    # current_user: User = Depends(get_current_user)  # Si auth implémentée
):
    """
    Met à jour le champ email_force pour une liste de contacts.
    Supporte les mises à jour partielles avec rapport détaillé.
    """
    pass
```

## Requêtes SQL

### 1. Validation des IDs de contacts existants

```sql
-- Récupère les IDs existants et leurs données actuelles
SELECT 
    id,
    nom,
    prenom,
    email_force as current_email_force
FROM contacts 
WHERE id IN ({placeholders});
```

### 2. Mise à jour batch des contacts valides

```sql
-- Mise à jour en batch des contacts avec timestamp
UPDATE contacts 
SET 
    email_force = ?,
    updated_at = CURRENT_TIMESTAMP
WHERE id IN ({placeholders});
```

### 3. Vérification post-update (optionnel, pour rapport détaillé)

```sql
-- Récupère les contacts mis à jour pour confirmation
SELECT 
    id,
    email_force,
    updated_at
FROM contacts 
WHERE id IN ({placeholders});
```

## Modèles Pydantic

```python
from pydantic import BaseModel, Field, EmailStr, validator
from typing import List, Optional


class BulkSetEmailForceRequest(BaseModel):
    """Modèle de requête pour la mise à jour en masse d'email_force"""
    
    contact_ids: List[str] = Field(
        ...,
        min_items=1,
        description="Liste des IDs des contacts à mettre à jour (min: 1)",
        example=["550e8400-e29b-41d4-a716-446655440000", "550e8400-e29b-41d4-a716-446655440001"]
    )
    
    email_force: str = Field(
        ...,
        min_length=1,
        max_length=255,
        description="Email forcé à appliquer à tous les contacts sélectionnés",
        example="contact@example.com"
    )
    
    @validator('contact_ids')
    def validate_contact_ids(cls, v):
        if not v:
            raise ValueError('Au moins un contact doit être sélectionné')
        # Élimine les doublons tout en préservant l'ordre
        seen = set()
        unique = []
        for item in v:
            if item not in seen:
                seen.add(item)
                unique.append(item)
        return unique
    
    @validator('email_force')
    def validate_email_format(cls, v):
        if not v or not v.strip():
            raise ValueError("L'email ne peut pas être vide")
        
        # RFC 5322 simplifié
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(pattern, v.strip()):
            raise ValueError(f"Format d'email invalide: {v}")
        
        if len(v) > 255:
            raise ValueError("L'email ne peut pas dépasser 255 caractères")
        
        return v.strip()


class ContactError(BaseModel):
    """Détail d'une erreur pour un contact spécifique"""
    
    contact_id: str = Field(
        ...,
        description="ID du contact concerné par l'erreur"
    )
    error: str = Field(
        ...,
        description="Message d'erreur détaillé"
    )


class BulkSetEmailForceResponse(BaseModel):
    """Modèle de réponse pour la mise à jour en masse"""
    
    success: bool = Field(
        ...,
        description="Indique si l'opération globale est considérée comme réussie (même partiellement)"
    )
    updated: int = Field(
        ...,
        ge=0,
        description="Nombre de contacts effectivement mis à jour"
    )
    total_requested: int = Field(
        ...,
        ge=0,
        description="Nombre total de contacts demandés"
    )
    errors: List[ContactError] = Field(
        default=[],
        description="Liste des erreurs par contact"
    )
    
    @validator('success')
    def validate_success_consistency(cls, v, values):
        updated = values.get('updated', 0)
        total = values.get('total_requested', 0)
        errors = values.get('errors', [])
        
        # Success = true si au moins une mise à jour a réussi
        if updated > 0 and not v:
            raise ValueError('success doit être True si des mises à jour ont réussi')
        
        # Vérification cohérence: updated + len(errors) == total_requested
        if updated + len(errors) != total:
            raise ValueError('Incohérence: updated + errors != total_requested')
        
        return v
```

## Gestion des erreurs

### Codes HTTP

| Code | Condition | Message |
|------|-----------|---------|
| 200 OK | Succès total ou partiel | - |
| 400 Bad Request | Paramètres invalides | Détail dans `errors` ou message général |
| 401 Unauthorized | Utilisateur non authentifié | "Authentification requise" |
| 403 Forbidden | Droits insuffisants | "Permission refusée" |
| 422 Unprocessable Entity | Validation Pydantic échouée | Détail des champs invalides |
| 500 Internal Server Error | Erreur base de données | "Erreur interne du serveur" |

### Types d'erreurs par contact

| Type d'erreur | Condition | Message |
|---------------|-----------|---------|
| `CONTACT_NOT_FOUND` | ID non existant dans `contacts` | "Contact introuvable: {id}" |
| `EMAIL_FORMAT_INVALID` | Format email invalide | "Format d'email invalide" |
| `PERMISSION_DENIED` | ACL check échoué | "Permission refusée pour ce contact" |
| `DATABASE_ERROR` | Erreur SQL individuelle | "Erreur base de données: {detail}" |

### Logique de réponse

```python
def determine_http_status(response: BulkSetEmailForceResponse) -> int:
    """
    Détermine le code HTTP approprié selon le résultat
    """
    if response.updated == 0:
        # Aucune mise à jour réussie
        if response.errors:
            return 400  # Toutes les opérations ont échoué
        return 500  # Erreur inattendue
    
    if response.errors:
        # Succès partiel
        return 200  # ou 207 Multi-Status si supporté
    
    # Succès total
    return 200
```

## Exemples

### Exemple 1: Requête valide

**Requête:**
```http
POST /api/contacts/bulk-set-email-force
Content-Type: application/json

{
  "contact_ids": [
    "550e8400-e29b-41d4-a716-446655440000",
    "550e8400-e29b-41d4-a716-446655440001",
    "550e8400-e29b-41d4-a716-446655440002"
  ],
  "email_force": "relance@monentreprise.com"
}
```

**Réponse 200 OK:**
```json
{
  "success": true,
  "updated": 3,
  "total_requested": 3,
  "errors": []
}
```

### Exemple 2: Succès partiel (certains contacts inexistants)

**Requête:**
```http
POST /api/contacts/bulk-set-email-force
Content-Type: application/json

{
  "contact_ids": [
    "550e8400-e29b-41d4-a716-446655440000",
    "INVALID-ID-999",
    "550e8400-e29b-41d4-a716-446655440002"
  ],
  "email_force": "relance@monentreprise.com"
}
```

**Réponse 200 OK:**
```json
{
  "success": true,
  "updated": 2,
  "total_requested": 3,
  "errors": [
    {
      "contact_id": "INVALID-ID-999",
      "error": "Contact introuvable"
    }
  ]
}
```

### Exemple 3: Erreur globale (liste vide)

**Requête:**
```http
POST /api/contacts/bulk-set-email-force
Content-Type: application/json

{
  "contact_ids": [],
  "email_force": "test@example.com"
}
```

**Réponse 422 Unprocessable Entity:**
```json
{
  "detail": [
    {
      "loc": ["body", "contact_ids"],
      "msg": "Au moins un contact doit être sélectionné",
      "type": "value_error"
    }
  ]
}
```

### Exemple 4: Erreur de validation email

**Requête:**
```http
POST /api/contacts/bulk-set-email-force
Content-Type: application/json

{
  "contact_ids": ["550e8400-e29b-41d4-a716-446655440000"],
  "email_force": "invalid-email-format"
}
```

**Réponse 422 Unprocessable Entity:**
```json
{
  "detail": [
    {
      "loc": ["body", "email_force"],
      "msg": "Format d'email invalide: invalid-email-format",
      "type": "value_error"
    }
  ]
}
```

### Exemple 5: Échec total (tous les contacts inexistants)

**Requête:**
```http
POST /api/contacts/bulk-set-email-force
Content-Type: application/json

{
  "contact_ids": [
    "INVALID-001",
    "INVALID-002"
  ],
  "email_force": "test@example.com"
}
```

**Réponse 400 Bad Request:**
```json
{
  "success": false,
  "updated": 0,
  "total_requested": 2,
  "errors": [
    {
      "contact_id": "INVALID-001",
      "error": "Contact introuvable"
    },
    {
      "contact_id": "INVALID-002",
      "error": "Contact introuvable"
    }
  ]
}
```

## Implémentation complète (référence)

```python
@router.post("/bulk-set-email-force", response_model=BulkSetEmailForceResponse)
async def bulk_set_email_force(request: BulkSetEmailForceRequest):
    """
    Met à jour le champ email_force pour une liste de contacts.
    """
    errors: List[ContactError] = []
    updated_count = 0
    
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Récupère les IDs existants
        placeholders = ','.join('?' * len(request.contact_ids))
        cursor.execute(f"""
            SELECT id FROM contacts 
            WHERE id IN ({placeholders})
        """, request.contact_ids)
        
        existing_ids = {row['id'] for row in cursor.fetchall()}
        
        # Identifie les IDs manquants
        missing_ids = set(request.contact_ids) - existing_ids
        for missing_id in missing_ids:
            errors.append(ContactError(
                contact_id=missing_id,
                error="Contact introuvable"
            ))
        
        # Mise à jour des contacts existants
        if existing_ids:
            placeholders = ','.join('?' * len(existing_ids))
            cursor.execute(f"""
                UPDATE contacts 
                SET email_force = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id IN ({placeholders})
            """, (request.email_force, *existing_ids))
            
            conn.commit()
            updated_count = cursor.rowcount
        
        conn.close()
        
        # Détermine le statut global
        success = updated_count > 0
        
        response = BulkSetEmailForceResponse(
            success=success,
            updated=updated_count,
            total_requested=len(request.contact_ids),
            errors=errors
        )
        
        if updated_count == 0:
            raise HTTPException(status_code=400, detail=response.dict())
        
        return response
        
    except sqlite3.Error as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erreur base de données: {str(e)}"
        )
```

## Notes d'implémentation

1. **Performance**: Utilisation d'une seule requête UPDATE avec `WHERE id IN (...)` pour minimiser les allers-retours BDD
2. **Transactions**: Chaque contact est validé individuellement avant le batch update
3. **Pas de contrainte UNIQUE**: Le schéma ne montre pas de contrainte UNIQUE sur `email_force`, donc pas de gestion de conflit nécessaire
4. **Timezone**: `CURRENT_TIMESTAMP` utilise la timezone SQLite (UTC par défaut)
5. **Rollback**: Les mises à jour réussies sont conservées même en cas d'erreurs partielles
