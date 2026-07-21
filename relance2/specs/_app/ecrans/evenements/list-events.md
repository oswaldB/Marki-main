# Workflow Backend: List Events

## 1. Titre
**Récupération paginée et filtrée de la liste des événements**

---

## 2. Objectifs

Ce workflow permet de :
- Récupérer la liste des événements stockés dans la table `events`
- Filtrer les événements par type, recherche textuelle, plage de dates, utilisateur associé, statut de lecture et origine (système Marki vs manuel)
- Paginer les résultats pour optimiser les performances côté client
- Trier les résultats selon différents critères (date de création, titre)
- Inclure les informations du contact associé (`who`) via jointure avec la table `contacts`

---

## 3. Route API

| Attribut | Valeur |
|----------|--------|
| **Méthode HTTP** | `GET` |
| **Endpoint** | `/api/events` |
| **Fichier** | `app/routers/events.py` |
| **Fonction** | `list_events()` |

---

## 4. Requêtes SQL

### 4.1 Requête principale - Récupération des événements

```sql
SELECT 
    e.id,
    e.type,
    e.titre,
    e.description,
    e.entity_type,
    e.entity_id,
    e.read,
    e.by_marki,
    e.icon,
    e.metadata,
    e.created_at,
    e.who_id,
    c.nom AS contact_nom,
    c.prenom AS contact_prenom,
    c.email AS contact_email,
    c.type AS contact_type
FROM events e
LEFT JOIN contacts c ON e.who_id = c.id
WHERE 1=1
    AND (:type IS NULL OR :type = 'all' OR e.type = :type)
    AND (
        :search IS NULL 
        OR LOWER(e.titre) LIKE '%' || LOWER(:search) || '%' 
        OR LOWER(e.description) LIKE '%' || LOWER(:search) || '%'
    )
    AND (:date_start IS NULL OR e.created_at >= :date_start)
    AND (:date_end IS NULL OR e.created_at <= :date_end)
    AND (:user_id IS NULL OR e.who_id = :user_id)
    AND (:read IS NULL OR e.read = :read)
    AND (:by_marki IS NULL OR e.by_marki = :by_marki)
ORDER BY 
    CASE WHEN :sort_by = 'titre' AND :sort_order = 'asc' THEN e.titre END ASC,
    CASE WHEN :sort_by = 'titre' AND :sort_order = 'desc' THEN e.titre END DESC,
    CASE WHEN (:sort_by IS NULL OR :sort_by = 'created_at') AND :sort_order = 'asc' THEN e.created_at END ASC,
    CASE WHEN (:sort_by IS NULL OR :sort_by = 'created_at') AND (:sort_order IS NULL OR :sort_order = 'desc') THEN e.created_at END DESC
LIMIT :per_page OFFSET :offset;
```

### 4.2 Requête de comptage - Total des événements filtrés

```sql
SELECT COUNT(*) as total
FROM events e
WHERE 1=1
    AND (:type IS NULL OR :type = 'all' OR e.type = :type)
    AND (
        :search IS NULL 
        OR LOWER(e.titre) LIKE '%' || LOWER(:search) || '%' 
        OR LOWER(e.description) LIKE '%' || LOWER(:search) || '%'
    )
    AND (:date_start IS NULL OR e.created_at >= :date_start)
    AND (:date_end IS NULL OR e.created_at <= :date_end)
    AND (:user_id IS NULL OR e.who_id = :user_id)
    AND (:read IS NULL OR e.read = :read)
    AND (:by_marki IS NULL OR e.by_marki = :by_marki);
```

### 4.3 Requête de validation (optionnelle) - Vérification de l'existence du contact

```sql
SELECT id FROM contacts WHERE id = :user_id;
```

---

## 5. Modèles Pydantic

### 5.1 Modèle de réponse pour le contact associé (who)

```python
from pydantic import BaseModel
from typing import Optional

class EventContactInfo(BaseModel):
    """Informations du contact associé à l'événement (who_id)"""
    id: str
    nom: Optional[str] = None
    prenom: Optional[str] = None
    email: Optional[str] = None
    type: Optional[str] = None

    class Config:
        from_attributes = True
```

### 5.2 Modèle d'item événement

```python
from pydantic import BaseModel
from typing import Optional, Any
from datetime import datetime

class EventItem(BaseModel):
    """Représentation d'un événement dans la réponse"""
    id: str
    type: str
    titre: str
    description: Optional[str] = None
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    read: int = 0
    by_marki: int = 0
    icon: str = "fa-bell"
    metadata: Optional[str] = None  # JSON string retournée telle quelle
    created_at: str  # ISO 8601 format
    who: Optional[EventContactInfo] = None

    class Config:
        from_attributes = True
```

### 5.3 Modèle de pagination

```python
from pydantic import BaseModel
from typing import Optional, Dict, Any

class PaginationInfo(BaseModel):
    """Informations de pagination"""
    page: int
    per_page: int
    total: int
    total_pages: int
    has_next: bool
    has_prev: bool

class FiltersApplied(BaseModel):
    """Filtres appliqués à la requête"""
    type: Optional[str] = None
    search: Optional[str] = None
    date_start: Optional[str] = None
    date_end: Optional[str] = None
    user_id: Optional[str] = None
    read: Optional[int] = None
    by_marki: Optional[int] = None
    sort_by: Optional[str] = None
    sort_order: Optional[str] = None
```

### 5.4 Modèle de réponse principal

```python
from pydantic import BaseModel
from typing import List

class EventsListResponse(BaseModel):
    """Réponse complète de l'endpoint /api/events"""
    success: bool = True
    data: Dict[str, Any] = {
        "items": List[EventItem],
        "pagination": PaginationInfo,
        "filters_applied": FiltersApplied
    }
```

### 5.5 Paramètres de requête (Query Parameters)

```python
from fastapi import Query
from typing import Optional
from pydantic import BaseModel, Field

class EventListQueryParams(BaseModel):
    """Paramètres de requête pour la liste des événements"""
    type: Optional[str] = Field(default=None, description="Filtre par type d'événement ou 'all'")
    search: Optional[str] = Field(default=None, description="Recherche textuelle dans titre et description")
    date_start: Optional[str] = Field(default=None, description="Date de début (ISO 8601)")
    date_end: Optional[str] = Field(default=None, description="Date de fin (ISO 8601)")
    user_id: Optional[str] = Field(default=None, description="Filtre par contact associé (who_id)")
    read: Optional[int] = Field(default=None, ge=0, le=1, description="Statut lu: 0 ou 1")
    by_marki: Optional[int] = Field(default=None, ge=0, le=1, description="Événement système: 0 ou 1")
    page: int = Field(default=1, ge=1, description="Numéro de page")
    per_page: int = Field(default=20, ge=1, le=100, description="Éléments par page (max 100)")
    sort_by: Optional[str] = Field(default="created_at", description="Champ de tri: created_at ou titre")
    sort_order: Optional[str] = Field(default="desc", description="Ordre: asc ou desc")
```

---

## 6. Gestion des Erreurs

### 6.1 Codes HTTP et messages

| Code HTTP | Cas | Message |
|-----------|-----|---------|
| `200 OK` | Succès | Liste des événements retournée |
| `400 Bad Request` | Paramètre `type` invalide | `{"error": "Type d'événement invalide"}` |
| `400 Bad Request` | Format de date invalide | `{"error": "Format de date invalide. Attendu: ISO 8601"}` |
| `400 Bad Request` | `per_page` > 100 | `{"error": "per_page ne peut pas dépasser 100"}` |
| `400 Bad Request` | `sort_by` invalide | `{"error": "Champ de tri invalide. Valeurs autorisées: created_at, titre"}` |
| `400 Bad Request` | `sort_order` invalide | `{"error": "Ordre de tri invalide. Valeurs autorisées: asc, desc"}` |
| `404 Not Found` | `user_id` fourni mais contact inexistant | `{"error": "Contact non trouvé"}` |
| `500 Internal Server Error` | Erreur base de données | `{"error": "Erreur interne du serveur"}` |

### 6.2 Gestion des valeurs invalides

```python
# Validation des paramètres
VALID_SORT_BY = ['created_at', 'titre']
VALID_SORT_ORDER = ['asc', 'desc']

# Vérifications à effectuer:
# - sort_by doit être dans VALID_SORT_BY
# - sort_order doit être dans VALID_SORT_ORDER
# - date_start et date_end doivent être parsables en datetime ISO
# - per_page ne doit pas dépasser 100
```

### 6.3 Calcul de la pagination

```python
# Calcul des métadonnées de pagination
offset = (page - 1) * per_page
total_pages = (total + per_page - 1) // per_page  # Arrondi supérieur
has_next = page < total_pages
has_prev = page > 1
```

---

## 7. Exemples

### 7.1 Requête d'exemple - Récupération basique

```bash
curl -X GET "http://localhost:8000/api/events?page=1&per_page=20"
```

### 7.2 Requête d'exemple - Avec filtres

```bash
curl -X GET "http://localhost:8000/api/events?type=notification&read=0&by_marki=1&sort_by=created_at&sort_order=desc&page=1&per_page=20"
```

### 7.3 Requête d'exemple - Recherche textuelle et plage de dates

```bash
curl -X GET "http://localhost:8000/api/events?search=paiement&date_start=2024-01-01T00:00:00Z&date_end=2024-12-31T23:59:59Z&page=1&per_page=50"
```

### 7.4 Requête d'exemple - Filtrage par utilisateur

```bash
curl -X GET "http://localhost:8000/api/events?user_id=ct_456&page=1&per_page=20"
```

### 7.5 Réponse d'exemple - Succès

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "evt_123456789",
        "type": "notification",
        "titre": "Nouveau paiement reçu",
        "description": "Le client Dupont a effectué un paiement de 500€",
        "entity_type": "impaye",
        "entity_id": "imp_987654321",
        "read": 0,
        "by_marki": 1,
        "icon": "fa-bell",
        "metadata": "{\"montant\": 500, \"facture\": \"F-2024-001\"}",
        "created_at": "2024-01-15T14:30:00Z",
        "who": {
          "id": "ct_456",
          "nom": "Dupont",
          "prenom": "Jean",
          "email": "jean.dupont@example.com",
          "type": "client"
        }
      },
      {
        "id": "evt_987654321",
        "type": "alert",
        "titre": "Facture en retard",
        "description": "La facture F-2024-002 est en retard de 15 jours",
        "entity_type": "impaye",
        "entity_id": "imp_123456789",
        "read": 1,
        "by_marki": 1,
        "icon": "fa-exclamation-triangle",
        "metadata": "{\"jours_retard\": 15, \"montant\": 1250.50}",
        "created_at": "2024-01-14T09:15:00Z",
        "who": {
          "id": "ct_789",
          "nom": "Martin",
          "prenom": "Sophie",
          "email": "sophie.martin@example.com",
          "type": "client"
        }
      },
      {
        "id": "evt_555666777",
        "type": "reminder",
        "titre": "Relance automatique envoyée",
        "description": "Email de relance envoyé pour la facture F-2024-003",
        "entity_type": "relance",
        "entity_id": "rel_111222333",
        "read": 0,
        "by_marki": 1,
        "icon": "fa-paper-plane",
        "metadata": "{\"email_id\": \"em_444555666\", \"template\": \"relance_j7\"}",
        "created_at": "2024-01-13T16:45:00Z",
        "who": null
      }
    ],
    "pagination": {
      "page": 1,
      "per_page": 20,
      "total": 156,
      "total_pages": 8,
      "has_next": true,
      "has_prev": false
    },
    "filters_applied": {
      "type": null,
      "search": null,
      "date_start": null,
      "date_end": null,
      "user_id": null,
      "read": null,
      "by_marki": null,
      "sort_by": "created_at",
      "sort_order": "desc"
    }
  }
}
```

### 7.6 Réponse d'exemple - Erreur 400 (paramètre invalide)

```json
{
  "success": false,
  "error": "Champ de tri invalide",
  "message": "Valeurs autorisées: created_at, titre"
}
```

### 7.7 Réponse d'exemple - Erreur 404 (contact inexistant)

```json
{
  "success": false,
  "error": "Contact non trouvé",
  "message": "L'identifiant utilisateur fourni n'existe pas: ct_inexistant"
}
```

---

## 8. Notes d'implémentation

### 8.1 Connexion à la base de données

```python
import sqlite3
from contextlib import contextmanager

DATABASE_PATH = "app/data/marki.db"

@contextmanager
def get_db_connection():
    """Context manager pour les connexions SQLite"""
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row  # Permet l'accès par nom de colonne
    try:
        yield conn
    finally:
        conn.close()
```

### 8.2 Construction dynamique de la requête

```python
def build_event_list_query(params: dict) -> tuple:
    """
    Construit la requête SQL avec filtres dynamiques.
    Retourne: (query_string, parameters_dict)
    """
    conditions = ["1=1"]
    query_params = {}
    
    if params.get('type') and params['type'] != 'all':
        conditions.append("e.type = :type")
        query_params['type'] = params['type']
    
    if params.get('search'):
        conditions.append("(LOWER(e.titre) LIKE :search OR LOWER(e.description) LIKE :search)")
        query_params['search'] = f"%{params['search'].lower()}%"
    
    if params.get('date_start'):
        conditions.append("e.created_at >= :date_start")
        query_params['date_start'] = params['date_start']
    
    if params.get('date_end'):
        conditions.append("e.created_at <= :date_end")
        query_params['date_end'] = params['date_end']
    
    if params.get('user_id'):
        conditions.append("e.who_id = :user_id")
        query_params['user_id'] = params['user_id']
    
    if params.get('read') is not None:
        conditions.append("e.read = :read")
        query_params['read'] = params['read']
    
    if params.get('by_marki') is not None:
        conditions.append("e.by_marki = :by_marki")
        query_params['by_marki'] = params['by_marki']
    
    # Construction de la requête
    where_clause = " AND ".join(conditions)
    
    return where_clause, query_params
```

### 8.3 Transformation des résultats

```python
def row_to_event_dict(row: sqlite3.Row) -> dict:
    """Transforme une ligne SQL en dictionnaire EventItem"""
    event = {
        "id": row["id"],
        "type": row["type"],
        "titre": row["titre"],
        "description": row["description"],
        "entity_type": row["entity_type"],
        "entity_id": row["entity_id"],
        "read": row["read"],
        "by_marki": row["by_marki"],
        "icon": row["icon"] or "fa-bell",
        "metadata": row["metadata"],
        "created_at": row["created_at"],
        "who": None
    }
    
    # Construction du contact associé si présent
    if row["who_id"] and row["contact_nom"] is not None:
        event["who"] = {
            "id": row["who_id"],
            "nom": row["contact_nom"],
            "prenom": row["contact_prenom"],
            "email": row["contact_email"],
            "type": row["contact_type"]
        }
    
    return event
```

---

## 9. Index recommandés

Pour optimiser les performances de cet endpoint, les index suivants sont recommandés sur la table `events`:

```sql
-- Index sur les champs fréquemment filtrés
CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at);
CREATE INDEX IF NOT EXISTS idx_events_who_id ON events(who_id);
CREATE INDEX IF NOT EXISTS idx_events_read ON events(read);
CREATE INDEX IF NOT EXISTS idx_events_by_marki ON events(by_marki);

-- Index composite pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_events_type_created_at ON events(type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_read_created_at ON events(read, created_at DESC);
```

---

## 10. Checkpoints de validation

| Checkpoint | Description |
|------------|-------------|
| `@checkpoint 1` | La route `/api/events` répond en moins de 500ms pour 100 événements |
| `@checkpoint 2` | Les filtres par type, date, read, by_marki fonctionnent correctement |
| `@checkpoint 3` | La recherche textuelle fonctionne sur titre ET description (case-insensitive) |
| `@checkpoint 4` | La pagination retourne les métadonnées correctes (total, has_next, has_prev) |
| `@checkpoint 5` | La jointure avec contacts retourne NULL pour who si contact inexistant/supprimé |
| `@checkpoint 6` | Le tri par created_at et titre fonctionne en asc et desc |
| `@checkpoint 7` | La validation retourne 400 pour les paramètres invalides |
| `@checkpoint 8` | Le champ metadata est retourné tel quel (string JSON) sans parsing |

---

## 11. Dépendances

Ce workflow dépend de :
- **Table `events`** - Source principale des données
- **Table `contacts`** - Pour la jointure sur `who_id`
- **FastAPI** - Framework API
- **Pydantic** - Validation des données
- **SQLite3** - Base de données

---

*Document généré pour l'écran: "evenements" - Workflow Frontend: "filter-all"*
*Date: 2024*
*Version: 1.0*
