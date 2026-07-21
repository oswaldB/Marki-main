```markdown
# Workflow Backend: events-list

## 1. Objectifs

Ce workflow backend fournit une API pour récupérer la liste des événements récents stockés dans la base de données SQLite. Il supporte la pagination et le tri par date de création. Les événements sont persistés côté serveur et exposés au frontend "events-manager" de l'écran dashboard.

**Points clés:**
- Lecture seule de la table `events`
- Jointure optionnelle avec `users` pour récupérer le username
- L'état `read` (lu/non-lu) n'est PAS géré par ce workflow (géré en localStorage frontend)
- Pagination via `limit`/`offset`

---

## 2. Route API

| Attribut | Valeur |
|----------|--------|
| **Méthode HTTP** | GET |
| **Endpoint** | `/api/events` |
| **Authentification** | Requise (Bearer Token) |
| **Content-Type** | application/json |

---

## 3. Paramètres de Requête

| Paramètre | Type | Obligatoire | Défaut | Description |
|-------------|------|-------------|--------|-------------|
| `limit` | integer | Non | 20 | Nombre maximum d'événements à retourner (max: 100) |
| `offset` | integer | Non | 0 | Décalage pour la pagination |
| `order` | string | Non | `created_at.desc` | Ordre de tri, format: `colonne.direction` (asc/desc) |

**Colonnes valides pour le tri:** `created_at`, `type`, `titre`, `id`

---

## 4. Requêtes SQL

### 4.1 Requête principale (récupération des événements)

```sql
SELECT 
    e.id,
    e.type,
    e.titre,
    e.description,
    e.created_at,
    e.who_id,
    e.by_marki,
    e.icon,
    e.entity_type,
    e.entity_id,
    u.username as user_username
FROM events e
LEFT JOIN users u ON e.who_id = u.id
ORDER BY e.created_at DESC
LIMIT ? OFFSET ?;
```

### 4.2 Requête de comptage total

```sql
SELECT COUNT(*) as total FROM events;
```

### 4.3 Requête de validation de session (authentification)

```sql
SELECT s.user_id, s.expires_at, u.id, u.is_active
FROM sessions s
JOIN users u ON s.user_id = u.id
WHERE s.token = ? AND u.is_active = 1;
```

---

## 5. Modèles Pydantic

### 5.1 Modèle de requête (Query Parameters)

```python
from typing import Optional
from pydantic import BaseModel, Field, validator

class EventsListRequest(BaseModel):
    limit: Optional[int] = Field(default=20, ge=1, le=100)
    offset: Optional[int] = Field(default=0, ge=0)
    order: Optional[str] = Field(default="created_at.desc")
    
    @validator('order')
    def validate_order(cls, v):
        if not v:
            return "created_at.desc"
        
        parts = v.split('.')
        if len(parts) != 2:
            raise ValueError("Format attendu: colonne.direction")
        
        column, direction = parts
        valid_columns = ['created_at', 'type', 'titre', 'id']
        valid_directions = ['asc', 'desc']
        
        if column not in valid_columns:
            raise ValueError(f"Colonne invalide. Valeurs acceptées: {', '.join(valid_columns)}")
        
        if direction.lower() not in valid_directions:
            raise ValueError("Direction invalide. Valeurs acceptées: asc, desc")
        
        return f"{column} {direction.upper()}"
```

### 5.2 Modèle d'événement (Item de réponse)

```python
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class EventItem(BaseModel):
    id: str
    type: str
    title: str  # Mappé depuis 'titre' dans la DB
    description: Optional[str] = None
    created_at: datetime
    user_id: Optional[str] = None  # Mappé depuis 'who_id'
    user_username: Optional[str] = None
    by_marki: bool
    icon: str = "fa-bell"
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }
```

### 5.3 Métadonnées de pagination

```python
from pydantic import BaseModel

class EventsMeta(BaseModel):
    total: int
    limit: int
    offset: int
```

### 5.4 Réponse complète

```python
from typing import List
from pydantic import BaseModel

class EventsListResponse(BaseModel):
    data: List[EventItem]
    meta: EventsMeta
```

### 5.5 Modèles d'erreur

```python
from pydantic import BaseModel

class ErrorResponse(BaseModel):
    error: str
    message: str
```

---

## 6. Gestion des Erreurs

| Code HTTP | Cas | Message |
|-----------|-----|---------|
| **401** | Token manquant ou invalide | `{"error": "unauthorized", "message": "Session invalide ou expirée"}` |
| **422** | Paramètres de requête invalides | `{"error": "validation_error", "message": "Détails du champ invalide"}` |
| **500** | Erreur base de données | `{"error": "internal_error", "message": "Erreur lors de la récupération des événements"}` |

---

## 7. Logique de Mapping

| Champ DB (events) | Champ API Response | Transformation |
|-------------------|-------------------|----------------|
| `id` | `id` | Direct |
| `type` | `type` | Direct |
| `titre` | `title` | Renommé |
| `description` | `description` | Direct (peut être null) |
| `created_at` | `created_at` | ISO 8601 string |
| `who_id` | `user_id` | Renommé |
| `by_marki` | `by_marki` | Integer (0/1) → Boolean |
| `icon` | `icon` | Direct (défaut: 'fa-bell') |
| `entity_type` | `entity_type` | Direct (peut être null) |
| `entity_id` | `entity_id` | Direct (peut être null) |
| `users.username` | `user_username` | Jointure LEFT JOIN |

---

## 8. Exemples

### 8.1 Requête HTTP

```http
GET /api/events?limit=10&offset=0&order=created_at.desc HTTP/1.1
Host: localhost:8000
Authorization: Bearer <session_token>
Accept: application/json
```

### 8.2 Réponse Succès (200 OK)

```json
{
  "data": [
    {
      "id": "evt-001",
      "type": "relance",
      "title": "Relance R2 envoyée",
      "description": "Relance niveau 2 envoyée à TechStart SARL pour facture NF-2024-001",
      "created_at": "2024-01-15T10:30:00Z",
      "user_id": "user-uuid-123",
      "user_username": "john.doe",
      "by_marki": true,
      "icon": "fa-bell",
      "entity_type": "relance",
      "entity_id": "rel-456"
    },
    {
      "id": "evt-002",
      "type": "paiement",
      "title": "Paiement reçu",
      "description": "Paiement de 1500.00 € reçu de Dupont SARL",
      "created_at": "2024-01-15T09:15:00Z",
      "user_id": null,
      "user_username": null,
      "by_marki": true,
      "icon": "fa-check-circle",
      "entity_type": "impaye",
      "entity_id": "imp-789"
    }
  ],
  "meta": {
    "total": 45,
    "limit": 10,
    "offset": 0
  }
}
```

### 8.3 Réponse Table Vide (200 OK)

```json
{
  "data": [],
  "meta": {
    "total": 0,
    "limit": 20,
    "offset": 0
  }
}
```

### 8.4 Réponse Erreur 401

```json
{
  "error": "unauthorized",
  "message": "Session invalide ou expirée"
}
```

### 8.5 Réponse Erreur 422 (Paramètres invalides)

```json
{
  "error": "validation_error",
  "message": "order: Colonne invalide. Valeurs acceptées: created_at, type, titre, id"
}
```

---

## 9. Implémentation FastAPI (Référence)

```python
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import JSONResponse
from typing import Optional
import sqlite3
from datetime import datetime

router = APIRouter()

DB_PATH = "app/data/marki.db"

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()

def verify_token(token: str, conn: sqlite3.Connection):
    cursor = conn.execute(
        """SELECT s.user_id, s.expires_at, u.is_active 
           FROM sessions s 
           JOIN users u ON s.user_id = u.id 
           WHERE s.token = ? AND u.is_active = 1""",
        (token,)
    )
    session = cursor.fetchone()
    
    if not session:
        return None
    
    # Vérifier expiration
    expires_at = datetime.fromisoformat(session['expires_at'])
    if datetime.now() > expires_at:
        return None
    
    return session['user_id']

@router.get("/api/events", response_model=EventsListResponse)
async def list_events(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    order: str = Query(default="created_at.desc"),
    authorization: Optional[str] = Header(None),
    db: sqlite3.Connection = Depends(get_db)
):
    # Vérifier authentification
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token manquant")
    
    token = authorization.replace("Bearer ", "")
    user_id = verify_token(token, db)
    
    if not user_id:
        raise HTTPException(status_code=401, detail="Session invalide ou expirée")
    
    # Valider et parser order
    try:
        parts = order.split('.')
        if len(parts) != 2:
            raise ValueError("Format invalide")
        
        column, direction = parts
        valid_columns = ['created_at', 'type', 'titre', 'id']
        valid_directions = ['asc', 'desc']
        
        if column not in valid_columns or direction.lower() not in valid_directions:
            raise ValueError("Colonne ou direction invalide")
        
        sql_order = f"e.{column} {direction.upper()}"
    except ValueError:
        raise HTTPException(status_code=422, detail="Paramètre order invalide")
    
    try:
        # Compter total
        total = db.execute("SELECT COUNT(*) as total FROM events").fetchone()['total']
        
        # Récupérer événements
        query = f"""
            SELECT 
                e.id,
                e.type,
                e.titre,
                e.description,
                e.created_at,
                e.who_id,
                e.by_marki,
                e.icon,
                e.entity_type,
                e.entity_id,
                u.username as user_username
            FROM events e
            LEFT JOIN users u ON e.who_id = u.id
            ORDER BY {sql_order}
            LIMIT ? OFFSET ?
        """
        
        cursor = db.execute(query, (limit, offset))
        rows = cursor.fetchall()
        
        # Mapper les résultats
        events = []
        for row in rows:
            events.append({
                "id": row['id'],
                "type": row['type'],
                "title": row['titre'],
                "description": row['description'],
                "created_at": row['created_at'],
                "user_id": row['who_id'],
                "user_username": row['user_username'],
                "by_marki": bool(row['by_marki']),
                "icon": row['icon'] or 'fa-bell',
                "entity_type": row['entity_type'],
                "entity_id": row['entity_id']
            })
        
        return {
            "data": events,
            "meta": {
                "total": total,
                "limit": limit,
                "offset": offset
            }
        }
        
    except sqlite3.Error as e:
        raise HTTPException(status_code=500, detail="Erreur lors de la récupération des événements")
```

---

## 10. Notes d'Implémentation

1. **Sécurité**: Toujours utiliser des requêtes paramétrées (`?`) pour éviter les injections SQL
2. **Performance**: La colonne `created_at` devrait avoir un index pour optimiser le tri
3. **Date/Heure**: Les timestamps sont stockés au format ISO 8601 en TEXT dans SQLite
4. **Boolean**: SQLite stocke les booléens comme INTEGER (0/1) - convertir en Python bool
5. **Jointure**: La jointure avec `users` est en LEFT JOIN car `who_id` peut être NULL
6. **Colonne `read`**: Cette colonne existe dans le schéma mais n'est PAS utilisée par ce workflow (gestion frontend uniquement)
```
