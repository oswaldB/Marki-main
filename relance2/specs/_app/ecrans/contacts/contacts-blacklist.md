# Workflow Backend: contacts-blacklist

## Objectifs

Ce workflow permet de blacklister un contact dans le système Marki en mettant à jour ses champs de blacklistage dans la base de données SQLite. Une fois blacklisté :
- Le contact est exclu des relances automatiques
- Le statut du contact passe à `'blacklist'`
- Les champs `is_blacklisted`, `blacklist_date` et `blacklist_motif` sont mis à jour
- La date de mise à jour est enregistrée

## Route API

```python
@app.put("/api/contacts/{id}/blacklist")
async def blacklist_contact(
    id: str,
    request: BlacklistRequest,
    db: sqlite3.Connection = Depends(get_db),
    current_user: User = Depends(get_current_user)
)
```

**Méthode HTTP:** PUT  
**Endpoint:** `/api/contacts/{id}/blacklist`  
**Database:** `app/data/marki.db`  
**Table principale:** `contacts`

## Requêtes SQL

### 1. Vérifier l'existence du contact

```sql
SELECT 
    id,
    nom,
    prenom,
    email,
    statut,
    is_blacklisted,
    blacklist_date,
    blacklist_motif,
    updated_at
FROM contacts
WHERE id = ?;
```

**Paramètre:** `id` (TEXT) - UUID du contact

### 2. Vérifier si le contact est déjà blacklisté

```sql
SELECT is_blacklisted 
FROM contacts 
WHERE id = ? AND is_blacklisted = 1;
```

**Paramètre:** `id` (TEXT)

### 3. Mettre à jour le contact (blacklist)

```sql
UPDATE contacts
SET 
    statut = 'blacklist',
    is_blacklisted = 1,
    blacklist_date = CURRENT_TIMESTAMP,
    blacklist_motif = ?,
    updated_at = CURRENT_TIMESTAMP
WHERE id = ?
RETURNING 
    id,
    nom,
    prenom,
    email,
    statut,
    is_blacklisted,
    blacklist_date,
    blacklist_motif,
    updated_at;
```

**Paramètres:**
- `blacklist_motif` (TEXT, nullable) - Motif du blacklistage
- `id` (TEXT) - UUID du contact

### 4. Créer un événement (audit trail)

```sql
INSERT INTO events (
    id,
    type,
    titre,
    description,
    entity_type,
    entity_id,
    read,
    created_at
) VALUES (
    ?,
    'contact_blacklist',
    'Contact blacklisté',
    ?,
    'contact',
    ?,
    0,
    CURRENT_TIMESTAMP
);
```

**Paramètres:**
- `id` (TEXT) - UUID de l'événement
- `description` (TEXT) - Description avec le motif (ex: "Contact {nom} blacklisté. Motif: {motif}")
- `entity_id` (TEXT) - UUID du contact blacklisted

## Modèles Pydantic

### Requête (Request)

```python
from pydantic import BaseModel, Field
from typing import Optional

class BlacklistRequest(BaseModel):
    """Modèle de requête pour blacklister un contact"""
    statut: str = Field(
        default="blacklist",
        pattern="^blacklist$",
        description="Statut du contact après blacklistage"
    )
    is_blacklisted: int = Field(
        default=1,
        ge=0,
        le=1,
        description="Flag de blacklistage (1 = blacklisté)"
    )
    blacklist_motif: Optional[str] = Field(
        default=None,
        max_length=500,
        description="Motif optionnel du blacklistage"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "statut": "blacklist",
                "is_blacklisted": 1,
                "blacklist_motif": "Client injoignable après 3 tentatives"
            }
        }
```

### Réponse (Response)

```python
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ContactBlacklistData(BaseModel):
    """Données du contact après blacklistage"""
    id: str
    nom: Optional[str]
    prenom: Optional[str]
    email: Optional[str]
    statut: str
    is_blacklisted: int
    blacklist_date: Optional[str]
    blacklist_motif: Optional[str]
    updated_at: str

class BlacklistResponse(BaseModel):
    """Modèle de réponse pour le blacklistage d'un contact"""
    success: bool
    data: ContactBlacklistData
    message: str
    
    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "data": {
                    "id": "550e8400-e29b-41d4-a716-446655440000",
                    "nom": "Global Industries SA",
                    "prenom": None,
                    "email": "contact@acme.fr",
                    "statut": "blacklist",
                    "is_blacklisted": 1,
                    "blacklist_date": "2025-01-15T14:30:00Z",
                    "blacklist_motif": "Client injoignable",
                    "updated_at": "2025-01-15T14:30:00Z"
                },
                "message": "Contact blacklisté avec succès"
            }
        }
```

### Erreurs (Error Response)

```python
from pydantic import BaseModel

class ErrorResponse(BaseModel):
    """Modèle de réponse en cas d'erreur"""
    success: bool = False
    error: str
    message: str
    
    class Config:
        json_schema_extra = {
            "example": {
                "success": False,
                "error": "CONTACT_ALREADY_BLACKLISTED",
                "message": "Ce contact est déjà blacklisté"
            }
        }
```

## Gestion des Erreurs

| Code HTTP | Condition | Message | Détail |
|-----------|-----------|---------|--------|
| **400** | Payload invalide | `{"error": "INVALID_PAYLOAD", "message": "Champs requis manquants ou invalides"}` | Validation Pydantic échouée |
| **403** | Permissions insuffisantes | `{"error": "FORBIDDEN", "message": "Seul un administrateur ou le propriétaire peut blacklister un contact"}` | Vérification des rôles requise |
| **404** | Contact inexistant | `{"error": "CONTACT_NOT_FOUND", "message": "Contact non trouvé"}` | UUID invalide ou contact supprimé |
| **409** | Déjà blacklisté | `{"error": "CONTACT_ALREADY_BLACKLISTED", "message": "Ce contact est déjà blacklisté"}` | `is_blacklisted = 1` déjà présent |
| **500** | Erreur interne | `{"error": "INTERNAL_ERROR", "message": "Erreur lors du blacklistage du contact"}` | Erreur SQLite ou exception |

## Exemples

### Requête (Request)

```http
PUT /api/contacts/550e8400-e29b-41d4-a716-446655440000/blacklist HTTP/1.1
Content-Type: application/json
Authorization: Bearer <token>

{
  "statut": "blacklist",
  "is_blacklisted": 1,
  "blacklist_motif": "Client injoignable après 3 tentatives de relance"
}
```

### Réponse Succès (200 OK)

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "nom": "Global Industries SA",
    "prenom": null,
    "email": "contact@global-industries.fr",
    "statut": "blacklist",
    "is_blacklisted": 1,
    "blacklist_date": "2025-01-15T14:30:00Z",
    "blacklist_motif": "Client injoignable après 3 tentantes de relance",
    "updated_at": "2025-01-15T14:30:00Z"
  },
  "message": "Contact blacklisté avec succès"
}
```

### Réponse Erreur 404 (Contact non trouvé)

```json
{
  "success": false,
  "error": "CONTACT_NOT_FOUND",
  "message": "Contact non trouvé"
}
```

### Réponse Erreur 409 (Déjà blacklisté)

```json
{
  "success": false,
  "error": "CONTACT_ALREADY_BLACKLISTED",
  "message": "Ce contact est déjà blacklisté"
}
```

### Réponse Erreur 403 (Permissions insuffisantes)

```json
{
  "success": false,
  "error": "FORBIDDEN",
  "message": "Seul un administrateur ou le propriétaire peut blacklister un contact"
}
```

## Implémentation FastAPI (Référence)

```python
import sqlite3
import uuid
from fastapi import HTTPException, Depends
from datetime import datetime

@app.put("/api/contacts/{id}/blacklist", response_model=BlacklistResponse)
async def blacklist_contact(
    id: str,
    request: BlacklistRequest,
    db: sqlite3.Connection = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Vérifier les permissions
    if current_user.role not in ['admin', 'owner']:
        raise HTTPException(
            status_code=403,
            detail="Seul un administrateur ou le propriétaire peut blacklister un contact"
        )
    
    cursor = db.cursor()
    
    # 1. Vérifier si le contact existe
    cursor.execute("""
        SELECT id, is_blacklisted, nom 
        FROM contacts 
        WHERE id = ?
    """, (id,))
    
    contact = cursor.fetchone()
    if not contact:
        raise HTTPException(
            status_code=404,
            detail="Contact non trouvé"
        )
    
    # 2. Vérifier si déjà blacklisté
    if contact[1] == 1:
        raise HTTPException(
            status_code=409,
            detail="Ce contact est déjà blacklisté"
        )
    
    # 3. Mettre à jour le contact
    cursor.execute("""
        UPDATE contacts
        SET 
            statut = 'blacklist',
            is_blacklisted = 1,
            blacklist_date = CURRENT_TIMESTAMP,
            blacklist_motif = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        RETURNING 
            id, nom, prenom, email, statut, 
            is_blacklisted, blacklist_date, blacklist_motif, updated_at
    """, (request.blacklist_motif, id))
    
    updated = cursor.fetchone()
    db.commit()
    
    # 4. Créer un événement d'audit
    event_id = str(uuid.uuid4())
    description = f"Contact {contact[2]} blacklisté"
    if request.blacklist_motif:
        description += f". Motif: {request.blacklist_motif}"
    
    cursor.execute("""
        INSERT INTO events (id, type, titre, description, entity_type, entity_id, read, created_at)
        VALUES (?, 'contact_blacklist', 'Contact blacklisté', ?, 'contact', ?, 0, CURRENT_TIMESTAMP)
    """, (event_id, description, id))
    
    db.commit()
    
    return BlacklistResponse(
        success=True,
        data=ContactBlacklistData(
            id=updated[0],
            nom=updated[1],
            prenom=updated[2],
            email=updated[3],
            statut=updated[4],
            is_blacklisted=updated[5],
            blacklist_date=updated[6],
            blacklist_motif=updated[7],
            updated_at=updated[8]
        ),
        message="Contact blacklisté avec succès"
    )
```

## Notes Techniques

- **Timezone:** Les dates sont stockées en format ISO 8601 (UTC) via `CURRENT_TIMESTAMP`
- **Transaction:** L'opération UPDATE doit être commitée explicitement
- **Audit:** Un événement est créé dans la table `events` pour tracer l'action
- **Contrainte:** La table `contacts` n'a pas de clé étrangère vers `impayes`, mais `impayes` référence `contacts(id)`
- **Index:** Assurez-vous qu'un index existe sur `contacts(id)` pour des performances optimales (clé primaire = index automatique)
