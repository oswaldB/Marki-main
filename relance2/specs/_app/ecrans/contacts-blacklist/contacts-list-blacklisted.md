# Workflow Backend: contacts-list-blacklisted

## Objectifs

Ce workflow expose un endpoint API FastAPI permettant de récupérer la liste des contacts blacklistés (`is_blacklisted=1`). Il supporte :
- Le filtrage par statut blacklisté (obligatoire)
- La recherche textuelle sur nom, prénom, email et téléphone
- La pagination via un paramètre `limit`
- L'enrichissement des données avec le nombre d'impayés associés par contact

---

## Route API

```python
from fastapi import APIRouter, Query, HTTPException
from typing import Optional, List
from pydantic import BaseModel, Field
import sqlite3
from datetime import datetime

router = APIRouter()

@router.get("/api/contacts", response_model=ContactsBlacklistResponse)
def list_blacklisted_contacts(
    is_blacklisted: int = Query(..., description="Valeur 1 pour filtrer les contacts blacklistés", ge=0, le=1),
    search: Optional[str] = Query(None, description="Recherche textuelle sur nom, prénom, email, téléphone"),
    limit: int = Query(1000, description="Nombre maximum de résultats", ge=1, le=5000)
):
    """
    Récupère la liste des contacts blacklistés avec comptage des impayés.
    """
    pass  # Implémentation ci-dessous
```

---

## Modèles Pydantic

### Requête

Les paramètres sont passés via Query string (voir route ci-dessus).

### Réponse

```python
class ContactBlacklistItem(BaseModel):
    """Représentation d'un contact blacklisté dans la réponse."""
    id: str = Field(..., description="ID unique du contact")
    nomComplet: str = Field(..., description="Nom complet (nom + prénom)")
    typePersonne: Optional[str] = Field(None, description="Type de personne (P/M)")
    entreprise: Optional[str] = Field(None, description="Activité/entreprise du contact")
    email: Optional[str] = Field(None, description="Email du contact")
    telephone: Optional[str] = Field(None, description="Numéro de téléphone")
    impayesCount: int = Field(0, description="Nombre d'impayés associés")
    dateBlacklist: Optional[str] = Field(None, description="Date de mise en blacklist (ISO 8601)")
    isBlacklisted: int = Field(..., description="Statut blacklist (1 = blacklisté)")

    class Config:
        json_schema_extra = {
            "example": {
                "id": "550e8400-e29b-41d4-a716-446655440000",
                "nomComplet": "Lucas Petit",
                "typePersonne": "P",
                "entreprise": "Consulting Pro",
                "email": "lucas@consultingpro.fr",
                "telephone": "01 45 67 89 01",
                "impayesCount": 1,
                "dateBlacklist": "2024-01-15T10:30:00",
                "isBlacklisted": 1
            }
        }


class ContactsBlacklistResponse(BaseModel):
    """Réponse complète du endpoint contacts blacklistés."""
    contacts: List[ContactBlacklistItem] = Field(..., description="Liste des contacts")
    total: int = Field(..., description="Nombre total de contacts retournés")

    class Config:
        json_schema_extra = {
            "example": {
                "contacts": [
                    {
                        "id": "550e8400-e29b-41d4-a716-446655440000",
                        "nomComplet": "Lucas Petit",
                        "typePersonne": "P",
                        "entreprise": "Consulting Pro",
                        "email": "lucas@consultingpro.fr",
                        "telephone": "01 45 67 89 01",
                        "impayesCount": 1,
                        "dateBlacklist": "2024-01-15T10:30:00",
                        "isBlacklisted": 1
                    }
                ],
                "total": 1
            }
        }
```

---

## Requêtes SQL

### Requête Principale

```sql
-- Requête de récupération des contacts blacklistés avec comptage des impayés
SELECT 
    c.id,
    c.nom,
    c.prenom,
    c.type_personne,
    c.activite_societe,
    c.email,
    c.telephone,
    c.blacklist_date,
    c.is_blacklisted,
    COUNT(i.id) as impayes_count
FROM contacts c
LEFT JOIN impayes i ON i.payer_id = c.id
WHERE c.is_blacklisted = :is_blacklisted
    AND (
        :search IS NULL 
        OR LOWER(c.nom) LIKE LOWER('%' || :search || '%')
        OR LOWER(c.prenom) LIKE LOWER('%' || :search || '%')
        OR LOWER(c.email) LIKE LOWER('%' || :search || '%')
        OR c.telephone LIKE '%' || :search || '%'
    )
GROUP BY c.id
ORDER BY c.blacklist_date DESC
LIMIT :limit
```

**Paramètres nommés :**
- `:is_blacklisted` (int) : Doit être `1` pour les contacts blacklistés
- `:search` (str|None) : Terme de recherche (NULL pour ignorer)
- `:limit` (int) : Limite de résultats (max 5000)

**Notes sur la requête :**
- La jointure `LEFT JOIN` sur `impayes.payer_id` permet de compter tous les impayés associés au contact
- Le `GROUP BY c.id` agrège les résultats par contact
- Le filtre de recherche est insensible à la casse via `LOWER()`
- L'ordonnancement par `blacklist_date DESC` met en premier les contacts récemment blacklistés

### Schéma des tables concernées

**Table `contacts` (champs utilisés) :**
| Champ | Type | Description |
|-------|------|-------------|
| id | TEXT | Clé primaire |
| nom | TEXT | Nom du contact |
| prenom | TEXT | Prénom du contact |
| type_personne | TEXT | Type (P=Particulier, M=Morale) |
| activite_societe | TEXT | Nom de l'entreprise/activité |
| email | TEXT | Email |
| telephone | TEXT | Téléphone |
| is_blacklisted | INTEGER | 1=blacklisté, 0=non |
| blacklist_date | TEXT | Date ISO 8601 de mise en blacklist |

**Table `impayes` (champs utilisés) :**
| Champ | Type | Description |
|-------|------|-------------|
| id | TEXT | Clé primaire |
| payer_id | TEXT | Clé étrangère vers contacts.id |

---

## Implémentation Complète

```python
import sqlite3
from fastapi import APIRouter, Query, HTTPException
from typing import Optional, List
from pydantic import BaseModel, Field

DB_PATH = "app/data/marki.db"

router = APIRouter()


class ContactBlacklistItem(BaseModel):
    id: str
    nomComplet: str
    typePersonne: Optional[str]
    entreprise: Optional[str]
    email: Optional[str]
    telephone: Optional[str]
    impayesCount: int
    dateBlacklist: Optional[str]
    isBlacklisted: int


class ContactsBlacklistResponse(BaseModel):
    contacts: List[ContactBlacklistItem]
    total: int


@router.get("/api/contacts", response_model=ContactsBlacklistResponse)
def list_blacklisted_contacts(
    is_blacklisted: int = Query(
        ..., 
        description="Valeur 1 pour filtrer les contacts blacklistés",
        ge=0, 
        le=1
    ),
    search: Optional[str] = Query(
        None, 
        description="Recherche textuelle sur nom, prénom, email, téléphone"
    ),
    limit: int = Query(
        1000, 
        description="Nombre maximum de résultats", 
        ge=1, 
        le=5000
    )
):
    """
    Récupère la liste des contacts blacklistés avec comptage des impayés.
    """
    # Validation du paramètre obligatoire pour ce workflow
    if is_blacklisted != 1:
        raise HTTPException(
            status_code=400,
            detail="Le paramètre is_blacklisted doit être égal à 1 pour ce workflow"
        )
    
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Requête SQL
        query = """
            SELECT 
                c.id,
                c.nom,
                c.prenom,
                c.type_personne,
                c.activite_societe,
                c.email,
                c.telephone,
                c.blacklist_date,
                c.is_blacklisted,
                COUNT(i.id) as impayes_count
            FROM contacts c
            LEFT JOIN impayes i ON i.payer_id = c.id
            WHERE c.is_blacklisted = ?
                AND (
                    ? IS NULL 
                    OR LOWER(c.nom) LIKE LOWER('%' || ? || '%')
                    OR LOWER(c.prenom) LIKE LOWER('%' || ? || '%')
                    OR LOWER(c.email) LIKE LOWER('%' || ? || '%')
                    OR c.telephone LIKE '%' || ? || '%'
                )
            GROUP BY c.id
            ORDER BY c.blacklist_date DESC
            LIMIT ?
        """
        
        # Paramètres pour SQLite (positional)
        params = [
            is_blacklisted,           # ?1 - filtre is_blacklisted
            search,                   # ?2 - NULL check
            search,                   # ?3 - recherche nom
            search,                   # ?4 - recherche prenom
            search,                   # ?5 - recherche email
            search,                   # ?6 - recherche telephone
            limit                     # ?7 - limite
        ]
        
        cursor.execute(query, params)
        rows = cursor.fetchall()
        
        # Mapping vers le modèle de réponse
        contacts = []
        for row in rows:
            contact_id, nom, prenom, type_personne, activite_societe, email, \
            telephone, blacklist_date, is_blacklisted_val, impayes_count = row
            
            # Construction du nom complet
            nom_complet = " ".join(filter(None, [nom, prenom]))
            
            contacts.append(ContactBlacklistItem(
                id=contact_id,
                nomComplet=nom_complet,
                typePersonne=type_personne,
                entreprise=activite_societe,
                email=email,
                telephone=telephone,
                impayesCount=impayes_count or 0,
                dateBlacklist=blacklist_date,
                isBlacklisted=is_blacklisted_val
            ))
        
        conn.close()
        
        return ContactsBlacklistResponse(
            contacts=contacts,
            total=len(contacts)
        )
        
    except sqlite3.Error as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erreur base de données: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erreur interne: {str(e)}"
        )
```

---

## Gestion des Erreurs

| Code HTTP | Cas | Message |
|-----------|-----|---------|
| **200** | Succès | Réponse JSON standard avec contacts et total |
| **400** | Paramètre `is_blacklisted` invalide | `{"detail": "Le paramètre is_blacklisted doit être égal à 1 pour ce workflow"}` |
| **400** | Paramètre `limit` hors bornes (< 1 ou > 5000) | Validation FastAPI automatique |
| **500** | Erreur SQLite | `{"detail": "Erreur base de données: <message>"}` |
| **500** | Erreur interne inattendue | `{"detail": "Erreur interne: <message>"}` |

### Cas particuliers gérés

| Cas | Comportement |
|-----|--------------|
| **Aucun contact blacklisté** | HTTP 200 avec `{"contacts": [], "total": 0}` |
| **Recherche sans résultat** | HTTP 200 avec `{"contacts": [], "total": 0}` |
| **Contact sans impayés** | `impayesCount: 0` dans la réponse |
| **Contact blacklisté sans date** | `dateBlacklist: null` |
| **Nom/prénom NULL** | `nomComplet` construit avec les valeurs disponibles (filtre `filter(None, ...)`) |

---

## Exemples

### Exemple de Requête

```bash
# Récupération de tous les contacts blacklistés (limit 1000 par défaut)
curl "http://localhost:8000/api/contacts?is_blacklisted=1"

# Avec recherche textuelle
curl "http://localhost:8000/api/contacts?is_blacklisted=1&search=petit"

# Avec limite personnalisée
curl "http://localhost:8000/api/contacts?is_blacklisted=1&limit=50"

# Combinaison complète
curl "http://localhost:8000/api/contacts?is_blacklisted=1&search=lucas&limit=10"
```

### Exemple de Réponse (Succès)

```json
{
  "contacts": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "nomComplet": "Lucas Petit",
      "typePersonne": "P",
      "entreprise": "Consulting Pro",
      "email": "lucas@consultingpro.fr",
      "telephone": "01 45 67 89 01",
      "impayesCount": 3,
      "dateBlacklist": "2024-01-15T10:30:00",
      "isBlacklisted": 1
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "nomComplet": "Marie Dubois",
      "typePersonne": "P",
      "entreprise": null,
      "email": "marie.dubois@email.fr",
      "telephone": "06 12 34 56 78",
      "impayesCount": 0,
      "dateBlacklist": "2024-01-10T14:00:00",
      "isBlacklisted": 1
    }
  ],
  "total": 2
}
```

### Exemple de Réponse (Liste vide)

```json
{
  "contacts": [],
  "total": 0
}
```

### Exemple d'Erreur (Paramètre invalide)

```json
{
  "detail": "Le paramètre is_blacklisted doit être égal à 1 pour ce workflow"
}
```

---

## Notes d'implémentation

1. **Chemin base de données** : Utiliser exactement `app/data/marki.db` (relatif à la racine du projet)

2. **Gestion des NULL** : Le nom complet est construit en filtrant les valeurs NULL pour éviter les espaces superflus

3. **Performance** : La requête utilise `LOWER()` pour la recherche insensible à la casse. Pour de gros volumes, envisager un index sur `contacts.is_blacklisted` et des COLLATE NOCASE sur les champs de recherche

4. **SQL Injection** : Utilisation de paramètres positionnels `?` pour toutes les valeurs dynamiques

5. **Limitation** : Le paramètre `limit` est plafonné à 5000 côté serveur pour éviter les surcharges

6. **Date de blacklist** : Retournée telle quelle depuis la base (format ISO 8601 stocké en TEXT), peut être NULL si les données sont incohérentes
