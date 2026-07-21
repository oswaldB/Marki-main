# Workflow Backend: contacts-blacklist-list

## Titre
Liste des contacts blacklistés avec recherche et pagination

---

## Objectifs

Ce workflow permet de :
1. **Récupérer** la liste complète des contacts ayant le statut `is_blacklisted = 1`
2. **Rechercher** par texte sur nom, prénom, email et société (activité)
3. **Paginer** les résultats avec limit/offset
4. **Compter** le nombre d'impayés associés à chaque contact

---

## Route API

| Attribut | Valeur |
|----------|--------|
| **Méthode** | `GET` |
| **Endpoint** | `/api/contacts` |
| **Content-Type** | `application/json` |
| **Authentication** | Requise (Bearer token) |

---

## Requêtes SQL

### Requête principale: Liste des contacts blacklistés

```sql
SELECT 
    c.id,
    c.nom,
    c.prenom,
    c.email,
    c.telephone,
    c.type_personne,
    c.activite_societe,
    c.is_blacklisted,
    c.blacklist_date,
    c.blacklist_motif,
    c.created_at,
    c.updated_at,
    (
        SELECT COUNT(*) 
        FROM impayes i 
        WHERE i.payer_id = c.id
    ) as impayes_count
FROM contacts c
WHERE c.is_blacklisted = 1
    AND (
        ?1 IS NULL 
        OR LENGTH(?1) < 2 
        OR LOWER(c.nom) LIKE LOWER('%' || ?1 || '%')
        OR LOWER(c.prenom) LIKE LOWER('%' || ?1 || '%')
        OR LOWER(c.email) LIKE LOWER('%' || ?1 || '%')
        OR LOWER(COALESCE(c.activite_societe, '')) LIKE LOWER('%' || ?1 || '%')
    )
ORDER BY c.updated_at DESC
LIMIT ?2 OFFSET ?3;
```

**Paramètres:**
- `?1` : `search` (string | null) - Terme de recherche
- `?2` : `limit` (integer) - Nombre max de résultats (défaut: 1000)
- `?3` : `offset` (integer) - Offset pour pagination (défaut: 0)

### Requête de comptage total

```sql
SELECT COUNT(*) as total
FROM contacts c
WHERE c.is_blacklisted = 1
    AND (
        ?1 IS NULL 
        OR LENGTH(?1) < 2 
        OR LOWER(c.nom) LIKE LOWER('%' || ?1 || '%')
        OR LOWER(c.prenom) LIKE LOWER('%' || ?1 || '%')
        OR LOWER(c.email) LIKE LOWER('%' || ?1 || '%')
        OR LOWER(COALESCE(c.activite_societe, '')) LIKE LOWER('%' || ?1 || '%')
    );
```

**Paramètres:**
- `?1` : `search` (string | null) - Terme de recherche

---

## Modèles Pydantic

### Request Model - Query Parameters

```python
from pydantic import BaseModel, Field, validator
from typing import Optional


class BlacklistListRequest(BaseModel):
    """Paramètres de requête pour la liste des contacts blacklistés."""
    
    is_blacklisted: int = Field(
        default=1,
        description="Filtrer par statut blacklist (1 = blacklistés)",
        ge=0,
        le=1
    )
    search: Optional[str] = Field(
        default=None,
        description="Recherche textuelle (nom, prénom, email, société). Minimum 2 caractères.",
        min_length=0,
        max_length=100
    )
    limit: int = Field(
        default=1000,
        description="Nombre maximum de résultats",
        ge=1,
        le=5000
    )
    offset: int = Field(
        default=0,
        description="Offset pour la pagination",
        ge=0
    )
    
    @validator('search')
    def validate_search_length(cls, v):
        """Ignore la recherche si moins de 2 caractères."""
        if v is not None and len(v.strip()) < 2:
            return None
        return v.strip() if v else None
```

### Response Models

```python
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


class BlacklistedContact(BaseModel):
    """Modèle d'un contact blacklisté dans la réponse."""
    
    id: str = Field(..., description="ID unique du contact (format: cont_xxx)")
    nom: Optional[str] = Field(None, description="Nom de famille")
    prenom: Optional[str] = Field(None, description="Prénom")
    nom_complet: str = Field(..., description="Nom complet formaté (prénom + nom)")
    email: Optional[str] = Field(None, description="Adresse email")
    telephone: Optional[str] = Field(None, description="Numéro de téléphone")
    type_personne: Optional[str] = Field(None, description="Type: 'P' (particulier) ou 'M' (morale)")
    activite_societe: Optional[str] = Field(None, description="Nom de la société / activité")
    is_blacklisted: int = Field(..., description="Statut blacklist (1 = blacklisté)")
    blacklist_date: Optional[str] = Field(None, description="Date de mise en blacklist (ISO 8601)")
    blacklist_motif: Optional[str] = Field(None, description="Motif du blacklist")
    impayes_count: int = Field(..., description="Nombre d'impayés associés", ge=0)
    created_at: Optional[str] = Field(None, description="Date de création (ISO 8601)")
    updated_at: Optional[str] = Field(None, description="Date de dernière modification (ISO 8601)")
    
    class Config:
        json_schema_extra = {
            "example": {
                "id": "cont_abc123",
                "nom": "Petit",
                "prenom": "Lucas",
                "nom_complet": "Lucas Petit",
                "email": "lucas@consultingpro.fr",
                "telephone": "01 45 67 89 01",
                "type_personne": "P",
                "activite_societe": "Consulting Pro",
                "is_blacklisted": 1,
                "blacklist_date": "2024-01-15T10:30:00Z",
                "blacklist_motif": "Client ne souhaite plus être relancé",
                "impayes_count": 1,
                "created_at": "2023-06-10T08:00:00Z",
                "updated_at": "2024-01-15T10:30:00Z"
            }
        }


class BlacklistListResponse(BaseModel):
    """Réponse complète de la liste des contacts blacklistés."""
    
    contacts: List[BlacklistedContact] = Field(
        ..., 
        description="Liste des contacts blacklistés"
    )
    total: int = Field(
        ..., 
        description="Nombre total de contacts correspondant aux critères",
        ge=0
    )
    limit: int = Field(
        ..., 
        description="Nombre maximum de résultats demandés"
    )
    offset: int = Field(
        ..., 
        description="Offset utilisé pour cette page"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "contacts": [],
                "total": 42,
                "limit": 1000,
                "offset": 0
            }
        }
```

---

## Gestion des Erreurs

| Code HTTP | Condition | Message |
|-----------|-----------|---------|
| **200** | Succès | Opération réussie, retourne la liste |
| **401** | Non authentifié | `{"detail": "Authentication required"}` |
| **403** | Permissions insuffisantes | `{"detail": "Insufficient permissions"}` |
| **422** | Paramètres invalides | Détails des erreurs de validation Pydantic |
| **500** | Erreur base de données | `{"detail": "Database error: {message}"}` |

### Exemples d'erreurs

```json
// 401 - Non authentifié
{
    "detail": "Not authenticated"
}

// 403 - Permissions insuffisantes
{
    "detail": "User does not have 'contacts:read' permission"
}

// 422 - Paramètre invalide (limit négatif)
{
    "detail": [
        {
            "loc": ["query", "limit"],
            "msg": "ensure this value is greater than or equal to 1",
            "type": "value_error.number.not_ge"
        }
    ]
}

// 500 - Erreur base de données
{
    "detail": "Internal server error"
}
```

---

## Exemples

### Exemple de requête

```http
GET /api/contacts?is_blacklisted=1&search=dupont&limit=50&offset=0 HTTP/1.1
Host: localhost:8000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Accept: application/json
```

### Exemple de réponse succès (200 OK)

```json
{
    "contacts": [
        {
            "id": "cont_abc123def456",
            "nom": "Dupont",
            "prenom": "Marie",
            "nom_complet": "Marie Dupont",
            "email": "marie.dupont@entreprise.fr",
            "telephone": "01 23 45 67 89",
            "type_personne": "P",
            "activite_societe": "Entreprise ABC",
            "is_blacklisted": 1,
            "blacklist_date": "2024-01-15T10:30:00Z",
            "blacklist_motif": "Client ne souhaite plus être relancé",
            "impayes_count": 3,
            "created_at": "2023-06-10T08:00:00Z",
            "updated_at": "2024-01-15T10:30:00Z"
        },
        {
            "id": "cont_xyz789ghi012",
            "nom": "Dupont",
            "prenom": "Jean",
            "nom_complet": "Jean Dupont",
            "email": "jean.dupont@societe.com",
            "telephone": "06 12 34 56 78",
            "type_personne": "P",
            "activite_societe": "Société XYZ",
            "is_blacklisted": 1,
            "blacklist_date": "2024-02-20T14:15:00Z",
            "blacklist_motif": "Litige commercial en cours",
            "impayes_count": 0,
            "created_at": "2023-08-15T09:30:00Z",
            "updated_at": "2024-02-20T14:15:00Z"
        }
    ],
    "total": 2,
    "limit": 50,
    "offset": 0
}
```

### Exemple de réponse vide (200 OK)

```json
{
    "contacts": [],
    "total": 0,
    "limit": 1000,
    "offset": 0
}
```

### Exemple de recherche ignorée (search < 2 caractères)

```http
GET /api/contacts?is_blacklisted=1&search=a&limit=100 HTTP/1.1
```

**Comportement:** Le paramètre `search` est ignoré, retourne tous les contacts blacklistés (jusqu'à 100 résultats).

---

## Notes d'implémentation

### Construction du nom complet
Le champ `nom_complet` est calculé côté backend selon la logique :
```python
if prenom and nom:
    nom_complet = f"{prenom} {nom}"
elif nom:
    nom_complet = nom
elif prenom:
    nom_complet = prenom
else:
    nom_complet = "Contact sans nom"
```

### Performance
- Index utilisé: `idx_contacts_blacklist` (si existant) sur `is_blacklisted`
- Recherche textuelle: `LIKE LOWER('%' || search || '%')` - case insensitive
- Pour des volumes importants (>10k contacts), envisager FTS SQLite ou pagination côté client optimisée

### Sécurité
- Vérifier que `is_blacklisted` est toujours égal à 1 (ne pas permettre d'autres valeurs via cette route)
- Sanitiser le paramètre `search` pour éviter les injections SQL (utiliser requêtes paramétrées)
- Limiter `limit` à maximum 5000 pour éviter les surcharges mémoire

---

## Dépendances

### Tables requises
- `contacts` - Table principale
- `impayes` - Pour le calcul du compte d'impayés (via sous-requête)

### Permissions requises
- `contacts:read` - Permission de lecture des contacts

### Modules Python nécessaires
```python
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field, validator
import sqlite3
from typing import List, Optional
from datetime import datetime
```
