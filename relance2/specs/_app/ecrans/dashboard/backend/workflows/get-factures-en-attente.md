```markdown
---
id: WF-BE-001-get-factures-en-attente
type: backend
folder: specs/_app/backend/workflows/get-factures-en-attente/
description: Récupère les factures impayées avec reste à payer > 0 pour le KPI dashboard.
justification: Accès direct SQLite requis pour filtrer reste_a_payer > 0 et calculer le total côté serveur.
---

# get-factures-en-attente : Récupération factures en attente

## Objectifs

Ce workflow backend expose une route API REST pour récupérer la liste des factures impayées (table `impayes`) avec un reste à payer supérieur à 0. Il fournit :
- Le décompte total des factures en attente (pour le KPI)
- Les données paginées pour affichage éventuel
- La sélection de champs spécifiques pour optimiser la payload

## Route API

| Propriété | Valeur |
|-----------|--------|
| **Méthode** | `GET` |
| **Endpoint** | `/api/factures` |
| **Fichier d'implémentation** | `app/routers/factures.py` |
| **Base de données** | `app/data/marki.db` |

## Paramètres de requête

| Paramètre | Type | Obligatoire | Défaut | Description |
|-----------|------|-------------|--------|-------------|
| `reste_a_payer_gt` | `float` | Non | `0` | Filtre: reste à payer > valeur |
| `fields` | `string` | Non | `id,nfacture,reste_a_payer` | Champs à retourner (séparés par virgule) |
| `limit` | `int` | Non | `50` | Nombre max de résultats (max: 1000) |
| `offset` | `int` | Non | `0` | Offset pour pagination |

## Requêtes SQL

### Étape 1: Compter le total de factures en attente

```sql
SELECT COUNT(*) as total
FROM impayes
WHERE reste_a_payer > :reste_a_payer_gt
```

### Étape 2: Récupérer les factures paginées

```sql
SELECT 
    id,
    nfacture,
    reste_a_payer,
    date_facture,
    date_echeance,
    montant_ttc,
    statut,
    payeur_nom,
    payeur_prenom,
    payeur_email,
    contact_relance_id,
    created_at
FROM impayes
WHERE reste_a_payer > :reste_a_payer_gt
ORDER BY date_echeance ASC, created_at DESC
LIMIT :limit OFFSET :offset
```

### Étape 3 (cas erreur): Vérifier l'existence de la table

```sql
SELECT name FROM sqlite_master 
WHERE type='table' AND name='impayes'
```

## Modèles Pydantic

### Requête (Query Parameters)

```python
from fastapi import Query
from typing import Optional

class FacturesQueryParams:
    """Paramètres de requête pour /api/factures"""
    
    reste_a_payer_gt: float = Query(
        default=0.0,
        ge=0,
        description="Filtrer les factures avec reste à payer supérieur à cette valeur"
    )
    
    fields: str = Query(
        default="id,nfacture,reste_a_payer",
        description="Champs à retourner, séparés par virgule"
    )
    
    limit: int = Query(
        default=50,
        ge=1,
        le=1000,
        description="Nombre maximum de résultats"
    )
    
    offset: int = Query(
        default=0,
        ge=0,
        description="Offset pour la pagination"
    )
```

### Réponse (Response Model)

```python
from pydantic import BaseModel, Field
from typing import List, Optional

class FactureItem(BaseModel):
    """Modèle d'une facture en attente"""
    id: str = Field(..., description="UUID de la facture")
    nfacture: str = Field(..., description="Numéro de facture")
    reste_a_payer: float = Field(..., ge=0, description="Montant restant à payer")
    
    # Champs optionnels selon sélection
    date_facture: Optional[str] = Field(None, description="Date de facture (ISO 8601)")
    date_echeance: Optional[str] = Field(None, description="Date d'échéance (ISO 8601)")
    montant_ttc: Optional[float] = Field(None, description="Montant TTC total")
    statut: Optional[str] = Field(None, description="Statut de la facture")
    payeur_nom: Optional[str] = Field(None, description="Nom du payeur")
    payeur_prenom: Optional[str] = Field(None, description="Prénom du payeur")
    payeur_email: Optional[str] = Field(None, description="Email du payeur")
    contact_relance_id: Optional[str] = Field(None, description="ID contact pour relance")

class FacturesMeta(BaseModel):
    """Métadonnées de pagination"""
    total: int = Field(..., ge=0, description="Nombre total de factures en attente")
    limit: int = Field(..., ge=1, description="Limite appliquée")
    offset: int = Field(..., ge=0, description="Offset appliqué")

class FacturesResponse(BaseModel):
    """Réponse complète de l'endpoint /api/factures"""
    data: List[FactureItem] = Field(default_factory=list, description="Liste des factures")
    meta: FacturesMeta = Field(..., description="Métadonnées de pagination")
```

## Gestion des erreurs

| Code HTTP | Situation | Message retourné |
|-----------|-----------|------------------|
| `200` | Succès (même si liste vide) | `{ "data": [], "meta": {...} }` |
| `500` | Erreur base de données | `{"detail": "Database error"}` |
| `503` | Database busy après retries | `{"detail": "Service temporarily unavailable"}` |

### Exceptions métier

```python
from fastapi import HTTPException

# Database busy - retry avec backoff
DB_BUSY_RETRIES = 3
DB_BUSY_DELAY = 0.1  # secondes

# Erreurs possibles:
# - sqlite3.OperationalError: database is locked
# - sqlite3.DatabaseError: table impayes does not exist
# - sqlite3.OperationalError: no such column: reste_a_payer

class DatabaseUnavailable(HTTPException):
    def __init__(self):
        super().__init__(
            status_code=503,
            detail="Service temporarily unavailable - database busy"
        )
```

## Logique d'implémentation

```python
import sqlite3
import time
from typing import List, Dict, Any

# Champs valides de la table impayes (pour validation du paramètre fields)
VALID_FIELDS = {
    'id', 'nfacture', 'reste_a_payer', 'date_facture', 'date_echeance',
    'montant_ttc', 'statut', 'payeur_nom', 'payeur_prenom', 'payeur_email',
    'contact_relance_id', 'created_at', 'updated_at', 'date_piece',
    'total_ht', 'reference', 'payer_id', 'proprietaire_id'
}

def get_factures_en_attente(
    db_path: str,
    reste_a_payer_gt: float = 0.0,
    fields: str = "id,nfacture,reste_a_payer",
    limit: int = 50,
    offset: int = 0
) -> Dict[str, Any]:
    """
    Récupère les factures avec reste à payer > valeur donnée.
    
    Returns:
        {
            "data": [...],
            "meta": {
                "total": int,
                "limit": int,
                "offset": int
            }
        }
    """
    
    # 1. Valider et filtrer les champs demandés
    requested_fields = [f.strip() for f in fields.split(',')]
    allowed_fields = [f for f in requested_fields if f in VALID_FIELDS]
    if not allowed_fields:
        allowed_fields = ['id', 'nfacture', 'reste_a_payer']
    
    # 2. Construire la requête avec les champs sélectionnés
    select_fields = ', '.join(allowed_fields)
    
    # 3. Connexion avec retry pour database locked
    conn = None
    last_error = None
    
    for attempt in range(DB_BUSY_RETRIES):
        try:
            conn = sqlite3.connect(db_path, timeout=5.0)
            conn.row_factory = sqlite3.Row
            break
        except sqlite3.OperationalError as e:
            last_error = e
            if "locked" in str(e).lower():
                time.sleep(DB_BUSY_DELAY * (attempt + 1))
            else:
                raise DatabaseUnavailable()
    
    if conn is None:
        raise DatabaseUnavailable()
    
    try:
        cursor = conn.cursor()
        
        # 4. Récupérer le total
        cursor.execute("""
            SELECT COUNT(*) as total
            FROM impayes
            WHERE reste_a_payer > ?
        """, (reste_a_payer_gt,))
        
        total = cursor.fetchone()['total']
        
        # 5. Récupérer les données paginées
        # Si aucun résultat, retourner liste vide (pas d'erreur)
        if total == 0:
            return {
                "data": [],
                "meta": {
                    "total": 0,
                    "limit": limit,
                    "offset": offset
                }
            }
        
        query = f"""
            SELECT {select_fields}
            FROM impayes
            WHERE reste_a_payer > ?
            ORDER BY date_echeance ASC, created_at DESC
            LIMIT ? OFFSET ?
        """
        
        cursor.execute(query, (reste_a_payer_gt, limit, offset))
        rows = cursor.fetchall()
        
        # 6. Construire la réponse
        data = [dict(row) for row in rows]
        
        return {
            "data": data,
            "meta": {
                "total": total,
                "limit": limit,
                "offset": offset
            }
        }
        
    except sqlite3.OperationalError as e:
        if "no such column" in str(e).lower():
            # Erreur de schéma - remonter en 500
            raise HTTPException(status_code=500, detail=f"Schema error: {e}")
        raise DatabaseUnavailable()
        
    finally:
        if conn:
            conn.close()
```

## Exemples de requêtes et réponses

### Exemple 1: Requête basique (KPI dashboard)

**Requête:**
```http
GET /api/factures?reste_a_payer_gt=0&limit=10 HTTP/1.1
Host: localhost:8000
Accept: application/json
```

**Réponse:**
```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "nfacture": "F-2024-001",
      "reste_a_payer": 1500.00
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "nfacture": "F-2024-002",
      "reste_a_payer": 3200.50
    }
  ],
  "meta": {
    "total": 45,
    "limit": 10,
    "offset": 0
  }
}
```

### Exemple 2: Sélection de champs spécifiques

**Requête:**
```http
GET /api/factures?fields=id,nfacture,reste_a_payer,date_echeance,payeur_nom&limit=5 HTTP/1.1
```

**Réponse:**
```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "nfacture": "F-2024-001",
      "reste_a_payer": 1500.00,
      "date_echeance": "2024-03-15",
      "payeur_nom": "DUPONT"
    }
  ],
  "meta": {
    "total": 45,
    "limit": 5,
    "offset": 0
  }
}
```

### Exemple 3: Aucune facture en attente

**Requête:**
```http
GET /api/factures?reste_a_payer_gt=100000 HTTP/1.1
```

**Réponse (HTTP 200):**
```json
{
  "data": [],
  "meta": {
    "total": 0,
    "limit": 50,
    "offset": 0
  }
}
```

### Exemple 4: Pagination

**Requête:**
```http
GET /api/factures?limit=20&offset=40 HTTP/1.1
```

**Réponse:**
```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440010",
      "nfacture": "F-2024-011",
      "reste_a_payer": 850.00
    }
  ],
  "meta": {
    "total": 45,
    "limit": 20,
    "offset": 40
  }
}
```

### Exemple 5: Champs invalides (ignorés silencieusement)

**Requête:**
```http
GET /api/factures?fields=id,nfacture,champ_inexistant,reste_a_payer HTTP/1.1
```

**Réponse (champ_inexistant ignoré):**
```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "nfacture": "F-2024-001",
      "reste_a_payer": 1500.00
    }
  ],
  "meta": {
    "total": 45,
    "limit": 50,
    "offset": 0
  }
}
```

## Dépendances

| Dépendance | Usage |
|------------|-------|
| `sqlite3` | Connexion base de données |
| `fastapi` | Framework API |
| `pydantic` | Validation des modèles |

## Points de vigilance

1. **Protection injection SQL**: Utilisation de paramètres `?` pour toutes les valeurs
2. **Sélection des champs**: Validation stricte du paramètre `fields` contre `VALID_FIELDS`
3. **Database locking**: Retry avec backoff exponentiel en cas de base verrouillée
4. **Fuite de connexions**: Utilisation systématique de `finally conn.close()`
5. **Typage**: Les champs SQLite `REAL` sont mappés vers `float` Python
6. **Dates**: Stockées en format ISO 8601 (TEXT) dans SQLite, retournées telles quelles
```
