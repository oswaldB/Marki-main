# Workflow Backend: get-contacts

## Objectifs

Récupérer la liste des contacts avec possibilité de filtrage avancé. Pour le workflow "contacts-sans-email", ce endpoint permet spécifiquement de :
- Filtrer les contacts **sans email** (champ `email` NULL ou vide ET champ `email_force` NULL ou vide)
- Effectuer une **recherche textuelle** sur le nom, prénom ou activité société
- Limiter le nombre de résultats pour la pagination
- Compter les **impayés associés** à chaque contact

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
    sans_email: Optional[str] = Query(None, description="Si '1', filtre les contacts sans email"),
    search: Optional[str] = Query(None, min_length=1, max_length=100, description="Recherche sur nom, prénom, activité société"),
    limit: int = Query(100, ge=1, le=1000, description="Nombre max de résultats (défaut: 100, max: 1000)")
):
    """
    Récupère la liste des contacts avec filtres optionnels.
    Pour contacts-sans-email: utiliser sans_email=1
    """
    pass
```

---

## Requêtes SQL

### 1. Configuration connexion SQLite

```python
DB_PATH = "app/data/marki.db"

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row  # Permet l'accès par nom de colonne
    return conn
```

### 2. Requête principale - Liste des contacts avec impayés

```sql
-- Requête complète avec comptage des impayés
SELECT 
    c.id,
    c.nom,
    c.prenom,
    c.type_personne,
    c.activite_societe,
    c.telephone,
    c.email,
    COALESCE(impayes_count.count, 0) as impayes_count
FROM contacts c
LEFT JOIN (
    SELECT 
        contact_id,
        COUNT(*) as count
    FROM (
        SELECT payer_id as contact_id
        FROM impayes
        WHERE statut = 'impaye'
        UNION ALL
        SELECT contact_relance_id as contact_id
        FROM impayes
        WHERE statut = 'impaye' AND contact_relance_id IS NOT NULL
    )
    GROUP BY contact_id
) impayes_count ON c.id = impayes_count.contact_id
WHERE 
    -- Filtre sans_email: ni email ni email_force ne sont renseignés
    (
        :sans_email IS NULL 
        OR (
            (:sans_email = '1') 
            AND (c.email IS NULL OR TRIM(c.email) = '')
            AND (c.email_force IS NULL OR TRIM(c.email_force) = '')
        )
    )
    -- Recherche textuelle sur nom, prenom, activite_societe
    AND (
        :search IS NULL 
        OR LOWER(c.nom) LIKE '%' || LOWER(:search) || '%'
        OR LOWER(c.prenom) LIKE '%' || LOWER(:search) || '%'
        OR LOWER(COALESCE(c.activite_societe, '')) LIKE '%' || LOWER(:search) || '%'
    )
ORDER BY LOWER(COALESCE(c.nom, '')), LOWER(COALESCE(c.prenom, ''))
LIMIT :limit;
```

### 3. Requête alternative simplifiée (sans sous-requête d'impayés)

```sql
-- Version avec jointure directe sur impayes
SELECT 
    c.id,
    c.nom,
    c.prenom,
    c.type_personne,
    c.activite_societe,
    c.telephone,
    c.email,
    COUNT(DISTINCT i.id) as impayes_count
FROM contacts c
LEFT JOIN impayes i ON (
    (c.id = i.payer_id OR c.id = i.contact_relance_id)
    AND i.statut = 'impaye'
)
WHERE 
    (
        :sans_email IS NULL 
        OR (
            (:sans_email = '1') 
            AND (c.email IS NULL OR TRIM(c.email) = '')
            AND (c.email_force IS NULL OR TRIM(c.email_force) = '')
        )
    )
    AND (
        :search IS NULL 
        OR LOWER(c.nom) LIKE '%' || LOWER(:search) || '%'
        OR LOWER(c.prenom) LIKE '%' || LOWER(:search) || '%'
        OR LOWER(COALESCE(c.activite_societe, '')) LIKE '%' || LOWER(:search) || '%'
    )
GROUP BY c.id
ORDER BY LOWER(COALESCE(c.nom, '')), LOWER(COALESCE(c.prenom, ''))
LIMIT :limit;
```

### 4. Requête de comptage total (pour info)

```sql
-- Compte le nombre total de contacts correspondant aux filtres
SELECT COUNT(*) as total
FROM contacts c
WHERE 
    (
        :sans_email IS NULL 
        OR (
            (:sans_email = '1') 
            AND (c.email IS NULL OR TRIM(c.email) = '')
            AND (c.email_force IS NULL OR TRIM(c.email_force) = '')
        )
    )
    AND (
        :search IS NULL 
        OR LOWER(c.nom) LIKE '%' || LOWER(:search) || '%'
        OR LOWER(c.prenom) LIKE '%' || LOWER(:search) || '%'
        OR LOWER(COALESCE(c.activite_societe, '')) LIKE '%' || LOWER(:search) || '%'
    );
```

---

## Modèles Pydantic

### Modèles de Requête (Query Parameters)

```python
from pydantic import BaseModel, Field, validator
from typing import Optional

class GetContactsQueryParams(BaseModel):
    """Paramètres de requête pour la récupération des contacts"""
    sans_email: Optional[str] = Field(
        default=None,
        description="Si '1', filtre les contacts sans email ni email_force"
    )
    search: Optional[str] = Field(
        default=None,
        min_length=1,
        max_length=100,
        description="Recherche textuelle sur nom, prénom ou activité société"
    )
    limit: int = Field(
        default=100,
        ge=1,
        le=1000,
        description="Nombre maximum de résultats (max: 1000)"
    )

    @validator('sans_email')
    def validate_sans_email(cls, v):
        if v is not None and v not in ('0', '1'):
            raise ValueError("sans_email doit être '0', '1', ou null")
        return v

    @validator('limit')
    def clamp_limit(cls, v):
        """Clamp limit to 1000 if exceeded"""
        return min(v, 1000)
```

### Modèles de Réponse

```python
from pydantic import BaseModel, Field
from typing import List, Optional

class ContactItemResponse(BaseModel):
    """Modèle d'un contact dans la liste de réponse"""
    id: str = Field(..., description="UUID du contact")
    nomComplet: str = Field(..., description="Nom complet (nom + prénom)")
    typePersonne: Optional[str] = Field(None, description="Type de personne (P/M)")
    entreprise: Optional[str] = Field(None, description="Activité société / entreprise")
    telephone: Optional[str] = Field(None, description="Numéro de téléphone")
    email: Optional[str] = Field(None, description="Email (null si sans email)")
    impayesCount: int = Field(0, description="Nombre d'impayés associés")

    class Config:
        from_attributes = True

class ContactsDataResponse(BaseModel):
    """Structure des données de réponse"""
    contacts: List[ContactItemResponse] = Field(
        default_factory=list,
        description="Liste des contacts"
    )

class ContactsListResponse(BaseModel):
    """Réponse complète de l'endpoint"""
    contacts: List[ContactItemResponse] = Field(
        default_factory=list,
        description="Liste des contacts"
    )
```

### Modèle d'Erreur

```python
class ErrorResponse(BaseModel):
    """Modèle de réponse en cas d'erreur"""
    error: str = Field(..., description="Message d'erreur technique")
```

---

## Gestion des Erreurs

| Code HTTP | Code Erreur | Description | Message |
|-----------|-------------|-------------|---------|
| 200 | `OK` | Succès | Réponse JSON avec liste des contacts |
| 400 | `INVALID_PARAMS` | Paramètres invalides | "Paramètres invalides: {details}" |
| 500 | `DATABASE_ERROR` | Erreur SQLite | "Erreur base de données: {message}" |
| 500 | `INTERNAL_ERROR` | Erreur interne | "Erreur interne: {message}" |

### Implémentation de la gestion d'erreurs

```python
from fastapi import HTTPException
import sqlite3
import logging

logger = logging.getLogger(__name__)

def handle_database_error(e: Exception) -> HTTPException:
    """Convertit les erreurs SQLite en réponses HTTP appropriées"""
    logger.error(f"Database error: {str(e)}")
    
    if isinstance(e, sqlite3.OperationalError):
        return HTTPException(
            status_code=500,
            detail={"error": f"Erreur base de données: {str(e)}"}
        )
    
    if isinstance(e, sqlite3.DatabaseError):
        return HTTPException(
            status_code=500,
            detail={"error": f"Erreur base de données: {str(e)}"}
        )
    
    return HTTPException(
        status_code=500,
        detail={"error": f"Erreur interne: {str(e)}"}
    )
```

---

## Exemples

### Exemple 1: Requête contacts sans email

**Requête HTTP:**
```http
GET /api/contacts?sans_email=1&limit=50 HTTP/1.1
Host: localhost:8000
Accept: application/json
```

**Réponse 200 OK:**
```json
{
  "contacts": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "nomComplet": "Bernard Sophie",
      "typePersonne": "P",
      "entreprise": "Digital Agency",
      "telephone": "06 12 34 56 78",
      "email": null,
      "impayesCount": 0
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440002",
      "nomComplet": "Dupont Jean",
      "typePersonne": "P",
      "entreprise": null,
      "telephone": "01 23 45 67 89",
      "email": null,
      "impayesCount": 3
    }
  ]
}
```

---

### Exemple 2: Requête avec recherche textuelle

**Requête HTTP:**
```http
GET /api/contacts?sans_email=1&search=bernard&limit=20 HTTP/1.1
Host: localhost:8000
Accept: application/json
```

**Réponse 200 OK:**
```json
{
  "contacts": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "nomComplet": "Bernard Sophie",
      "typePersonne": "P",
      "entreprise": "Digital Agency",
      "telephone": "06 12 34 56 78",
      "email": null,
      "impayesCount": 0
    }
  ]
}
```

---

### Exemple 3: Réponse vide (aucun contact sans email)

**Requête HTTP:**
```http
GET /api/contacts?sans_email=1 HTTP/1.1
Host: localhost:8000
Accept: application/json
```

**Réponse 200 OK:**
```json
{
  "contacts": []
}
```

---

### Exemple 4: Erreur 500 (erreur base de données)

**Requête HTTP:**
```http
GET /api/contacts?sans_email=1 HTTP/1.1
```

**Réponse 500 Internal Server Error:**
```json
{
  "error": "Erreur base de données: unable to open database file"
}
```

---

## Implémentation complète (référence)

```python
import sqlite3
from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List
from pydantic import BaseModel, Field
import logging

logger = logging.getLogger(__name__)
router = APIRouter()
DB_PATH = "app/data/marki.db"

# ==================== Modèles Pydantic ====================

class ContactItemResponse(BaseModel):
    id: str
    nomComplet: str
    typePersonne: Optional[str] = None
    entreprise: Optional[str] = None
    telephone: Optional[str] = None
    email: Optional[str] = None
    impayesCount: int = 0

class ContactsListResponse(BaseModel):
    contacts: List[ContactItemResponse]

# ==================== Route API ====================

@router.get("/api/contacts", response_model=ContactsListResponse)
async def get_contacts(
    sans_email: Optional[str] = Query(None, description="Filtrer contacts sans email (1=actif)"),
    search: Optional[str] = Query(None, max_length=100, description="Recherche textuelle"),
    limit: int = Query(100, ge=1, le=1000, description="Nombre max de résultats")
):
    """
    Récupère la liste des contacts avec filtres optionnels.
    
    Pour le workflow contacts-sans-email:
    - sans_email=1 : filtre les contacts sans email (ni email ni email_force)
    - search : recherche sur nom, prénom, activite_societe
    - limit : limite le nombre de résultats (clamp à 1000)
    """
    
    # Clamp limit à 1000
    if limit > 1000:
        limit = 1000
    
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Construction de la requête SQL
        sql = """
            SELECT 
                c.id,
                c.nom,
                c.prenom,
                c.type_personne,
                c.activite_societe,
                c.telephone,
                c.email,
                COUNT(DISTINCT i.id) as impayes_count
            FROM contacts c
            LEFT JOIN impayes i ON (
                (c.id = i.payer_id OR c.id = i.contact_relance_id)
                AND i.statut = 'impaye'
            )
            WHERE 1=1
        """
        
        params = []
        
        # Filtre sans_email
        if sans_email == '1':
            sql += """ AND (
                (c.email IS NULL OR TRIM(c.email) = '')
                AND (c.email_force IS NULL OR TRIM(c.email_force) = '')
            )"""
        
        # Recherche textuelle
        if search:
            sql += """ AND (
                LOWER(c.nom) LIKE ? 
                OR LOWER(c.prenom) LIKE ? 
                OR LOWER(COALESCE(c.activite_societe, '')) LIKE ?
            )"""
            search_pattern = f"%{search.lower()}%"
            params.extend([search_pattern, search_pattern, search_pattern])
        
        # Group by et tri
        sql += """ 
            GROUP BY c.id
            ORDER BY LOWER(COALESCE(c.nom, '')), LOWER(COALESCE(c.prenom, ''))
            LIMIT ?"""
        params.append(limit)
        
        # Exécution
        cursor.execute(sql, params)
        rows = cursor.fetchall()
        
        # Mapping des résultats
        contacts = []
        for row in rows:
            nom_complet = " ".join(filter(None, [row['nom'], row['prenom']]))
            contacts.append(ContactItemResponse(
                id=row['id'],
                nomComplet=nom_complet,
                typePersonne=row['type_personne'],
                entreprise=row['activite_societe'],
                telephone=row['telephone'],
                email=row['email'] if row['email'] and row['email'].strip() else None,
                impayesCount=row['impayes_count'] or 0
            ))
        
        conn.close()
        
        return {"contacts": contacts}
        
    except sqlite3.Error as e:
        logger.error(f"Database error in get_contacts: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={"error": f"Erreur base de données: {str(e)}"}
        )
    except Exception as e:
        logger.error(f"Unexpected error in get_contacts: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={"error": f"Erreur interne: {str(e)}"}
        )
```

---

## Notes d'implémentation

1. **Filtre "sans email"**: Un contact est considéré "sans email" si `email` IS NULL ou `TRIM(email) = ''` **ET** `email_force` IS NULL ou `TRIM(email_force) = ''`. Les deux champs doivent être vides.

2. **Comptage des impayés**: Les impayés sont comptés via une jointure LEFT sur la table `impayes` où `statut = 'impaye'` et où le contact est soit `payer_id` soit `contact_relance_id`.

3. **Mapping `nomComplet`**: Concaténation de `nom` et `prenom` avec un espace. Si l'un des deux est NULL, il est ignoré (filter(None, ...)).

4. **Mapping `entreprise`**: Mappe directement sur `activite_societe`.

5. **Recherche insensible à la casse**: Utilisation de `LOWER()` sur les colonnes et le paramètre de recherche.

6. **Pagination `limit`**: Si `limit > 1000`, la valeur est clampée à 1000 pour éviter les requêtes trop lourdes.

7. **Email null**: Si `email` est vide ou NULL, le champ `email` dans la réponse doit être `null` (pas une chaîne vide).
