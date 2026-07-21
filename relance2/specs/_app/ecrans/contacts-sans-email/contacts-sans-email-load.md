# Workflow Backend: contacts-sans-email-load

## Objectifs

Récupérer la liste des contacts n'ayant pas d'adresse email définie (champ `email` NULL ou vide) et n'ayant pas déjà d'`email_force` renseigné. Ce workflow supporte :
- La **pagination** pour l'affichage paginé
- La **recherche textuelle** sur nom, prénom et code client
- Le **tri** par nom ou date de création

Ces contacts sont identifiés comme nécessitant une intervention manuelle pour définir un email de relance via le champ `email_force`.

---

## Route API FastAPI

```python
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional, List
import sqlite3
from datetime import datetime

router = APIRouter(prefix="/api/contacts", tags=["contacts"])

@router.get("")
async def get_contacts(
    sans_email: int = Query(0, ge=0, le=1, description="Filtrer contacts sans email (1=actif)"),
    search: Optional[str] = Query(None, min_length=1, max_length=100, description="Recherche nom/prénom/code"),
    page: int = Query(1, ge=1, description="Numéro de page"),
    per_page: int = Query(12, ge=1, le=100, description="Items par page"),
    sort_by: str = Query("nom", regex="^(nom|created_at)$", description="Champ de tri"),
    sort_order: str = Query("asc", regex="^(asc|desc)$", description="Ordre de tri")
):
    """
    Récupère la liste des contacts avec filtre optionnel sur les contacts sans email.
    """
    pass
```

---

## Requêtes SQL

### 1. Requête principale avec filtre "sans email"

```sql
-- Requête de comptage pour la pagination
SELECT COUNT(*) as total
FROM contacts
WHERE 
    (email IS NULL OR email = '') 
    AND (email_force IS NULL OR email_force = '')
    AND is_blacklisted = 0
    AND (:search IS NULL OR 
         LOWER(nom) LIKE '%' || LOWER(:search) || '%' OR 
         LOWER(prenom) LIKE '%' || LOWER(:search) || '%' OR 
         LOWER(code) LIKE '%' || LOWER(:search) || '%');

-- Requête de récupération des données paginées
SELECT 
    id,
    nom,
    prenom,
    email,
    email_force,
    code,
    type,
    type_personne,
    telephone,
    civilite,
    statut,
    is_blacklisted,
    adresse_rue,
    adresse_ville,
    adresse_code_postal,
    adresse_pays,
    created_at,
    updated_at
FROM contacts
WHERE 
    (email IS NULL OR email = '') 
    AND (email_force IS NULL OR email_force = '')
    AND is_blacklisted = 0
    AND (:search IS NULL OR 
         LOWER(nom) LIKE '%' || LOWER(:search) || '%' OR 
         LOWER(prenom) LIKE '%' || LOWER(:search) || '%' OR 
         LOWER(code) LIKE '%' || LOWER(:search) || '%')
ORDER BY 
    CASE WHEN :sort_by = 'nom' AND :sort_order = 'asc' THEN LOWER(COALESCE(nom, '')) END ASC,
    CASE WHEN :sort_by = 'nom' AND :sort_order = 'desc' THEN LOWER(COALESCE(nom, '')) END DESC,
    CASE WHEN :sort_by = 'created_at' AND :sort_order = 'asc' THEN created_at END ASC,
    CASE WHEN :sort_by = 'created_at' AND :sort_order = 'desc' THEN created_at END DESC
LIMIT :limit OFFSET :offset;
```

### 2. Requête alternative (liste complète sans pagination)

```sql
-- Pour export ou traitement batch
SELECT 
    id,
    nom,
    prenom,
    code,
    telephone,
    created_at
FROM contacts
WHERE 
    (email IS NULL OR email = '') 
    AND (email_force IS NULL OR email_force = '')
    AND is_blacklisted = 0
ORDER BY LOWER(COALESCE(nom, '')), LOWER(COALESCE(prenom, ''));
```

### 3. Configuration connexion SQLite

```python
DB_PATH = "app/data/marki.db"

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row  # Permet l'accès par nom de colonne
    return conn
```

---

## Modèles Pydantic

### Modèles de Requête (Query Parameters)

```python
from pydantic import BaseModel, Field, validator
from typing import Optional

class ContactsQueryParams(BaseModel):
    """Paramètres de requête pour la liste des contacts"""
    sans_email: int = Field(
        default=0, 
        ge=0, 
        le=1,
        description="Active le filtre contacts sans email (0 ou 1)"
    )
    search: Optional[str] = Field(
        default=None,
        min_length=1,
        max_length=100,
        description="Recherche textuelle sur nom, prénom ou code"
    )
    page: int = Field(
        default=1, 
        ge=1,
        description="Numéro de page (commence à 1)"
    )
    per_page: int = Field(
        default=12, 
        ge=1, 
        le=100,
        description="Nombre d'items par page (max 100)"
    )
    sort_by: str = Field(
        default="nom",
        pattern="^(nom|created_at)$",
        description="Champ de tri: 'nom' ou 'created_at'"
    )
    sort_order: str = Field(
        default="asc",
        pattern="^(asc|desc)$",
        description="Ordre de tri: 'asc' ou 'desc'"
    )
```

### Modèles de Réponse

```python
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class ContactResponse(BaseModel):
    """Modèle de réponse pour un contact"""
    id: str = Field(..., description="UUID du contact")
    nom: Optional[str] = Field(None, description="Nom de famille")
    prenom: Optional[str] = Field(None, description="Prénom")
    code: Optional[str] = Field(None, description="Code client")
    type: Optional[str] = Field(None, description="Type de contact")
    type_personne: Optional[str] = Field(None, description="Physique ou moral")
    telephone: Optional[str] = Field(None, description="Numéro de téléphone")
    email: Optional[str] = Field(None, description="Email principal (NULL ou vide ici)")
    email_force: Optional[str] = Field(None, description="Email forcé (NULL ou vide ici)")
    civilite: Optional[str] = Field(None, description="Civilité (M., Mme, etc.)")
    statut: Optional[str] = Field(None, description="Statut du contact")
    is_blacklisted: int = Field(0, description="1 si blacklisté, 0 sinon")
    adresse_rue: Optional[str] = Field(None, description="Rue")
    adresse_ville: Optional[str] = Field(None, description="Ville")
    adresse_code_postal: Optional[str] = Field(None, description="Code postal")
    adresse_pays: Optional[str] = Field(None, description="Pays")
    created_at: Optional[str] = Field(None, description="Date de création ISO 8601")
    updated_at: Optional[str] = Field(None, description="Date de mise à jour ISO 8601")

    class Config:
        from_attributes = True

class PaginationResponse(BaseModel):
    """Informations de pagination"""
    current_page: int = Field(..., ge=1, description="Page courante")
    per_page: int = Field(..., ge=1, description="Items par page")
    total_items: int = Field(..., ge=0, description="Total d'items")
    total_pages: int = Field(..., ge=0, description="Nombre total de pages")

class ContactsListResponse(BaseModel):
    """Réponse complète de la liste des contacts"""
    success: bool = Field(True, description="Statut de la requête")
    data: dict = Field(..., description="Données de la réponse")

class ContactsListData(BaseModel):
    """Structure des données de réponse"""
    contacts: List[ContactResponse] = Field(..., description="Liste des contacts")
    pagination: PaginationResponse = Field(..., description="Infos de pagination")
```

### Modèle d'Erreur

```python
class ErrorResponse(BaseModel):
    """Modèle de réponse en cas d'erreur"""
    success: bool = Field(False, description="Toujours False en cas d'erreur")
    error: dict = Field(..., description="Détails de l'erreur")

class ErrorDetail(BaseModel):
    """Détails de l'erreur"""
    code: str = Field(..., description="Code d'erreur")
    message: str = Field(..., description="Message descriptif")
    details: Optional[dict] = Field(None, description="Détails additionnels")
```

---

## Gestion des Erreurs

| Code HTTP | Code Erreur | Description | Message |
|-----------|-------------|-------------|---------|
| 400 | `INVALID_PARAMS` | Paramètres de requête invalides | "Paramètres de requête invalides: {details}" |
| 404 | `TABLE_NOT_FOUND` | Table contacts inaccessible | "Table contacts non trouvée ou inaccessible" |
| 500 | `DATABASE_ERROR` | Erreur SQLite générale | "Erreur base de données: {message}" |
| 500 | `CONNECTION_ERROR` | Impossible de se connecter à SQLite | "Impossible de se connecter à la base de données" |

### Implémentation de la gestion d'erreurs

```python
from fastapi import HTTPException
import sqlite3

def handle_database_error(e: Exception) -> HTTPException:
    """Convertit les erreurs SQLite en réponses HTTP appropriées"""
    if isinstance(e, sqlite3.OperationalError):
        if "no such table" in str(e).lower():
            return HTTPException(
                status_code=404,
                detail={
                    "success": False,
                    "error": {
                        "code": "TABLE_NOT_FOUND",
                        "message": "Table contacts non trouvée ou inaccessible",
                        "details": {"table": "contacts"}
                    }
                }
            )
        return HTTPException(
            status_code=500,
            detail={
                "success": False,
                "error": {
                    "code": "DATABASE_ERROR",
                    "message": f"Erreur base de données: {str(e)}"
                }
            }
        )
    
    if isinstance(e, sqlite3.DatabaseError):
        return HTTPException(
            status_code=500,
            detail={
                "success": False,
                "error": {
                    "code": "DATABASE_ERROR",
                    "message": f"Erreur base de données: {str(e)}"
                }
            }
        )
    
    return HTTPException(
        status_code=500,
        detail={
            "success": False,
            "error": {
                "code": "INTERNAL_ERROR",
                "message": f"Erreur interne: {str(e)}"
            }
        }
    )
```

---

## Exemples

### Exemple 1: Requête simple (sans_email=1)

**Requête HTTP:**
```http
GET /api/contacts?sans_email=1&page=1&per_page=12 HTTP/1.1
Host: localhost:8000
Accept: application/json
```

**Réponse 200 OK:**
```json
{
  "success": true,
  "data": {
    "contacts": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440001",
        "nom": "DUPONT",
        "prenom": "Jean",
        "code": "CLI-001",
        "type": "client",
        "type_personne": "physique",
        "telephone": "0123456789",
        "email": null,
        "email_force": null,
        "civilite": "M.",
        "statut": "actif",
        "is_blacklisted": 0,
        "adresse_rue": "123 rue Example",
        "adresse_ville": "Paris",
        "adresse_code_postal": "75001",
        "adresse_pays": "France",
        "created_at": "2024-01-15T10:30:00Z",
        "updated_at": "2024-01-15T10:30:00Z"
      },
      {
        "id": "550e8400-e29b-41d4-a716-446655440002",
        "nom": "MARTIN",
        "prenom": "Sophie",
        "code": "CLI-002",
        "type": "prospect",
        "type_personne": "physique",
        "telephone": "0987654321",
        "email": "",
        "email_force": null,
        "civilite": "Mme",
        "statut": "actif",
        "is_blacklisted": 0,
        "adresse_rue": null,
        "adresse_ville": null,
        "adresse_code_postal": null,
        "adresse_pays": null,
        "created_at": "2024-01-20T14:15:00Z",
        "updated_at": "2024-01-20T14:15:00Z"
      }
    ],
    "pagination": {
      "current_page": 1,
      "per_page": 12,
      "total_items": 45,
      "total_pages": 4
    }
  }
}
```

---

### Exemple 2: Requête avec recherche

**Requête HTTP:**
```http
GET /api/contacts?sans_email=1&search=DUPONT&page=1&per_page=10 HTTP/1.1
Host: localhost:8000
Accept: application/json
```

**Réponse 200 OK:**
```json
{
  "success": true,
  "data": {
    "contacts": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440001",
        "nom": "DUPONT",
        "prenom": "Jean",
        "code": "CLI-001",
        "type": "client",
        "type_personne": "physique",
        "telephone": "0123456789",
        "email": null,
        "email_force": null,
        "civilite": "M.",
        "statut": "actif",
        "is_blacklisted": 0,
        "created_at": "2024-01-15T10:30:00Z",
        "updated_at": "2024-01-15T10:30:00Z"
      }
    ],
    "pagination": {
      "current_page": 1,
      "per_page": 10,
      "total_items": 1,
      "total_pages": 1
    }
  }
}
```

---

### Exemple 3: Erreur 404 (table inexistante)

**Requête HTTP:**
```http
GET /api/contacts?sans_email=1 HTTP/1.1
```

**Réponse 404 Not Found:**
```json
{
  "success": false,
  "error": {
    "code": "TABLE_NOT_FOUND",
    "message": "Table contacts non trouvée ou inaccessible",
    "details": {
      "table": "contacts"
    }
  }
}
```

---

### Exemple 4: Erreur 400 (paramètres invalides)

**Requête HTTP:**
```http
GET /api/contacts?sans_email=2&page=0 HTTP/1.1
```

**Réponse 400 Bad Request:**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_PARAMS",
    "message": "Paramètres de requête invalides",
    "details": {
      "fields": [
        {"field": "sans_email", "error": "must be 0 or 1"},
        {"field": "page", "error": "must be >= 1"}
      ]
    }
  }
}
```

---

## Implémentation complète (référence)

```python
import sqlite3
from fastapi import APIRouter, HTTPException, Query
from typing import Optional
import math

router = APIRouter()
DB_PATH = "app/data/marki.db"

@router.get("/api/contacts")
async def get_contacts_sans_email(
    sans_email: int = Query(0, ge=0, le=1),
    search: Optional[str] = Query(None, max_length=100),
    page: int = Query(1, ge=1),
    per_page: int = Query(12, ge=1, le=100),
    sort_by: str = Query("nom", pattern="^(nom|created_at)$"),
    sort_order: str = Query("asc", pattern="^(asc|desc)$")
):
    """Récupère les contacts sans email pour le workflow contacts-sans-email"""
    
    if sans_email != 1:
        # Comportement normal de liste contacts (hors scope)
        return {"success": True, "data": {"contacts": [], "pagination": {}}}
    
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Paramètres de recherche
        search_param = f"%{search.lower()}%" if search else None
        offset = (page - 1) * per_page
        
        # Requête de comptage
        count_sql = """
            SELECT COUNT(*) as total
            FROM contacts
            WHERE (email IS NULL OR email = '') 
              AND (email_force IS NULL OR email_force = '')
              AND is_blacklisted = 0
              AND (? IS NULL OR 
                   LOWER(nom) LIKE ? OR 
                   LOWER(prenom) LIKE ? OR 
                   LOWER(COALESCE(code, '')) LIKE ?)
        """
        cursor.execute(count_sql, (search_param, search_param, search_param, search_param))
        total_items = cursor.fetchone()["total"]
        
        # Requête principale
        data_sql = """
            SELECT 
                id, nom, prenom, email, email_force, code, type, type_personne,
                telephone, civilite, statut, is_blacklisted,
                adresse_rue, adresse_ville, adresse_code_postal, adresse_pays,
                created_at, updated_at
            FROM contacts
            WHERE (email IS NULL OR email = '') 
              AND (email_force IS NULL OR email_force = '')
              AND is_blacklisted = 0
              AND (? IS NULL OR 
                   LOWER(nom) LIKE ? OR 
                   LOWER(prenom) LIKE ? OR 
                   LOWER(COALESCE(code, '')) LIKE ?)
            ORDER BY 
                CASE WHEN ? = 'nom' AND ? = 'asc' THEN LOWER(COALESCE(nom, '')) END ASC,
                CASE WHEN ? = 'nom' AND ? = 'desc' THEN LOWER(COALESCE(nom, '')) END DESC,
                CASE WHEN ? = 'created_at' AND ? = 'asc' THEN created_at END ASC,
                CASE WHEN ? = 'created_at' AND ? = 'desc' THEN created_at END DESC
            LIMIT ? OFFSET ?
        """
        
        params = (
            search_param, search_param, search_param, search_param,
            sort_by, sort_order, sort_by, sort_order, sort_by, sort_order, sort_by, sort_order,
            per_page, offset
        )
        cursor.execute(data_sql, params)
        rows = cursor.fetchall()
        
        contacts = [dict(row) for row in rows]
        total_pages = math.ceil(total_items / per_page) if total_items > 0 else 1
        
        conn.close()
        
        return {
            "success": True,
            "data": {
                "contacts": contacts,
                "pagination": {
                    "current_page": page,
                    "per_page": per_page,
                    "total_items": total_items,
                    "total_pages": total_pages
                }
            }
        }
        
    except sqlite3.OperationalError as e:
        if "no such table" in str(e).lower():
            raise HTTPException(status_code=404, detail={
                "success": False,
                "error": {
                    "code": "TABLE_NOT_FOUND",
                    "message": "Table contacts non trouvée ou inaccessible",
                    "details": {"table": "contacts"}
                }
            })
        raise HTTPException(status_code=500, detail={
            "success": False,
            "error": {"code": "DATABASE_ERROR", "message": str(e)}
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail={
            "success": False,
            "error": {"code": "INTERNAL_ERROR", "message": str(e)}
        })
```

---

## Notes d'implémentation

1. **Champ `email` vs `email_force`**: La condition filtre les contacts où `email` est NULL ou vide, ET où `email_force` est également NULL ou vide. Cela évite de montrer des contacts qui ont déjà reçu un email forcé.

2. **Exclusion des blacklistés**: Les contacts avec `is_blacklisted = 1` sont systématiquement exclus.

3. **Recherche case-insensitive**: Utilisation de `LOWER()` pour une recherche insensible à la casse.

4. **Tri dynamique**: Le tri par nom utilise `COALESCE` pour gérer les valeurs NULL et `LOWER` pour un tri alphabétique cohérent.

5. **Performance**: Les colonnes `nom`, `prenom`, `code` devraient avoir des index pour de meilleures performances de recherche.
