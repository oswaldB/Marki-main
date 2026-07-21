# Workflow Backend: contacts-search-blacklist

## 1. Objectifs

Ce workflow fournit un endpoint de recherche pour lister les contacts blacklistés avec possibilité de filtrage textuel. Il est utilisé par l'écran "contacts-blacklist" pour afficher et rechercher parmi les contacts marqués comme blacklistés.

**Fonctionnalités :**
- Filtrage obligatoire sur `is_blacklisted = 1`
- Recherche textuelle optionnelle sur nom, prénom, email, type de personne, activité société et code client
- Pagination avec limit/offset
- Tri par date de blacklistage décroissante

---

## 2. Route API FastAPI

```python
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
import sqlite3
from datetime import datetime

router = APIRouter()

DB_PATH = "app/data/marki.db"

@router.get("/api/contacts")
def search_blacklisted_contacts(
    is_blacklisted: str = Query(..., description="Valeur fixe '1' pour filtrer les contacts blacklistés"),
    search: Optional[str] = Query(None, description="Terme de recherche (min 2 caractères)"),
    limit: int = Query(1000, ge=1, le=5000, description="Nombre max de résultats"),
    offset: int = Query(0, ge=0, description="Offset pour pagination")
):
    """
    Recherche de contacts blacklistés avec filtrage textuel optionnel.
    """
    pass
```

---

## 3. Requêtes SQL

### 3.1 Requête principale avec recherche

```sql
SELECT 
    c.id,
    c.nom,
    c.prenom,
    c.email,
    c.telephone,
    c.type,
    c.type_personne,
    c.statut,
    c.is_blacklisted,
    c.blacklist_date,
    c.blacklist_motif,
    c.civilite,
    c.code,
    c.activite_societe,
    c.adresse_rue,
    c.adresse_ville,
    c.adresse_code_postal,
    c.adresse_pays,
    c.notes,
    c.created_at,
    c.updated_at,
    c.externe_id,
    c.email_force,
    c.lastSyncAt,
    COUNT(*) OVER() as total_count
FROM contacts c
WHERE c.is_blacklisted = 1
  AND (
      COALESCE(?, '') = '' 
      OR LOWER(c.nom) LIKE '%' || LOWER(?) || '%'
      OR LOWER(c.prenom) LIKE '%' || LOWER(?) || '%'
      OR LOWER(c.email) LIKE '%' || LOWER(?) || '%'
      OR LOWER(COALESCE(c.type_personne, '')) LIKE '%' || LOWER(?) || '%'
      OR LOWER(COALESCE(c.activite_societe, '')) LIKE '%' || LOWER(?) || '%'
      OR LOWER(COALESCE(c.code, '')) LIKE '%' || LOWER(?) || '%'
  )
ORDER BY c.blacklist_date DESC NULLS LAST
LIMIT ? OFFSET ?
```

**Paramètres bindés (7 valeurs identiques pour search + 2 pour pagination) :**
1. `search` (pour le test vide)
2-7. `search` (pour chaque champ de recherche)
8. `limit`
9. `offset`

### 3.2 Requête comptage (alternative si pas de COUNT OVER)

```sql
SELECT COUNT(*) as total
FROM contacts c
WHERE c.is_blacklisted = 1
  AND (
      COALESCE(?, '') = '' 
      OR LOWER(c.nom) LIKE '%' || LOWER(?) || '%'
      OR LOWER(c.prenom) LIKE '%' || LOWER(?) || '%'
      OR LOWER(c.email) LIKE '%' || LOWER(?) || '%'
      OR LOWER(COALESCE(c.type_personne, '')) LIKE '%' || LOWER(?) || '%'
      OR LOWER(COALESCE(c.activite_societe, '')) LIKE '%' || LOWER(?) || '%'
      OR LOWER(COALESCE(c.code, '')) LIKE '%' || LOWER(?) || '%'
  )
```

### 3.3 Index recommandés

```sql
-- Index pour le filtre principal is_blacklisted
CREATE INDEX IF NOT EXISTS idx_contacts_is_blacklisted ON contacts(is_blacklisted);

-- Index pour la recherche textuelle (SQLite utilise FTS5 pour full-text, 
-- mais LIKE avec préfixe peut utiliser ces indexes)
CREATE INDEX IF NOT EXISTS idx_contacts_nom ON contacts(nom);
CREATE INDEX IF NOT EXISTS idx_contacts_prenom ON contacts(prenom);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
CREATE INDEX IF NOT EXISTS idx_contacts_code ON contacts(code);

-- Index composite pour le tri par blacklist_date
CREATE INDEX IF NOT EXISTS idx_contacts_blacklist_date ON contacts(blacklist_date DESC);
```

---

## 4. Modèles Pydantic

### 4.1 Modèle de requête (Query Parameters)

```python
from pydantic import BaseModel, Field, validator
from typing import Optional

class ContactsBlacklistSearchRequest:
    """
    Paramètres de requête pour la recherche de contacts blacklistés.
    Utilisé comme dépendance FastAPI Query.
    """
    is_blacklisted: str = Field(
        ..., 
        description="Valeur fixe '1' pour filtrer les contacts blacklistés",
        regex="^1$"
    )
    search: Optional[str] = Field(
        None, 
        description="Terme de recherche (min 2 caractères)",
        min_length=2,
        max_length=100
    )
    limit: int = Field(
        default=1000, 
        ge=1, 
        le=5000, 
        description="Nombre max de résultats"
    )
    offset: int = Field(
        default=0, 
        ge=0, 
        description="Offset pour pagination"
    )

    @validator('search')
    def validate_search_length(cls, v):
        if v is not None and len(v.strip()) < 2:
            raise ValueError('Le terme de recherche doit contenir au moins 2 caractères')
        return v.strip() if v else v
```

### 4.2 Modèle de contact (réponse)

```python
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class BlacklistedContactResponse(BaseModel):
    """
    Représentation d'un contact blacklisté dans la réponse.
    """
    id: str = Field(..., description="UUID du contact")
    nom: Optional[str] = Field(None, description="Nom du contact")
    prenom: Optional[str] = Field(None, description="Prénom du contact")
    email: Optional[str] = Field(None, description="Email du contact")
    telephone: Optional[str] = Field(None, description="Téléphone du contact")
    type: Optional[str] = Field(None, description="Type de contact")
    type_personne: Optional[str] = Field(None, description="Type de personne (particulier, societe, etc.)")
    statut: Optional[str] = Field(None, description="Statut du contact")
    is_blacklisted: int = Field(..., description="1 si le contact est blacklisté")
    blacklist_date: Optional[str] = Field(None, description="Date de mise en blacklist (ISO 8601)")
    blacklist_motif: Optional[str] = Field(None, description="Motif du blacklistage")
    civilite: Optional[str] = Field(None, description="Civilité")
    code: Optional[str] = Field(None, description="Code client/référence")
    activite_societe: Optional[str] = Field(None, description="Activité de la société")
    adresse_rue: Optional[str] = Field(None, description="Adresse - rue")
    adresse_ville: Optional[str] = Field(None, description="Adresse - ville")
    adresse_code_postal: Optional[str] = Field(None, description="Adresse - code postal")
    adresse_pays: Optional[str] = Field(None, description="Adresse - pays")
    notes: Optional[str] = Field(None, description="Notes sur le contact")
    created_at: Optional[str] = Field(None, description="Date de création (ISO 8601)")
    updated_at: Optional[str] = Field(None, description="Date de mise à jour (ISO 8601)")
    externe_id: Optional[str] = Field(None, description="ID externe/référence externe")
    email_force: Optional[str] = Field(None, description="Email forcé")
    lastSyncAt: Optional[str] = Field(None, description="Date dernière synchronisation")

    class Config:
        orm_mode = True
```

### 4.3 Modèle de réponse paginée

```python
from pydantic import BaseModel, Field
from typing import List

class ContactsBlacklistSearchResponse(BaseModel):
    """
    Réponse paginée de la recherche de contacts blacklistés.
    """
    contacts: List[BlacklistedContactResponse] = Field(
        ..., 
        description="Liste des contacts blacklistés"
    )
    total: int = Field(
        ..., 
        description="Nombre total de résultats (sans pagination)",
        ge=0
    )
    limit: int = Field(
        ..., 
        description="Limite appliquée",
        ge=1
    )
    offset: int = Field(
        ..., 
        description="Offset appliqué",
        ge=0
    )
```

---

## 5. Gestion des erreurs

### Codes HTTP et messages

| Code HTTP | Cas d'erreur | Message |
|-----------|--------------|---------|
| **400** | Paramètre `is_blacklisted` manquant ou différent de "1" | `{"detail": "Le paramètre is_blacklisted est requis avec la valeur '1'"}` |
| **400** | Paramètre `search` présent mais < 2 caractères | `{"detail": "Le terme de recherche doit contenir au moins 2 caractères"}` |
| **400** | Paramètre `limit` > 5000 | `{"detail": "La limite ne peut pas excéder 5000"}` |
| **400** | Paramètre `offset` négatif | `{"detail": "L'offset ne peut pas être négatif"}` |
| **500** | Erreur base de données | `{"detail": "Erreur lors de la recherche des contacts"}` |

### Exemple d'implémentation des erreurs

```python
from fastapi import HTTPException
import sqlite3

def search_blacklisted_contacts(...):
    # Validation is_blacklisted
    if is_blacklisted != "1":
        raise HTTPException(
            status_code=400, 
            detail="Le paramètre is_blacklisted est requis avec la valeur '1'"
        )
    
    # Validation search length côté serveur (redondant mais sécurisant)
    if search and len(search.strip()) < 2:
        raise HTTPException(
            status_code=400,
            detail="Le terme de recherche doit contenir au moins 2 caractères"
        )
    
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        # ... exécution requête
    except sqlite3.Error as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors de la recherche des contacts: {str(e)}"
        )
    finally:
        if conn:
            conn.close()
```

---

## 6. Exemples

### 6.1 Requête sans filtre textuel

**HTTP Request:**
```http
GET /api/contacts?is_blacklisted=1&limit=50&offset=0
```

**cURL:**
```bash
curl -X GET "http://localhost:8000/api/contacts?is_blacklisted=1&limit=50&offset=0" \
  -H "Accept: application/json"
```

### 6.2 Requête avec recherche textuelle

**HTTP Request:**
```http
GET /api/contacts?is_blacklisted=1&search=dupont&limit=50&offset=0
```

**cURL:**
```bash
curl -X GET "http://localhost:8000/api/contacts?is_blacklisted=1&search=dupont&limit=50&offset=0" \
  -H "Accept: application/json"
```

### 6.3 Requête avec pagination

**HTTP Request:**
```http
GET /api/contacts?is_blacklisted=1&limit=25&offset=50
```

### 6.4 Réponse JSON d'exemple

```json
{
  "contacts": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "nom": "DUPONT",
      "prenom": "Jean",
      "email": "jean.dupont@example.com",
      "telephone": "+33 1 23 45 67 89",
      "type": "proprietaire",
      "type_personne": "particulier",
      "statut": "inactif",
      "is_blacklisted": 1,
      "blacklist_date": "2025-03-15T10:30:00",
      "blacklist_motif": "Impossible à joindre - retour définitif emails",
      "civilite": "M.",
      "code": "CLI-001",
      "activite_societe": null,
      "adresse_rue": "123 rue de Paris",
      "adresse_ville": "Paris",
      "adresse_code_postal": "75001",
      "adresse_pays": "France",
      "notes": "Client récurrent - problèmes de paiement",
      "created_at": "2024-01-15T09:00:00",
      "updated_at": "2025-03-15T10:30:00",
      "externe_id": "ref-externe-001",
      "email_force": null,
      "lastSyncAt": "2025-03-15T10:30:00"
    },
    {
      "id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
      "nom": "MARTIN SARL",
      "prenom": null,
      "email": "contact@martinsarl.fr",
      "telephone": "+33 1 98 76 54 32",
      "type": "syndic",
      "type_personne": "societe",
      "statut": "actif",
      "is_blacklisted": 1,
      "blacklist_date": "2025-02-28T14:15:00",
      "blacklist_motif": "Litige en cours",
      "civilite": null,
      "code": "SYN-042",
      "activite_societe": "Syndic de copropriété",
      "adresse_rue": "45 avenue des Champs-Élysées",
      "adresse_ville": "Paris",
      "adresse_code_postal": "75008",
      "adresse_pays": "France",
      "notes": "Attente résolution litige",
      "created_at": "2024-06-01T10:00:00",
      "updated_at": "2025-02-28T14:15:00",
      "externe_id": "ext-789",
      "email_force": null,
      "lastSyncAt": "2025-02-28T14:15:00"
    }
  ],
  "total": 42,
  "limit": 50,
  "offset": 0
}
```

### 6.5 Réponse vide (aucun résultat)

```json
{
  "contacts": [],
  "total": 0,
  "limit": 50,
  "offset": 0
}
```

### 6.6 Réponse erreur (paramètre manquant)

```json
{
  "detail": "Le paramètre is_blacklisted est requis avec la valeur '1'"
}
```

---

## 7. Implémentation complète (référence)

```python
import sqlite3
from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List
from pydantic import BaseModel, Field

router = APIRouter()
DB_PATH = "app/data/marki.db"

class BlacklistedContactResponse(BaseModel):
    id: str
    nom: Optional[str] = None
    prenom: Optional[str] = None
    email: Optional[str] = None
    telephone: Optional[str] = None
    type: Optional[str] = None
    type_personne: Optional[str] = None
    statut: Optional[str] = None
    is_blacklisted: int
    blacklist_date: Optional[str] = None
    blacklist_motif: Optional[str] = None
    civilite: Optional[str] = None
    code: Optional[str] = None
    activite_societe: Optional[str] = None
    adresse_rue: Optional[str] = None
    adresse_ville: Optional[str] = None
    adresse_code_postal: Optional[str] = None
    adresse_pays: Optional[str] = None
    notes: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    externe_id: Optional[str] = None
    email_force: Optional[str] = None
    lastSyncAt: Optional[str] = None
    
    class Config:
        orm_mode = True

class ContactsBlacklistSearchResponse(BaseModel):
    contacts: List[BlacklistedContactResponse]
    total: int
    limit: int
    offset: int

@router.get("/api/contacts", response_model=ContactsBlacklistSearchResponse)
def search_blacklisted_contacts(
    is_blacklisted: str = Query(..., description="Valeur fixe '1'"),
    search: Optional[str] = Query(None, min_length=2, max_length=100),
    limit: int = Query(1000, ge=1, le=5000),
    offset: int = Query(0, ge=0)
):
    """Recherche de contacts blacklistés."""
    
    if is_blacklisted != "1":
        raise HTTPException(
            status_code=400, 
            detail="Le paramètre is_blacklisted est requis avec la valeur '1'"
        )
    
    search_term = search.strip() if search else ""
    
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        query = """
        SELECT 
            c.id, c.nom, c.prenom, c.email, c.telephone, c.type,
            c.type_personne, c.statut, c.is_blacklisted, c.blacklist_date,
            c.blacklist_motif, c.civilite, c.code, c.activite_societe,
            c.adresse_rue, c.adresse_ville, c.adresse_code_postal, c.adresse_pays,
            c.notes, c.created_at, c.updated_at, c.externe_id, c.email_force, c.lastSyncAt,
            COUNT(*) OVER() as total_count
        FROM contacts c
        WHERE c.is_blacklisted = 1
          AND (
              ? = '' 
              OR LOWER(c.nom) LIKE '%' || LOWER(?) || '%'
              OR LOWER(c.prenom) LIKE '%' || LOWER(?) || '%'
              OR LOWER(c.email) LIKE '%' || LOWER(?) || '%'
              OR LOWER(COALESCE(c.type_personne, '')) LIKE '%' || LOWER(?) || '%'
              OR LOWER(COALESCE(c.activite_societe, '')) LIKE '%' || LOWER(?) || '%'
              OR LOWER(COALESCE(c.code, '')) LIKE '%' || LOWER(?) || '%'
          )
        ORDER BY c.blacklist_date DESC NULLS LAST
        LIMIT ? OFFSET ?
        """
        
        params = (search_term,) + (search_term,) * 6 + (limit, offset)
        cursor.execute(query, params)
        
        rows = cursor.fetchall()
        
        if not rows:
            return ContactsBlacklistSearchResponse(
                contacts=[],
                total=0,
                limit=limit,
                offset=offset
            )
        
        total = rows[0]["total_count"] if rows else 0
        
        contacts = []
        for row in rows:
            contacts.append(BlacklistedContactResponse(
                id=row["id"],
                nom=row["nom"],
                prenom=row["prenom"],
                email=row["email"],
                telephone=row["telephone"],
                type=row["type"],
                type_personne=row["type_personne"],
                statut=row["statut"],
                is_blacklisted=row["is_blacklisted"],
                blacklist_date=row["blacklist_date"],
                blacklist_motif=row["blacklist_motif"],
                civilite=row["civilite"],
                code=row["code"],
                activite_societe=row["activite_societe"],
                adresse_rue=row["adresse_rue"],
                adresse_ville=row["adresse_ville"],
                adresse_code_postal=row["adresse_code_postal"],
                adresse_pays=row["adresse_pays"],
                notes=row["notes"],
                created_at=row["created_at"],
                updated_at=row["updated_at"],
                externe_id=row["externe_id"],
                email_force=row["email_force"],
                lastSyncAt=row["lastSyncAt"]
            ))
        
        return ContactsBlacklistSearchResponse(
            contacts=contacts,
            total=total,
            limit=limit,
            offset=offset
        )
        
    except sqlite3.Error as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erreur base de données: {str(e)}"
        )
    finally:
        if conn:
            conn.close()
```

---

## 8. Notes d'implémentation

1. **Base de données**: SQLite avec chemin relatif `app/data/marki.db`

2. **Case-insensitive search**: Utilisation de `LOWER()` sur les colonnes et le terme de recherche (SQLite est case-insensitive par défaut pour `LIKE`, mais `LOWER()` assure la cohérence)

3. **Gestion des NULL**: `COALESCE(c.type_personne, '')` pour éviter les problèmes avec les valeurs NULL dans les comparaisons LIKE

4. **Pagination**: Utilisation de `COUNT(*) OVER()` pour obtenir le total sans requête supplémentaire (fonctionne sur SQLite 3.25+)

5. **Tri**: `ORDER BY c.blacklist_date DESC NULLS LAST` pour afficher d'abord les contacts blacklistés les plus récemment

6. **Performance**: Index recommandés sur les champs de recherche fréquents

7. **Validation**: La validation du paramètre `is_blacklisted` est stricte pour éviter les fuites de données non-blacklistées
