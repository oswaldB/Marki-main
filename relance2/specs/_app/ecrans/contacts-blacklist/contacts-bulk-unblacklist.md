# Workflow Backend: contacts-bulk-unblacklist

## 1. Objectifs

Ce workflow permet de retirer en masse des contacts de la blacklist. Pour chaque contact sélectionné :
- Met à jour `is_blacklisted` à `0`
- Réinitialise `blacklist_date` à `NULL`
- Réinitialise `blacklist_motif` à `NULL`

Le workflow retourne le nombre de contacts mis à jour avec succès et liste les erreurs éventuelles (IDs inexistants).

---

## 2. Route API

| Propriété | Valeur |
|-----------|--------|
| **Méthode HTTP** | `POST` |
| **Endpoint** | `/api/contacts/bulk-unblacklist` |
| **Content-Type** | `application/json` |
| **Authentification requise** | Oui (Bearer Token) |

---

## 3. Requêtes SQL

### 3.1 Vérification d'existence des contacts

```sql
SELECT id, is_blacklisted FROM contacts WHERE id IN (?, ?, ?)
```

**Paramètres**: Liste des `contact_ids` fournis en entrée.

**Résultat attendu**: Retourne les IDs existants et leur statut actuel de blacklist.

### 3.2 Mise à jour des contacts

```sql
UPDATE contacts 
SET 
    is_blacklisted = 0,
    blacklist_date = NULL,
    blacklist_motif = NULL,
    updated_at = CURRENT_TIMESTAMP
WHERE id IN (?, ?, ?)
```

**Paramètres**: Liste des IDs de contacts confirmés existants.

**Résultat attendu**: Nombre de lignes affectées (nombre de contacts mis à jour).

---

## 4. Modèles Pydantic

### 4.1 Modèle de Requête

```python
from pydantic import BaseModel, Field
from typing import List


class ContactsBulkUnblacklistRequest(BaseModel):
    """Modèle de requête pour le retrait en masse de la blacklist."""
    
    contact_ids: List[str] = Field(
        ...,
        min_length=1,
        description="Liste des IDs des contacts à retirer de la blacklist"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "contact_ids": [
                    "550e8400-e29b-41d4-a716-446655440000",
                    "550e8400-e29b-41d4-a716-446655440001",
                    "550e8400-e29b-41d4-a716-446655440002"
                ]
            }
        }
```

### 4.2 Modèle de Réponse

```python
from pydantic import BaseModel, Field
from typing import List


class ContactsBulkUnblacklistResponse(BaseModel):
    """Modèle de réponse pour le retrait en masse de la blacklist."""
    
    success: bool = Field(
        ...,
        description="Indique si l'opération a réussi (au moins une mise à jour)"
    )
    updated: int = Field(
        ...,
        ge=0,
        description="Nombre de contacts mis à jour avec succès"
    )
    errors: List[str] = Field(
        default_factory=list,
        description="Liste des IDs inexistants ou messages d'erreur"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "updated": 3,
                "errors": []
            }
        }
```

---

## 5. Gestion des Erreurs

| Code HTTP | Cas | Message |
|-----------|-----|---------|
| `200 OK` | Opération réussie (même partielle) | `{ "success": true, "updated": N, "errors": [...] }` |
| `400 Bad Request` | Liste `contact_ids` vide ou invalide | `{"detail": "La liste contact_ids ne peut pas être vide"}` |
| `401 Unauthorized` | Token manquant ou invalide | `{"detail": "Not authenticated"}` |
| `404 Not Found` | Aucun ID valide trouvé (tous inexistants) | `{ "success": false, "updated": 0, "errors": [...] }` |
| `500 Internal Server Error` | Erreur base de données ou serveur | `{"detail": "Erreur interne du serveur"}` |

### Logique de détermination de `success`:

- `success: true` : Au moins un contact a été mis à jour (`updated > 0`)
- `success: false` : Aucun contact mis à jour (`updated == 0`), que ce soit parce que tous les IDs sont invalides ou pour toute autre raison

---

## 6. Exemples

### 6.1 Requête Réussie (tous les contacts existent)

**Requête:**
```http
POST /api/contacts/bulk-unblacklist HTTP/1.1
Content-Type: application/json
Authorization: Bearer <token>

{
    "contact_ids": [
        "550e8400-e29b-41d4-a716-446655440000",
        "550e8400-e29b-41d4-a716-446655440001",
        "550e8400-e29b-41d4-a716-446655440002"
    ]
}
```

**Réponse:**
```json
{
    "success": true,
    "updated": 3,
    "errors": []
}
```

### 6.2 Requête Partielle (certains IDs inexistants)

**Requête:**
```http
POST /api/contacts/bulk-unblacklist HTTP/1.1
Content-Type: application/json
Authorization: Bearer <token>

{
    "contact_ids": [
        "550e8400-e29b-41d4-a716-446655440000",
        "invalid-id-123",
        "550e8400-e29b-41d4-a716-446655440002",
        "non-existent-id"
    ]
}
```

**Réponse:**
```json
{
    "success": true,
    "updated": 2,
    "errors": [
        "Contact non trouvé: invalid-id-123",
        "Contact non trouvé: non-existent-id"
    ]
}
```

### 6.3 Requête Échouée (tous les IDs inexistants)

**Requête:**
```http
POST /api/contacts/bulk-unblacklist HTTP/1.1
Content-Type: application/json
Authorization: Bearer <token>

{
    "contact_ids": [
        "invalid-1",
        "invalid-2"
    ]
}
```

**Réponse:**
```json
{
    "success": false,
    "updated": 0,
    "errors": [
        "Contact non trouvé: invalid-1",
        "Contact non trouvé: invalid-2"
    ]
}
```

### 6.4 Requête Vide

**Requête:**
```http
POST /api/contacts/bulk-unblacklist HTTP/1.1
Content-Type: application/json
Authorization: Bearer <token>

{
    "contact_ids": []
}
```

**Réponse:**
```json
{
    "success": true,
    "updated": 0,
    "errors": []
}
```

---

## 7. Implémentation FastAPI (Référence)

```python
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import List
import sqlite3
from contextlib import contextmanager

router = APIRouter()
DATABASE_PATH = "app/data/marki.db"


@contextmanager
def get_db_connection():
    """Context manager pour la connexion SQLite."""
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


class ContactsBulkUnblacklistRequest(BaseModel):
    contact_ids: List[str] = Field(..., min_length=1)


class ContactsBulkUnblacklistResponse(BaseModel):
    success: bool
    updated: int
    errors: List[str]


@router.post(
    "/api/contacts/bulk-unblacklist",
    response_model=ContactsBulkUnblacklistResponse,
    status_code=status.HTTP_200_OK
)
async def bulk_unblacklist_contacts(
    request: ContactsBulkUnblacklistRequest,
    # current_user: User = Depends(get_current_user)  # Décommenter pour auth
):
    """
    Retire en masse des contacts de la blacklist.
    """
    # Cas liste vide
    if not request.contact_ids:
        return ContactsBulkUnblacklistResponse(
            success=True,
            updated=0,
            errors=[]
        )
    
    # Dédoublonnement tout en préservant l'ordre
    unique_ids = list(dict.fromkeys(request.contact_ids))
    
    errors = []
    updated_count = 0
    
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        # 1. Vérifier quels contacts existent
        placeholders = ','.join('?' * len(unique_ids))
        cursor.execute(
            f"SELECT id, is_blacklisted FROM contacts WHERE id IN ({placeholders})",
            unique_ids
        )
        existing_contacts = {row['id']: row['is_blacklisted'] for row in cursor.fetchall()}
        
        # 2. Identifier les IDs inexistants
        existing_ids = set(existing_contacts.keys())
        for cid in unique_ids:
            if cid not in existing_ids:
                errors.append(f"Contact non trouvé: {cid}")
        
        # 3. Mettre à jour les contacts existants
        if existing_ids:
            placeholders = ','.join('?' * len(existing_ids))
            cursor.execute(f"""
                UPDATE contacts 
                SET 
                    is_blacklisted = 0,
                    blacklist_date = NULL,
                    blacklist_motif = NULL,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id IN ({placeholders})
            """, list(existing_ids))
            
            conn.commit()
            updated_count = cursor.rowcount
    
    return ContactsBulkUnblacklistResponse(
        success=updated_count > 0,
        updated=updated_count,
        errors=errors
    )
```

---

## 8. Notes d'Implémentation

1. **Performance**: Pour un grand nombre de contacts (>1000), envisager une exécution par batchs
2. **Transactions**: L'UPDATE est atomique - soit tous les contacts valides sont mis à jour, soit aucun en cas d'erreur
3. **Champs mis à jour**: `is_blacklisted`, `blacklist_date`, `blacklist_motif`, `updated_at`
4. **Idempotence**: Appeler plusieurs fois avec les mêmes IDs produit le même résultat (pas d'erreur si déjà non-blacklisté)
