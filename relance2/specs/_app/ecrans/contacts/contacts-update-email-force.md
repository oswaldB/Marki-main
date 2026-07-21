# Workflow Backend: contacts-update-email-force

## Objectifs

Mettre à jour le champ `email_force` d'un contact spécifique. Cet email forcé remplacera l'email principal lors de l'envoi des relances. Le workflow valide le format de l'email et vérifie que le contact existe avant mise à jour.

**Cas particuliers gérés :**
- Email vide ou null : accepté pour réinitialiser l'email forcé (mettre `email_force` à `NULL`)
- Format email invalide : retourne une erreur 400
- Contact inexistant : retourne une erreur 404
- Contact blacklisté : autorise quand même la mise à jour
- Email identique à l'email principal : accepté sans erreur

---

## Route API

```python
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr, validator
from typing import Optional
import sqlite3
from datetime import datetime

router = APIRouter()

def get_db():
    conn = sqlite3.connect("app/data/marki.db")
    conn.row_factory = sqlite3.Row
    return conn

@router.put("/api/contacts/{contact_id}/email-force")
async def update_contact_email_force(
    contact_id: str,
    request: EmailForceUpdateRequest,
    db: sqlite3.Connection = Depends(get_db)
):
    """
    Met à jour l'email forcé d'un contact.
    """
    pass  # Implémentation ci-dessous
```

---

## Requêtes SQL

### 1. Vérifier l'existence du contact

```sql
SELECT 
    id,
    nom,
    prenom,
    email,
    email_force,
    type_personne,
    statut,
    is_blacklisted,
    updated_at
FROM contacts
WHERE id = :contact_id
```

**Paramètres :**
- `:contact_id` (TEXT) - UUID du contact

**Résultat attendu :** Une ligne si le contact existe, aucune sinon.

---

### 2. Mettre à jour l'email forcé

```sql
UPDATE contacts
SET 
    email_force = :email_force,
    updated_at = :updated_at
WHERE id = :contact_id
```

**Paramètres :**
- `:contact_id` (TEXT) - UUID du contact
- `:email_force` (TEXT | NULL) - Nouvelle valeur de l'email forcé
- `:updated_at` (TEXT) - Timestamp ISO 8601 actuel

---

### 3. Récupérer le contact mis à jour

```sql
SELECT 
    id,
    nom,
    prenom,
    email,
    email_force,
    type_personne,
    statut,
    is_blacklisted,
    updated_at
FROM contacts
WHERE id = :contact_id
```

---

## Modèles Pydantic

### Modèle de requête

```python
class EmailForceUpdateRequest(BaseModel):
    """
    Requête pour mettre à jour l'email forcé d'un contact.
    """
    email_force: Optional[str]
    
    @validator('email_force')
    def validate_email_format(cls, v):
        """
        Valide le format de l'email si fourni.
        """
        if v is None or v.strip() == "":
            return None
        
        # Validation basique du format email
        import re
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_pattern, v.strip()):
            raise ValueError('Format d\'email invalide')
        
        return v.strip()
    
    class Config:
        json_schema_extra = {
            "example": {
                "email_force": "finance@entreprise.fr"
            }
        }
```

### Modèle de réponse - Contact

```python
class ContactEmailForceResponse(BaseModel):
    """
    Données du contact après mise à jour de l'email forcé.
    """
    id: str
    nom: Optional[str]
    prenom: Optional[str]
    email: Optional[str]
    email_force: Optional[str]
    type_personne: Optional[str]
    statut: Optional[str]
    is_blacklisted: int
    updated_at: str
    
    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": "uuid-contact",
                "nom": "Lefebvre",
                "prenom": "Marie",
                "email": "marie@email.com",
                "email_force": "finance@entreprise.fr",
                "type_personne": "P",
                "statut": "actif",
                "is_blacklisted": 0,
                "updated_at": "2025-01-15T14:30:00Z"
            }
        }
```

### Modèle de réponse - Succès

```python
from typing import Generic, TypeVar

T = TypeVar('T')

class ApiResponse(BaseModel, Generic[T]):
    """
    Réponse API standardisée.
    """
    success: bool
    data: Optional[T] = None
    message: Optional[str] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "data": {
                    "id": "uuid-contact",
                    "nom": "Lefebvre",
                    "prenom": "Marie",
                    "email": "marie@email.com",
                    "email_force": "finance@entreprise.fr",
                    "type_personne": "P",
                    "statut": "actif",
                    "is_blacklisted": 0,
                    "updated_at": "2025-01-15T14:30:00Z"
                },
                "message": "Email forcé mis à jour avec succès"
            }
        }
```

### Modèle de réponse - Erreur

```python
class ErrorDetail(BaseModel):
    """
    Détail d'une erreur API.
    """
    code: str
    message: str
    field: Optional[str] = None

class ErrorResponse(BaseModel):
    """
    Réponse d'erreur API.
    """
    success: bool = False
    error: ErrorDetail
    
    class Config:
        json_schema_extra = {
            "example": {
                "success": False,
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": "Format d'email invalide",
                    "field": "email_force"
                }
            }
        }
```

---

## Gestion des erreurs

| Code HTTP | Code d'erreur | Message | Condition |
|-----------|---------------|---------|-----------|
| 400 | `VALIDATION_ERROR` | "Format d'email invalide" | L'email fourni ne respecte pas le format standard |
| 400 | `VALIDATION_ERROR` | "Le champ email_force est requis" | Body JSON manquant ou malformé |
| 404 | `CONTACT_NOT_FOUND` | "Contact non trouvé" | Le `contact_id` n'existe pas dans la table `contacts` |
| 500 | `INTERNAL_ERROR` | "Erreur lors de la mise à jour" | Erreur base de données ou exception inattendue |

### Implémentation des erreurs

```python
from fastapi import HTTPException

# 404 - Contact non trouvé
if not contact:
    raise HTTPException(
        status_code=404,
        detail={
            "success": False,
            "error": {
                "code": "CONTACT_NOT_FOUND",
                "message": "Contact non trouvé"
            }
        }
    )

# 400 - Validation Pydantic (automatique)
# Levé automatiquement par FastAPI si le format email est invalide

# 500 - Erreur interne
try:
    cursor.execute(update_query, params)
    conn.commit()
except sqlite3.Error as e:
    raise HTTPException(
        status_code=500,
        detail={
            "success": False,
            "error": {
                "code": "INTERNAL_ERROR",
                "message": f"Erreur lors de la mise à jour: {str(e)}"
            }
        }
    )
```

---

## Exemples

### Exemple de requête

```bash
curl -X PUT "http://localhost:8000/api/contacts/550e8400-e29b-41d4-a716-446655440000/email-force" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "email_force": "finance@entreprise.fr"
  }'
```

### Exemple de réponse succès (200 OK)

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "nom": "Lefebvre",
    "prenom": "Marie",
    "email": "marie@email.com",
    "email_force": "finance@entreprise.fr",
    "type_personne": "P",
    "statut": "actif",
    "is_blacklisted": 0,
    "updated_at": "2025-01-15T14:30:00Z"
  },
  "message": "Email forcé mis à jour avec succès"
}
```

### Exemple de réponse - Réinitialisation (200 OK)

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "nom": "Lefebvre",
    "prenom": "Marie",
    "email": "marie@email.com",
    "email_force": null,
    "type_personne": "P",
    "statut": "actif",
    "is_blacklisted": 0,
    "updated_at": "2025-01-15T14:35:00Z"
  },
  "message": "Email forcé mis à jour avec succès"
}
```

### Exemple d'erreur - Format email invalide (400 Bad Request)

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Format d'email invalide",
    "field": "email_force"
  }
}
```

### Exemple d'erreur - Contact non trouvé (404 Not Found)

```json
{
  "success": false,
  "error": {
    "code": "CONTACT_NOT_FOUND",
    "message": "Contact non trouvé"
  }
}
```

---

## Implémentation complète

```python
from fastapi import APIRouter, HTTPException, Depends, Path
from pydantic import BaseModel, validator
from typing import Optional
import sqlite3
from datetime import datetime
import re

router = APIRouter()

# Chemin de la base de données
DB_PATH = "app/data/marki.db"


def get_db():
    """Dépendance pour obtenir une connexion DB."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


class EmailForceUpdateRequest(BaseModel):
    """Requête pour mettre à jour l'email forcé d'un contact."""
    email_force: Optional[str] = None
    
    @validator('email_force')
    def validate_email_format(cls, v):
        if v is None or v.strip() == "":
            return None
        
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_pattern, v.strip()):
            raise ValueError("Format d'email invalide")
        
        return v.strip()


class ContactResponse(BaseModel):
    """Données du contact."""
    id: str
    nom: Optional[str]
    prenom: Optional[str]
    email: Optional[str]
    email_force: Optional[str]
    type_personne: Optional[str]
    statut: Optional[str]
    is_blacklisted: int
    updated_at: str
    
    class Config:
        from_attributes = True


class SuccessResponse(BaseModel):
    """Réponse succès."""
    success: bool
    data: ContactResponse
    message: str


@router.put("/api/contacts/{contact_id}/email-force", response_model=SuccessResponse)
async def update_contact_email_force(
    contact_id: str = Path(..., description="UUID du contact"),
    request: EmailForceUpdateRequest = None,
    db: sqlite3.Connection = Depends(get_db)
):
    """
    Met à jour l'email forcé d'un contact.
    """
    # 1. Vérifier que le contact existe
    cursor = db.cursor()
    cursor.execute("""
        SELECT id FROM contacts WHERE id = ?
    """, (contact_id,))
    
    if not cursor.fetchone():
        raise HTTPException(
            status_code=404,
            detail={
                "success": False,
                "error": {
                    "code": "CONTACT_NOT_FOUND",
                    "message": "Contact non trouvé"
                }
            }
        )
    
    # 2. Préparer la mise à jour
    current_timestamp = datetime.utcnow().isoformat() + "Z"
    
    try:
        # Mettre à jour le contact
        cursor.execute("""
            UPDATE contacts
            SET email_force = ?,
                updated_at = ?
            WHERE id = ?
        """, (request.email_force, current_timestamp, contact_id))
        
        db.commit()
        
        # 3. Récupérer le contact mis à jour
        cursor.execute("""
            SELECT 
                id,
                nom,
                prenom,
                email,
                email_force,
                type_personne,
                statut,
                is_blacklisted,
                updated_at
            FROM contacts
            WHERE id = ?
        """, (contact_id,))
        
        row = cursor.fetchone()
        contact_data = dict(row)
        
        return {
            "success": True,
            "data": contact_data,
            "message": "Email forcé mis à jour avec succès"
        }
        
    except sqlite3.Error as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail={
                "success": False,
                "error": {
                    "code": "INTERNAL_ERROR",
                    "message": f"Erreur lors de la mise à jour: {str(e)}"
                }
            }
        )
```

---

## Notes d'implémentation

1. **Timestamp** : Le champ `updated_at` est mis à jour avec la timestamp ISO 8601 actuelle (format UTC).

2. **Email vide/null** : Si `email_force` est `null` ou chaîne vide, la valeur en DB devient `NULL` (réinitialisation).

3. **Validation email** : Utilisation d'une regex simple pour valider le format. Pas de vérification de domaine MX.

4. **Unicité** : Aucune contrainte d'unicité sur `email_force` - plusieurs contacts peuvent avoir le même email forcé.

5. **Blacklist** : La mise à jour est autorisée même si `is_blacklisted = 1`. L'admin peut vouloir définir un email forcé même pour un contact blacklisté.

6. **Transaction** : La mise à jour est atomique (une seule requête UPDATE).

7. **Héritage email** : La logique d'héritage d'email d'un autre contact est gérée côté frontend - ce endpoint reçoit simplement la valeur finale à stocker.
