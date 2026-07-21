# Workflow Backend: contacts-get

## Objectifs

Récupérer la liste complète des contacts depuis la base SQLite avec support de la pagination. Ce workflow fournit les données brutes des contacts (personnes morales et personnes physiques) au frontend qui se charge ensuite de la normalisation, du calcul des initiales et de la présentation.

## Route API

```
GET /api/contacts
```

**Fichier d'implémentation suggéré:** `app/routers/contacts.py`

## Paramètres de Requête

| Paramètre | Type | Obligatoire | Défaut | Description |
|-----------|------|-------------|--------|-------------|
| `limit` | integer | non | 1000 | Nombre maximum de contacts à retourner |
| `offset` | integer | non | 0 | Offset pour la pagination |

## Requêtes SQL

### 1. Récupération des contacts

```sql
SELECT 
    id,
    nom,
    prenom,
    email,
    telephone,
    type,
    type_personne,
    statut,
    is_blacklisted,
    blacklist_date,
    blacklist_motif,
    civilite,
    code,
    activite_societe,
    adresse_rue,
    adresse_ville,
    adresse_code_postal,
    adresse_pays,
    notes,
    externe_id,
    email_force,
    lastSyncAt,
    created_at,
    updated_at
FROM contacts
ORDER BY nom ASC, prenom ASC
LIMIT :limit OFFSET :offset;
```

### 2. Comptage total des contacts

```sql
SELECT COUNT(*) as total FROM contacts;
```

## Modèles Pydantic

### Modèle de Requête (Query Parameters)

```python
from pydantic import BaseModel, Field
from typing import Optional


class ContactsGetRequest(BaseModel):
    """Paramètres de requête pour la récupération des contacts."""
    
    limit: Optional[int] = Field(
        default=1000,
        ge=1,
        le=10000,
        description="Nombre maximum de contacts à retourner"
    )
    offset: Optional[int] = Field(
        default=0,
        ge=0,
        description="Offset pour la pagination"
    )
```

### Modèle de Contact (Item de réponse)

```python
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class ContactItem(BaseModel):
    """Représentation d'un contact dans la réponse."""
    
    id: str = Field(..., description="Identifiant unique du contact")
    nom: Optional[str] = Field(None, description="Nom de famille ou raison sociale")
    prenom: Optional[str] = Field(None, description="Prénom pour les personnes physiques")
    email: Optional[str] = Field(None, description="Adresse email principale")
    telephone: Optional[str] = Field(None, description="Numéro de téléphone")
    type: Optional[str] = Field(None, description="Type de contact (M/P)")
    type_personne: Optional[str] = Field(None, description="Type personne (M/P)")
    statut: Optional[str] = Field(None, description="Statut du contact")
    is_blacklisted: int = Field(default=0, description="0 = non blacklisté, 1 = blacklisté")
    blacklist_date: Optional[str] = Field(None, description="Date de blacklisting (ISO 8601)")
    blacklist_motif: Optional[str] = Field(None, description="Motif du blacklisting")
    civilite: Optional[str] = Field(None, description="Civilité (M., Mme, etc.)")
    code: Optional[str] = Field(None, description="Code client interne")
    activite_societe: Optional[str] = Field(None, description="Activité de la société")
    adresse_rue: Optional[str] = Field(None, description="Rue de l'adresse")
    adresse_ville: Optional[str] = Field(None, description="Ville")
    adresse_code_postal: Optional[str] = Field(None, description="Code postal")
    adresse_pays: Optional[str] = Field(None, description="Pays")
    notes: Optional[str] = Field(None, description="Notes libres")
    externe_id: Optional[str] = Field(None, description="ID externe de référence")
    email_force: Optional[str] = Field(None, description="Email forcé pour relance")
    lastSyncAt: Optional[str] = Field(None, description="Date de dernière synchronisation")
    created_at: Optional[str] = Field(None, description="Date de création (ISO 8601)")
    updated_at: Optional[str] = Field(None, description="Date de mise à jour (ISO 8601)")
```

### Modèle de Réponse

```python
from pydantic import BaseModel, Field
from typing import List


class ContactsGetResponse(BaseModel):
    """Réponse complète de l'endpoint GET /api/contacts."""
    
    contacts: List[ContactItem] = Field(
        ...,
        description="Liste des contacts récupérés"
    )
    total: int = Field(
        ...,
        ge=0,
        description="Nombre total de contacts dans la base"
    )
    limit: int = Field(
        ...,
        description="Limite appliquée à cette requête"
    )
    offset: int = Field(
        ...,
        description="Offset appliqué à cette requête"
    )
```

## Implémentation FastAPI

```python
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import JSONResponse
import sqlite3
from typing import Optional

router = APIRouter(prefix="/api/contacts", tags=["contacts"])

DATABASE_PATH = "app/data/marki.db"


@router.get("/", response_model=ContactsGetResponse)
async def get_contacts(
    limit: Optional[int] = Query(default=1000, ge=1, le=10000),
    offset: Optional[int] = Query(default=0, ge=0),
    # Dépendance d'authentification JWT à ajouter selon l'implémentation existante
    # current_user: User = Depends(get_current_user)
):
    """
    Récupère la liste des contacts avec pagination.
    
    - **limit**: Nombre maximum de résultats (défaut: 1000, max: 10000)
    - **offset**: Offset pour la pagination (défaut: 0)
    """
    
    try:
        conn = sqlite3.connect(DATABASE_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Récupération des contacts
        cursor.execute("""
            SELECT 
                id, nom, prenom, email, telephone, type, type_personne,
                statut, is_blacklisted, blacklist_date, blacklist_motif,
                civilite, code, activite_societe, adresse_rue, adresse_ville,
                adresse_code_postal, adresse_pays, notes, externe_id,
                email_force, lastSyncAt, created_at, updated_at
            FROM contacts
            ORDER BY nom ASC, prenom ASC
            LIMIT ? OFFSET ?
        """, (limit, offset))
        
        rows = cursor.fetchall()
        contacts = [dict(row) for row in rows]
        
        # Comptage total
        cursor.execute("SELECT COUNT(*) as total FROM contacts")
        total = cursor.fetchone()["total"]
        
        conn.close()
        
        return ContactsGetResponse(
            contacts=contacts,
            total=total,
            limit=limit,
            offset=offset
        )
        
    except sqlite3.Error as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur base de données: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur interne: {str(e)}"
        )
```

## Gestion des Erreurs

| Code HTTP | Condition | Message de réponse |
|-----------|-----------|-------------------|
| **401** | Token JWT manquant ou invalide | `{"detail": "Non authentifié"}` |
| **403** | Utilisateur sans droits de lecture | `{"detail": "Accès refusé"}` |
| **422** | Paramètres invalides (limit négatif, etc.) | `{"detail": "Paramètre 'limit' invalide"}` |
| **500** | Erreur base de données SQLite | `{"detail": "Erreur base de données: <message>"}` |

## Exemples

### Requête

```bash
curl -X GET "http://localhost:8000/api/contacts?limit=50&offset=0" \
  -H "Authorization: Bearer <token_jwt>" \
  -H "Accept: application/json"
```

### Réponse Succès (200 OK)

```json
{
  "contacts": [
    {
      "id": "M1",
      "nom": "ACME Corporation",
      "prenom": null,
      "email": "contact@acme.fr",
      "telephone": "01 23 45 67 89",
      "type": "M",
      "type_personne": "M",
      "statut": "actif",
      "is_blacklisted": 0,
      "blacklist_date": null,
      "blacklist_motif": null,
      "civilite": null,
      "code": "ACME001",
      "activite_societe": "Services IT",
      "adresse_rue": "123 Rue de Paris",
      "adresse_ville": "Paris",
      "adresse_code_postal": "75001",
      "adresse_pays": "France",
      "notes": null,
      "externe_id": null,
      "email_force": null,
      "lastSyncAt": null,
      "created_at": "2024-01-15T10:30:00",
      "updated_at": "2024-01-15T10:30:00"
    },
    {
      "id": "P1",
      "nom": "Dupont",
      "prenom": "Jean",
      "email": "jean.dupont@email.com",
      "telephone": "06 12 34 56 78",
      "type": "P",
      "type_personne": "P",
      "statut": "actif",
      "is_blacklisted": 0,
      "blacklist_date": null,
      "blacklist_motif": null,
      "civilite": "M.",
      "code": null,
      "activite_societe": null,
      "adresse_rue": null,
      "adresse_ville": null,
      "adresse_code_postal": null,
      "adresse_pays": null,
      "notes": null,
      "externe_id": null,
      "email_force": null,
      "lastSyncAt": null,
      "created_at": "2024-01-15T10:30:00",
      "updated_at": "2024-01-15T10:30:00"
    }
  ],
  "total": 156,
  "limit": 50,
  "offset": 0
}
```

### Réponse Erreur Authentification (401 Unauthorized)

```json
{
  "detail": "Non authentifié"
}
```

### Réponse Erreur Serveur (500 Internal Server Error)

```json
{
  "detail": "Erreur base de données: unable to open database file"
}
```

## Points d'Attention

1. **Pagination obligatoire** : La limite par défaut de 1000 empêche de charger accidentellement tous les contacts en cas de volume important.

2. **Tri alphabétique** : Les contacts sont triés par `nom` puis `prenom` pour une présentation cohérente côté frontend.

3. **Authentification** : Ce endpoint nécessite un token JWT valide. L'implémentation de la dépendance `get_current_user` doit être adaptée au système d'authentification existant.

4. **Champs NULL** : Les champs optionnels (prenom, civilite, etc.) peuvent être `null` selon le type de contact (M = Morale, P = Physique).

5. **Connexion SQLite** : Utiliser `row_factory = sqlite3.Row` pour un accès nommé aux colonnes et une conversion facile en dictionnaire.
