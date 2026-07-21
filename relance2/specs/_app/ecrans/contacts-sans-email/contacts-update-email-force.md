# Workflow Backend: contacts-update-email-force

## Titre
Mise à jour de l'email forcé d'un contact

---

## Objectifs
Ce workflow permet de mettre à jour le champ `email_force` d'un contact existant dans la base de données. Cet email est utilisé comme email de relance lorsque le contact n'a pas d'email principal défini.

**Cas d'usage principal :**
- L'utilisateur consulte la liste des contacts sans email (page "contacts-sans-email")
- L'utilisateur saisit un email forcé pour un contact
- Le système valide et persiste cet email dans le champ `email_force`

---

## Route API

| Propriété | Valeur |
|-----------|--------|
| **Méthode HTTP** | PUT |
| **Endpoint** | `/api/contacts/{id}` |
| **Description** | Met à jour le champ `email_force` d'un contact |

---

## Paramètres

### Path Parameters

| Paramètre | Type | Obligatoire | Description |
|-----------|------|-------------|-------------|
| `id` | string | Oui | UUID du contact à mettre à jour |

### Body Parameters

| Paramètre | Type | Obligatoire | Description |
|-----------|------|-------------|-------------|
| `email_force` | string | Oui | Adresse email forcée à enregistrer |

---

## Requêtes SQL

### 1. Vérification de l'existence du contact

```sql
SELECT id, email_force, updated_at 
FROM contacts 
WHERE id = ?
```

**Paramètres:** `[contact_id]`

**Résultat attendu:**
- Retourne 1 ligne si le contact existe
- Retourne 0 ligne si le contact n'existe pas → **Erreur 404**

---

### 2. Vérification de l'unicité de l'email

```sql
SELECT id 
FROM contacts 
WHERE email_force = ? AND id != ?
```

**Paramètres:** `[email_force, contact_id]`

**Résultat attendu:**
- Retourne 0 ligne si l'email n'est pas utilisé par un autre contact
- Retourne 1+ ligne si l'email est déjà utilisé → **Erreur 409**

---

### 3. Mise à jour du contact

```sql
UPDATE contacts 
SET 
    email_force = ?,
    updated_at = CURRENT_TIMESTAMP
WHERE id = ?
```

**Paramètres:** `[email_force, contact_id]`

**Résultat attendu:**
- Met à jour le champ `email_force` et le timestamp `updated_at`
- Doit affecter exactement 1 ligne

---

### 4. Récupération du contact mis à jour

```sql
SELECT 
    id,
    email_force,
    updated_at
FROM contacts 
WHERE id = ?
```

**Paramètres:** `[contact_id]`

**Résultat attendu:** Retourne les données du contact mis à jour pour la réponse API

---

## Modèles Pydantic

### Requête

```python
from pydantic import BaseModel, Field, EmailStr
from typing import Optional


class ContactUpdateEmailForceRequest(BaseModel):
    """
    Modèle de requête pour la mise à jour de l'email forcé d'un contact.
    """
    email_force: EmailStr = Field(
        ...,
        description="Adresse email forcée à enregistrer pour les relances",
        examples=["contact@exemple.fr"]
    )
```

### Réponse

```python
from pydantic import BaseModel, Field
from datetime import datetime


class ContactUpdateEmailForceResponse(BaseModel):
    """
    Modèle de réponse après mise à jour de l'email forcé.
    """
    id: str = Field(
        ...,
        description="UUID du contact mis à jour",
        examples=["550e8400-e29b-41d4-a716-446655440000"]
    )
    email_force: str = Field(
        ...,
        description="Adresse email forcée enregistrée",
        examples=["contact@exemple.fr"]
    )
    updated_at: datetime = Field(
        ...,
        description="Date et heure de la dernière modification (ISO 8601)",
        examples=["2025-01-20T14:30:00Z"]
    )
```

### Modèles d'erreur

```python
from pydantic import BaseModel, Field


class ErrorResponse(BaseModel):
    """
    Modèle de réponse en cas d'erreur.
    """
    detail: str = Field(
        ...,
        description="Message d'erreur détaillé"
    )
```

---

## Gestion des erreurs

| Code HTTP | Cas | Message |
|-----------|-----|---------|
| **400** | Format d'email invalide | `"Format d'email invalide"` |
| **404** | Contact non trouvé | `"Contact non trouvé"` |
| **409** | Email déjà utilisé par un autre contact | `"Cet email est déjà utilisé par un autre contact"` |
| **422** | Validation Pydantic échouée | Détails de l'erreur de validation |
| **500** | Erreur interne du serveur | `"Erreur interne du serveur"` |

---

## Exemples

### Requête d'exemple

```http
PUT /api/contacts/550e8400-e29b-41d4-a716-446655440000 HTTP/1.1
Host: localhost:8000
Content-Type: application/json

{
  "email_force": "contact@exemple.fr"
}
```

### Réponse succès (200 OK)

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email_force": "contact@exemple.fr",
  "updated_at": "2025-01-20T14:30:00Z"
}
```

### Réponse erreur - Contact non trouvé (404)

```json
{
  "detail": "Contact non trouvé"
}
```

### Réponse erreur - Email déjà utilisé (409)

```json
{
  "detail": "Cet email est déjà utilisé par un autre contact"
}
```

### Réponse erreur - Email invalide (400)

```json
{
  "detail": "Format d'email invalide"
}
```

---

## Implémentation FastAPI suggérée

```python
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
import sqlite3
from typing import Optional

router = APIRouter()

DB_PATH = "app/data/marki.db"


class ContactUpdateEmailForceRequest(BaseModel):
    email_force: EmailStr = Field(..., description="Adresse email forcée")


class ContactUpdateEmailForceResponse(BaseModel):
    id: str
    email_force: str
    updated_at: datetime


@router.put(
    "/api/contacts/{contact_id}",
    response_model=ContactUpdateEmailForceResponse,
    responses={
        404: {"description": "Contact non trouvé"},
        409: {"description": "Email déjà utilisé"},
        400: {"description": "Format d'email invalide"}
    }
)
async def update_contact_email_force(
    contact_id: str,
    request: ContactUpdateEmailForceRequest
):
    """
    Met à jour l'email forcé d'un contact.
    """
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    try:
        # 1. Vérifier que le contact existe
        cursor.execute(
            "SELECT id FROM contacts WHERE id = ?",
            (contact_id,)
        )
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Contact non trouvé")
        
        # 2. Vérifier que l'email n'est pas déjà utilisé par un autre contact
        cursor.execute(
            "SELECT id FROM contacts WHERE email_force = ? AND id != ?",
            (request.email_force, contact_id)
        )
        if cursor.fetchone():
            raise HTTPException(
                status_code=409, 
                detail="Cet email est déjà utilisé par un autre contact"
            )
        
        # 3. Mettre à jour le contact
        cursor.execute(
            """
            UPDATE contacts 
            SET email_force = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            """,
            (request.email_force, contact_id)
        )
        conn.commit()
        
        # 4. Récupérer les données mises à jour
        cursor.execute(
            "SELECT id, email_force, updated_at FROM contacts WHERE id = ?",
            (contact_id,)
        )
        row = cursor.fetchone()
        
        return ContactUpdateEmailForceResponse(
            id=row["id"],
            email_force=row["email_force"],
            updated_at=datetime.fromisoformat(row["updated_at"])
        )
        
    finally:
        conn.close()
```

---

## Notes d'implémentation

1. **Validation email** : Utiliser le type `EmailStr` de Pydantic pour une validation automatique du format
2. **Transaction** : Les requêtes sont exécutées dans une seule connexion SQLite
3. **Timestamp** : Le champ `updated_at` est automatiquement mis à jour avec `CURRENT_TIMESTAMP`
4. **Unicité** : Vérification logicielle de l'unicité (pas de contrainte UNIQUE sur `email_force` dans le schéma actuel)
5. **Case-sensibilité** : La comparaison d'email se fait en mode case-sensitive (comportement SQLite par défaut). Considérer `LOWER()` pour une comparaison insensible à la casse si nécessaire.
