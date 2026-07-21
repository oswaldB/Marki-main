```markdown
# Workflow Backend: Stats Évolution Impayés

## Titre
Calcul des statistiques d'évolution des impayés sur 12 mois glissants

## Objectifs
Ce workflow fournit les données agrégées pour alimenter un graphique Chart.js montrant l'évolution des impayés sur une période de 12 mois glissants. Il calcule :
- Les montants payés par mois (montant_ttc - reste_a_payer)
- Les restes à payer par mois
- Le nombre de factures impayées par mois
- Une colonne "Avant" pour les factures antérieures à la période analysée

Les calculs sont effectués côté serveur via des requêtes SQL optimisées pour minimiser le transfert de données et la charge de traitement côté client.

---

## Route API

| Attribut | Valeur |
|----------|--------|
| **Méthode** | GET |
| **Endpoint** | `/api/stats/evolution-impayes` |
| **Authentification** | Requise (Bearer Token) |
| **Content-Type** | application/json |

---

## Paramètres de Requête (Query Parameters)

| Paramètre | Type | Requis | Défaut | Description |
|-----------|------|--------|--------|-------------|
| `mois` | integer | Non | 12 | Nombre de mois glissants à analyser (1-24) |
| `date_fin` | string (ISO 8601) | Non | Aujourd'hui | Date de fin de la période (YYYY-MM-DD) |
| `include_avant` | boolean | Non | true | Inclure les factures antérieures à la période |

---

## Modèles Pydantic

### Requête (Query Parameters)

```python
from pydantic import BaseModel, Field, validator
from typing import Optional
from datetime import date

class EvolutionImpayesRequest(BaseModel):
    mois: Optional[int] = Field(
        default=12,
        ge=1,
        le=24,
        description="Nombre de mois glissants à analyser (1-24)"
    )
    date_fin: Optional[str] = Field(
        default=None,
        description="Date de fin ISO 8601 (YYYY-MM-DD). Défaut: aujourd'hui"
    )
    include_avant: Optional[bool] = Field(
        default=True,
        description="Inclure les factures antérieures à la période"
    )
    
    @validator('date_fin')
    def validate_date_format(cls, v):
        if v is None:
            return v
        try:
            date.fromisoformat(v)
            return v
        except ValueError:
            raise ValueError("Format de date invalide. Utiliser YYYY-MM-DD")
```

### Réponse

```python
from pydantic import BaseModel, Field
from typing import List, Dict

class PeriodeInfo(BaseModel):
    debut: str = Field(..., description="Date de début de la période (ISO 8601)")
    fin: str = Field(..., description="Date de fin de la période (ISO 8601)")

class EvolutionDatasets(BaseModel):
    montantsPayes: List[float] = Field(..., description="Montants payés par mois")
    restesAPayer: List[float] = Field(..., description="Restes à payer par mois")
    facturesImpayees: List[int] = Field(..., description="Nombre de factures impayées par mois")

class EvolutionData(BaseModel):
    labels: List[str] = Field(..., description="Labels des mois ['Avant', 'Jan', 'Fév', ...]")
    datasets: EvolutionDatasets
    periode: PeriodeInfo

class EvolutionImpayesResponse(BaseModel):
    data: EvolutionData
```

### Erreur

```python
from pydantic import BaseModel

class ErrorResponse(BaseModel):
    error: str
    message: str
    code: int
```

---

## Requêtes SQL

### Requête principale - Agrégation par mois

```sql
WITH params AS (
    -- Paramètres de la requête
    SELECT 
        COALESCE(:date_fin, DATE('now')) as date_fin_param,
        :nb_mois as nb_mois_param
),
date_range AS (
    -- Calcul de la plage de dates
    SELECT 
        DATE(DATE('now', '-' || (SELECT nb_mois_param FROM params) || ' months'), 'start of month') as date_debut,
        (SELECT date_fin_param FROM params) as date_fin
),
months AS (
    -- Génération des 12 mois + "Avant"
    SELECT 
        CASE 
            WHEN month_idx = -1 THEN 'Avant'
            ELSE substr('00' || CAST(strftime('%m', DATE(date_debut, '+' || month_idx || ' months')) AS INTEGER), -2)
        END as month_num,
        CASE 
            WHEN month_idx = -1 THEN 'Avant'
            ELSE CASE CAST(strftime('%m', DATE(date_debut, '+' || month_idx || ' months')) AS INTEGER)
                WHEN 1 THEN 'Jan'
                WHEN 2 THEN 'Fév'
                WHEN 3 THEN 'Mar'
                WHEN 4 THEN 'Avr'
                WHEN 5 THEN 'Mai'
                WHEN 6 THEN 'Juin'
                WHEN 7 THEN 'Juil'
                WHEN 8 THEN 'Août'
                WHEN 9 THEN 'Sept'
                WHEN 10 THEN 'Oct'
                WHEN 11 THEN 'Nov'
                WHEN 12 THEN 'Déc'
            END
        END as month_label,
        CASE 
            WHEN month_idx = -1 THEN DATE('0001-01-01')  -- Date fictive pour "Avant"
            ELSE DATE(date_debut, '+' || month_idx || ' months')
        END as month_start,
        CASE 
            WHEN month_idx = -1 THEN DATE(date_debut, '-1 day')  -- Avant la période
            ELSE DATE(DATE(date_debut, '+' || (month_idx + 1) || ' months'), '-1 day')
        END as month_end,
        month_idx + 1 as sort_order
    FROM date_range, (
        SELECT -1 as month_idx UNION ALL
        SELECT 0 UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL
        SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL
        SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10 UNION ALL SELECT 11
    )
    WHERE month_idx = -1 OR month_idx < (SELECT nb_mois_param FROM params)
),
factures_stats AS (
    -- Calcul des statistiques par facture
    SELECT 
        i.id,
        i.date_facture,
        COALESCE(i.montant_ttc, 0) as montant_ttc,
        COALESCE(i.reste_a_payer, 0) as reste_a_payer,
        COALESCE(i.montant_ttc, 0) - COALESCE(i.reste_a_payer, 0) as montant_paye,
        CASE 
            WHEN COALESCE(i.reste_a_payer, 0) > 0 THEN 1 
            ELSE 0 
        END as est_impayee,
        CASE 
            WHEN i.date_facture < (SELECT date_debut FROM date_range) THEN 'Avant'
            ELSE strftime('%m', i.date_facture)
        END as mois_facture
    FROM impayes i
    WHERE i.date_facture IS NOT NULL
        AND i.date_facture <= (SELECT date_fin FROM date_range)
        AND (i.facture_soldee = 0 OR i.facture_soldee IS NULL)
),
stats_by_month AS (
    -- Agrégation par mois
    SELECT 
        COALESCE(f.mois_facture, '00') as mois_key,
        COALESCE(SUM(f.montant_paye), 0) as total_montant_paye,
        COALESCE(SUM(f.reste_a_payer), 0) as total_reste_a_payer,
        COALESCE(SUM(f.est_impayee), 0) as nb_factures_impayees
    FROM months m
    LEFT JOIN factures_stats f ON (
        CASE 
            WHEN m.month_label = 'Avant' THEN f.date_facture < (SELECT date_debut FROM date_range)
            ELSE strftime('%Y-%m', f.date_facture) = strftime('%Y-%m', m.month_start)
        END
    )
    GROUP BY m.month_label, m.sort_order
    ORDER BY m.sort_order
)
SELECT 
    m.month_label as label,
    COALESCE(s.total_montant_paye, 0) as montantsPayes,
    COALESCE(s.total_reste_a_payer, 0) as restesAPayer,
    COALESCE(CAST(s.nb_factures_impayees AS INTEGER), 0) as facturesImpayees
FROM months m
LEFT JOIN stats_by_month s ON (
    CASE 
        WHEN m.month_label = 'Avant' THEN s.mois_key = 'Avant'
        ELSE s.mois_key = m.month_num
    END
)
ORDER BY m.sort_order;
```

### Paramètres SQL

| Paramètre | Type | Description |
|-------------|------|-------------|
| `:date_fin` | TEXT | Date de fin au format YYYY-MM-DD |
| `:nb_mois` | INTEGER | Nombre de mois à analyser (défaut: 12) |

---

## Implémentation FastAPI

```python
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
from datetime import date, datetime
import sqlite3
import os

router = APIRouter(prefix="/api/stats", tags=["statistics"])
security = HTTPBearer()

DATABASE_PATH = "app/data/marki.db"

def get_db_connection():
    """Crée une connexion à la base de données SQLite."""
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Vérifie le token JWT (à implémenter selon votre auth)."""
    # TODO: Implémenter la vérification du token
    return credentials.credentials

@router.get("/evolution-impayes", response_model=EvolutionImpayesResponse)
async def get_evolution_impayes(
    mois: Optional[int] = Query(default=12, ge=1, le=24),
    date_fin: Optional[str] = Query(default=None),
    include_avant: Optional[bool] = Query(default=True),
    token: str = Depends(verify_token)
):
    """
    Retourne les statistiques d'évolution des impayés sur N mois glissants.
    
    - **mois**: Nombre de mois à analyser (1-24, défaut: 12)
    - **date_fin**: Date de fin au format YYYY-MM-DD (défaut: aujourd'hui)
    - **include_avant**: Inclure les factures antérieures à la période
    """
    
    # Validation de la date
    date_fin_parsed = None
    if date_fin:
        try:
            date_fin_parsed = date.fromisoformat(date_fin)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail="Format de date invalide. Utiliser YYYY-MM-DD"
            )
    
    # Calcul de la période
    if date_fin_parsed:
        date_fin_str = date_fin_parsed.isoformat()
    else:
        date_fin_str = date.today().isoformat()
    
    date_debut = date_fin_parsed or date.today()
    date_debut = date_debut.replace(day=1)
    for _ in range(mois):
        if date_debut.month == 1:
            date_debut = date_debut.replace(year=date_debut.year - 1, month=12)
        else:
            date_debut = date_debut.replace(month=date_debut.month - 1)
    
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        
        # Requête SQL simplifiée
        query = """
        WITH date_range AS (
            SELECT 
                ? as date_fin,
                ? as date_debut
        ),
        months AS (
            SELECT 
                CASE 
                    WHEN month_idx = -1 THEN 'Avant'
                    ELSE CASE CAST(strftime('%m', DATE(date_debut, '+' || month_idx || ' months')) AS INTEGER)
                        WHEN 1 THEN 'Jan' WHEN 2 THEN 'Fév' WHEN 3 THEN 'Mar'
                        WHEN 4 THEN 'Avr' WHEN 5 THEN 'Mai' WHEN 6 THEN 'Juin'
                        WHEN 7 THEN 'Juil' WHEN 8 THEN 'Août' WHEN 9 THEN 'Sept'
                        WHEN 10 THEN 'Oct' WHEN 11 THEN 'Nov' WHEN 12 THEN 'Déc'
                    END
                END as month_label,
                CASE 
                    WHEN month_idx = -1 THEN DATE('0001-01-01')
                    ELSE DATE(date_debut, '+' || month_idx || ' months')
                END as month_start,
                CASE 
                    WHEN month_idx = -1 THEN DATE(date_debut, '-1 day')
                    ELSE DATE(DATE(date_debut, '+' || (month_idx + 1) || ' months'), '-1 day')
                END as month_end,
                month_idx + 1 as sort_order
            FROM date_range, (
                SELECT -1 as month_idx UNION ALL
                SELECT 0 UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL
                SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL
                SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10 UNION ALL SELECT 11
            )
            WHERE month_idx = -1 OR month_idx < ?
        )
        SELECT 
            m.month_label,
            COALESCE(SUM(
                CASE 
                    WHEN i.date_facture IS NOT NULL 
                    AND (i.facture_soldee = 0 OR i.facture_soldee IS NULL)
                    AND (
                        (m.month_label = 'Avant' AND i.date_facture < m.month_end)
                        OR (m.month_label != 'Avant' AND i.date_facture >= m.month_start AND i.date_facture <= m.month_end)
                    )
                    THEN COALESCE(i.montant_ttc, 0) - COALESCE(i.reste_a_payer, 0)
                    ELSE 0
                END
            ), 0) as montantsPayes,
            COALESCE(SUM(
                CASE 
                    WHEN i.date_facture IS NOT NULL 
                    AND (i.facture_soldee = 0 OR i.facture_soldee IS NULL)
                    AND (
                        (m.month_label = 'Avant' AND i.date_facture < m.month_end)
                        OR (m.month_label != 'Avant' AND i.date_facture >= m.month_start AND i.date_facture <= m.month_end)
                    )
                    THEN COALESCE(i.reste_a_payer, 0)
                    ELSE 0
                END
            ), 0) as restesAPayer,
            COALESCE(SUM(
                CASE 
                    WHEN i.date_facture IS NOT NULL 
                    AND (i.facture_soldee = 0 OR i.facture_soldee IS NULL)
                    AND COALESCE(i.reste_a_payer, 0) > 0
                    AND (
                        (m.month_label = 'Avant' AND i.date_facture < m.month_end)
                        OR (m.month_label != 'Avant' AND i.date_facture >= m.month_start AND i.date_facture <= m.month_end)
                    )
                    THEN 1
                    ELSE 0
                END
            ), 0) as facturesImpayees
        FROM months m
        LEFT JOIN impayes i ON (
            i.date_facture IS NOT NULL 
            AND i.date_facture <= (SELECT date_fin FROM date_range)
            AND ((m.month_label = 'Avant' AND i.date_facture < (SELECT date_debut FROM date_range))
                 OR strftime('%Y-%m', i.date_facture) = strftime('%Y-%m', m.month_start))
        )
        GROUP BY m.month_label, m.sort_order
        ORDER BY m.sort_order
        """
        
        cursor.execute(query, (date_fin_str, date_debut.isoformat(), mois))
        rows = cursor.fetchall()
        
        # Construction de la réponse
        labels = []
        montants_payes = []
        restes_a_payer = []
        factures_impayees = []
        
        for row in rows:
            if not include_avant and row['month_label'] == 'Avant':
                continue
            labels.append(row['month_label'])
            montants_payes.append(float(row['montantsPayes']))
            restes_a_payer.append(float(row['restesAPayer']))
            factures_impayees.append(int(row['facturesImpayees']))
        
        return {
            "data": {
                "labels": labels,
                "datasets": {
                    "montantsPayes": montants_payes,
                    "restesAPayer": restes_a_payer,
                    "facturesImpayees": factures_impayees
                },
                "periode": {
                    "debut": date_debut.isoformat(),
                    "fin": date_fin_str
                }
            }
        }
        
    except sqlite3.Error as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erreur base de données: {str(e)}"
        )
    finally:
        conn.close()
```

---

## Gestion des Erreurs

| Code HTTP | Cas | Message |
|-----------|-----|---------|
| **200** | Succès | Données retournées |
| **400** | Date invalide | `{"error": "INVALID_DATE", "message": "Format de date invalide. Utiliser YYYY-MM-DD", "code": 400}` |
| **401** | Token manquant ou invalide | `{"error": "UNAUTHORIZED", "message": "Token d'authentification requis", "code": 401}` |
| **500** | Erreur base de données | `{"error": "DATABASE_ERROR", "message": "Erreur lors de l'accès aux données", "code": 500}` |

---

## Exemples

### Requête d'exemple

```bash
curl -X GET "http://localhost:8000/api/stats/evolution-impayes?mois=12&date_fin=2024-01-15&include_avant=true" \
  -H "Authorization: Bearer <token>"
```

### Réponse d'exemple (Succès - 200)

```json
{
  "data": {
    "labels": ["Avant", "Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sept", "Oct", "Nov", "Déc"],
    "datasets": {
      "montantsPayes": [45000.0, 52000.0, 48000.0, 61000.0, 55000.0, 58000.0, 62000.0, 59000.0, 65000.0, 70000.0, 68000.0, 72000.0, 75000.0],
      "restesAPayer": [28000.0, 32000.0, 35000.0, 42000.0, 38000.0, 41000.0, 39000.0, 43000.0, 47000.0, 52000.0, 48000.0, 51000.0, 49000.0],
      "facturesImpayees": [12, 15, 18, 22, 19, 21, 20, 23, 25, 28, 26, 27, 24]
    },
    "periode": {
      "debut": "2023-01-01",
      "fin": "2024-01-15"
    }
  }
}
```

### Réponse d'exemple (Aucune facture - 200)

```json
{
  "data": {
    "labels": ["Avant", "Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sept", "Oct", "Nov", "Déc"],
    "datasets": {
      "montantsPayes": [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
      "restesAPayer": [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
      "facturesImpayees": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    },
    "periode": {
      "debut": "2023-01-01",
      "fin": "2024-01-15"
    }
  }
}
```

### Réponse d'erreur (Date invalide - 400)

```json
{
  "error": "INVALID_DATE",
  "message": "Format de date invalide. Utiliser YYYY-MM-DD",
  "code": 400
}
```

### Réponse d'erreur (Non authentifié - 401)

```json
{
  "error": "UNAUTHORIZED",
  "message": "Token d'authentification requis ou invalide",
  "code": 401
}
```

---

## Notes d'implémentation

1. **Performance**: La requête utilise des index implicites sur `date_facture`. Pour de meilleures performances avec un grand volume, créer un index:
   ```sql
   CREATE INDEX IF NOT EXISTS idx_impayes_date_facture ON impayes(date_facture);
   ```

2. **Montants NULL**: Les valeurs NULL dans `montant_ttc` et `reste_a_payer` sont traitées comme 0 via `COALESCE`.

3. **Factures soldées**: Les factures avec `facture_soldee = 1` sont exclues des calculs.

4. **Timezone**: Les dates sont traitées en UTC. Adapter si nécessaire pour le fuseau horaire local.

5. **Pagination**: Non applicable car le résultat est toujours de taille fixe (12-13 mois + "Avant").
```
