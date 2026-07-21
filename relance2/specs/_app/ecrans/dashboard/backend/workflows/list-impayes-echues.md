```markdown
# Workflow Backend: list-impayes-echues

## Objectifs

Ce workflow expose une route API FastAPI permettant de récupérer la liste des factures impayées dont la date d'échéance est dépassée. Il fournit les données nécessaires au calcul du KPI "impayés actifs" sur le dashboard.

**Fonctionnalités principales :**
- Filtrer les impayés par date d'échéance dépassée
- Filtrer par reste à payer supérieur à un seuil
- Filtrer optionnellement par statut
- Retourner les champs demandés avec pagination
- Calculer le nombre total de résultats pour les méta-données

---

## Route API

| Attribut | Valeur |
|----------|--------|
| **Méthode HTTP** | `GET` |
| **Endpoint** | `/api/impayes` |
| **Tags** | `impayes` |
| **Description** | Liste les impayés échus avec filtres et pagination |

---

## Paramètres Query

| Paramètre | Type | Requis | Défaut | Description |
|-----------|------|--------|--------|-------------|
| `date_echeance_lt` | `datetime` | Non | `None` | Date d'échéance strictement inférieure (ISO 8601) |
| `reste_a_payer_gt` | `float` | Non | `0.0` | Reste à payer strictement supérieur |
| `statut` | `str` | Non | `None` | Filtrer par statut (ex: `impaye`) |
| `fields` | `str` | Non | `id,nfacture,date_echeance,reste_a_payer` | Champs à retourner (séparés par virgule) |
| `limit` | `int` | Non | `1000` | Nombre maximum de résultats |
| `offset` | `int` | Non | `0` | Offset pour la pagination |

---

## Requêtes SQL

### 1. Requête principale (SELECT)

```sql
SELECT 
    id,
    nfacture,
    date_echeance,
    reste_a_payer
FROM impayes
WHERE 
    date_echeance < :date_echeance_lt
    AND reste_a_payer > :reste_a_payer_gt
    AND (:statut IS NULL OR statut = :statut)
ORDER BY date_echeance ASC
LIMIT :limit
OFFSET :offset;
```

**Paramètres bindés :**
- `:date_echeance_lt` → `filters.date_echeance_lt` ou `datetime.now(UTC).isoformat()`
- `:reste_a_payer_gt` → `filters.reste_a_payer_gt` (défaut: 0)
- `:statut` → `filters.statut` ou `None`
- `:limit` → `filters.limit`
- `:offset` → `filters.offset`

### 2. Requête COUNT (pour meta.total)

```sql
SELECT COUNT(*) as total
FROM impayes
WHERE 
    date_echeance < :date_echeance_lt
    AND reste_a_payer > :reste_a_payer_gt
    AND (:statut IS NULL OR statut = :statut);
```

### 3. Requête complète avec tous les champs disponibles

Si `fields=all` ou non spécifié avec champs par défaut :

```sql
SELECT 
    id,
    payer_id,
    contact_relance_id,
    proprietaire_id,
    apporteur_id,
    sequence_id,
    nfacture,
    date_facture,
    date_echeance,
    date_piece,
    montant_ttc,
    reste_a_payer,
    statut,
    is_blacklisted,
    blacklist_date,
    blacklist_motif,
    facture_soldee,
    id_dossier,
    numero_dossier,
    adresse_bien,
    code_postal,
    ville,
    payeur_nom,
    payeur_prenom,
    payeur_email,
    payeur_telephone,
    url_pdf,
    url_pdf_token,
    email_index,
    created_at,
    updated_at,
    donneur_ordre_id,
    locataire_entrant_id,
    locataire_sortant_id,
    notaire_id,
    syndic_id,
    acquereur_id,
    total_ht,
    reference,
    reference_externe,
    statut_dossier,
    etage,
    entree,
    escalier,
    porte,
    numero_lot,
    payeur_civilite,
    payeur_type,
    proprietaire_nom,
    proprietaire_prenom,
    proprietaire_email,
    proprietaire_telephone,
    proprietaire_civilite,
    proprietaire_type_personne,
    apporteur_prenom,
    apporteur_civilite,
    donneur_ordre_nom,
    donneur_ordre_prenom,
    donneur_ordre_email,
    donneur_ordre_telephone,
    donneur_ordre_civilite,
    syndic_nom,
    syndic_prenom,
    syndic_email,
    syndic_telephone,
    syndic_civilite,
    notaire_nom,
    notaire_prenom,
    notaire_email,
    notaire_telephone,
    notaire_civilite,
    locataire_entrant_nom,
    locataire_entrant_prenom,
    locataire_entrant_email,
    locataire_entrant_telephone,
    locataire_entrant_civilite,
    locataire_sortant_nom,
    locataire_sortant_prenom,
    locataire_sortant_email,
    locataire_sortant_telephone,
    locataire_sortant_civilite,
    acquereur_nom,
    acquereur_prenom,
    acquereur_email,
    acquereur_telephone,
    acquereur_civilite,
    employe_intervention,
    commentaire_dossier,
    commentaire_piece,
    cadre_mission,
    solde_le,
    payeur_type_personne,
    apporteur_nom,
    apporteur_email,
    apporteur_telephone,
    notes_json,
    url_pdf_token_expires
FROM impayes
WHERE 
    date_echeance < :date_echeance_lt
    AND reste_a_payer > :reste_a_payer_gt
    AND (:statut IS NULL OR statut = :statut)
ORDER BY date_echeance ASC
LIMIT :limit
OFFSET :offset;
```

---

## Modèles Pydantic

### Query Parameters

```python
from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import datetime

class ListImpayesEchuesQuery(BaseModel):
    """
    Paramètres de requête pour la liste des impayés échus
    """
    date_echeance_lt: Optional[datetime] = Field(
        default=None,
        description="Date d'échéance strictement inférieure (ISO 8601). Défaut: maintenant"
    )
    reste_a_payer_gt: float = Field(
        default=0.0,
        ge=0,
        description="Reste à payer strictement supérieur à cette valeur"
    )
    statut: Optional[str] = Field(
        default=None,
        description="Filtrer par statut (ex: 'impaye')"
    )
    fields: str = Field(
        default="id,nfacture,date_echeance,reste_a_payer",
        description="Champs à retourner, séparés par virgule. 'all' pour tous les champs"
    )
    limit: int = Field(
        default=1000,
        ge=1,
        le=10000,
        description="Nombre maximum de résultats"
    )
    offset: int = Field(
        default=0,
        ge=0,
        description="Offset pour la pagination"
    )
    
    @validator('fields')
    def validate_fields(cls, v):
        """Valide que les champs demandés existent dans le schéma"""
        allowed_fields = {
            'id', 'payer_id', 'contact_relance_id', 'proprietaire_id', 'apporteur_id',
            'sequence_id', 'nfacture', 'date_facture', 'date_echeance', 'date_piece',
            'montant_ttc', 'reste_a_payer', 'statut', 'is_blacklisted', 'blacklist_date',
            'blacklist_motif', 'facture_soldee', 'id_dossier', 'numero_dossier',
            'adresse_bien', 'code_postal', 'ville', 'payeur_nom', 'payeur_prenom',
            'payeur_email', 'payeur_telephone', 'url_pdf', 'url_pdf_token', 'email_index',
            'created_at', 'updated_at', 'donneur_ordre_id', 'locataire_entrant_id',
            'locataire_sortant_id', 'notaire_id', 'syndic_id', 'acquereur_id', 'total_ht',
            'reference', 'reference_externe', 'statut_dossier', 'etage', 'entree',
            'escalier', 'porte', 'numero_lot', 'payeur_civilite', 'payeur_type',
            'proprietaire_nom', 'proprietaire_prenom', 'proprietaire_email',
            'proprietaire_telephone', 'proprietaire_civilite', 'proprietaire_type_personne',
            'apporteur_prenom', 'apporteur_civilite', 'donneur_ordre_nom', 'donneur_ordre_prenom',
            'donneur_ordre_email', 'donneur_ordre_telephone', 'donneur_ordre_civilite',
            'syndic_nom', 'syndic_prenom', 'syndic_email', 'syndic_telephone', 'syndic_civilite',
            'notaire_nom', 'notaire_prenom', 'notaire_email', 'notaire_telephone', 'notaire_civilite',
            'locataire_entrant_nom', 'locataire_entrant_prenom', 'locataire_entrant_email',
            'locataire_entrant_telephone', 'locataire_entrant_civilite', 'locataire_sortant_nom',
            'locataire_sortant_prenom', 'locataire_sortant_email', 'locataire_sortant_telephone',
            'locataire_sortant_civilite', 'acquereur_nom', 'acquereur_prenom', 'acquereur_email',
            'acquereur_telephone', 'acquereur_civilite', 'employe_intervention', 'commentaire_dossier',
            'commentaire_piece', 'cadre_mission', 'solde_le', 'payeur_type_personne', 'apporteur_nom',
            'apporteur_email', 'apporteur_telephone', 'notes_json', 'url_pdf_token_expires'
        }
        if v == 'all':
            return v
        requested = set(f.strip() for f in v.split(','))
        invalid = requested - allowed_fields
        if invalid:
            raise ValueError(f"Champs invalides: {', '.join(invalid)}")
        return v
```

### Response Models

```python
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from datetime import datetime

class ImpayeItem(BaseModel):
    """
    Item d'un impayé dans la réponse
    Champs retournés selon le paramètre 'fields'
    """
    id: str
    nfacture: Optional[str] = None
    date_echeance: Optional[str] = None  # Format ISO 8601 ou date string
    reste_a_payer: Optional[float] = None
    
    # Champs optionnels retournés si demandés
    payer_id: Optional[str] = None
    contact_relance_id: Optional[str] = None
    proprietaire_id: Optional[str] = None
    apporteur_id: Optional[str] = None
    sequence_id: Optional[str] = None
    date_facture: Optional[str] = None
    date_piece: Optional[str] = None
    montant_ttc: Optional[float] = None
    statut: Optional[str] = None
    is_blacklisted: Optional[int] = None
    blacklist_date: Optional[str] = None
    blacklist_motif: Optional[str] = None
    facture_soldee: Optional[int] = None
    id_dossier: Optional[str] = None
    numero_dossier: Optional[str] = None
    adresse_bien: Optional[str] = None
    code_postal: Optional[str] = None
    ville: Optional[str] = None
    payeur_nom: Optional[str] = None
    payeur_prenom: Optional[str] = None
    payeur_email: Optional[str] = None
    payeur_telephone: Optional[str] = None
    url_pdf: Optional[str] = None
    url_pdf_token: Optional[str] = None
    email_index: Optional[int] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    
    class Config:
        extra = 'allow'  # Permet les champs dynamiques selon 'fields'

class MetaResponse(BaseModel):
    """
    Méta-données de pagination
    """
    total: int = Field(description="Nombre total de résultats correspondant aux filtres")
    limit: int = Field(description="Limite appliquée")
    offset: int = Field(description="Offset appliqué")

class ListImpayesEchuesResponse(BaseModel):
    """
    Réponse complète de la route
    """
    data: List[Dict[str, Any]] = Field(description="Liste des impayés échus")
    meta: MetaResponse = Field(description="Méta-données de pagination")
```

### Error Models

```python
from pydantic import BaseModel

class HTTPError(BaseModel):
    """
    Modèle d'erreur HTTP standard
    """
    detail: str = Field(description="Message d'erreur détaillé")
    code: Optional[str] = Field(default=None, description="Code d'erreur interne")
```

---

## Gestion des Erreurs

| Code HTTP | Scénario | Message |
|-----------|----------|---------|
| **400** | Paramètres invalides (champs inexistants, limit > 10000, offset négatif) | `{"detail": "Champs invalids: xxx", "code": "INVALID_FIELDS"}` |
| **401** | Token JWT manquant ou invalide | `{"detail": "Authentification requise", "code": "UNAUTHORIZED"}` |
| **403** | Utilisateur sans droits sur les impayés | `{"detail": "Accès interdit aux impayés", "code": "FORBIDDEN"}` |
| **422** | Validation Pydantic échouée | Détail des champs invalides par Pydantic |
| **500** | Erreur SQLite ou exception serveur | `{"detail": "Erreur interne du serveur", "code": "INTERNAL_ERROR"}` |

### Cas particuliers gérés

- **Résultat vide** : HTTP 200 avec `data: []` et `meta.total: 0`
- **Champs demandés invalides** : HTTP 400 avec liste des champs invalides
- **`date_echeance_lt` non fourni** : Utilise `datetime.now(UTC).isoformat()` par défaut
- **Erreur SQLite** : Log l'erreur, retourne HTTP 500 générique

---

## Exemples

### Requête d'exemple (cURL)

```bash
# Requête basique - impayés échus avec reste à payer > 0
curl -X GET "http://localhost:8000/api/impayes?reste_a_payer_gt=0&limit=50" \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Accept: application/json"

# Requête avec date spécifique et champs personnalisés
curl -X GET "http://localhost:8000/api/impayes?date_echeance_lt=2024-01-15T00:00:00Z&reste_a_payer_gt=100&fields=id,nfacture,date_echeance,reste_a_payer,payeur_nom,payeur_email&limit=10&offset=0" \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Accept: application/json"

# Requête avec tous les champs
curl -X GET "http://localhost:8000/api/impayes?fields=all&limit=100" \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Accept: application/json"
```

### Requête d'exemple (JavaScript/Fetch)

```javascript
// Requête pour le KPI dashboard
const response = await fetch('/api/impayes?date_echeance_lt=2024-01-15T00:00:00Z&reste_a_payer_gt=0&fields=id,nfacture,date_echeance,reste_a_payer', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/json'
  }
});

const data = await response.json();
console.log(data.meta.total); // Nombre total d'impayés échus
```

### Réponse d'exemple (succès)

```json
{
  "data": [
    {
      "id": "imp-001-uuid",
      "nfacture": "F-2024-001",
      "date_echeance": "2024-01-10",
      "reste_a_payer": 1500.00
    },
    {
      "id": "imp-002-uuid",
      "nfacture": "F-2024-015",
      "date_echeance": "2024-01-05",
      "resta_a_payer": 3200.50
    },
    {
      "id": "imp-003-uuid",
      "nfacture": "F-2023-089",
      "date_echeance": "2023-12-20",
      "reste_a_payer": 899.99
    }
  ],
  "meta": {
    "total": 28,
    "limit": 1000,
    "offset": 0
  }
}
```

### Réponse d'exemple (résultat vide)

```json
{
  "data": [],
  "meta": {
    "total": 0,
    "limit": 1000,
    "offset": 0
  }
}
```

### Réponse d'exemple (erreur 400 - champs invalides)

```json
{
  "detail": "Champs invalids: invalid_field, another_bad_field",
  "code": "INVALID_FIELDS"
}
```

---

## Implémentation FastAPI (référence)

```python
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
from datetime import datetime
import sqlite3
import json

router = APIRouter(prefix="/api", tags=["impayes"])
security = HTTPBearer()

# Chemin vers la base de données
DB_PATH = "app/data/marki.db"

def get_db():
    """Context manager pour la connexion SQLite"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Vérifier le JWT et retourner le user_id"""
    # Implémentation de la vérification JWT
    # Retourne le payload du token ou lève 401/403
    pass

@router.get(
    "/impayes",
    response_model=ListImpayesEchuesResponse,
    responses={
        400: {"model": HTTPError},
        401: {"model": HTTPError},
        403: {"model": HTTPError},
        500: {"model": HTTPError}
    }
)
async def list_impayes_echues(
    date_echeance_lt: Optional[datetime] = None,
    reste_a_payer_gt: float = Query(default=0.0, ge=0),
    statut: Optional[str] = None,
    fields: str = Query(default="id,nfacture,date_echeance,reste_a_payer"),
    limit: int = Query(default=1000, ge=1, le=10000),
    offset: int = Query(default=0, ge=0),
    db: sqlite3.Connection = Depends(get_db),
    token_payload: dict = Depends(verify_token)
):
    """
    Récupère la liste des impayés échus avec filtres et pagination.
    
    Utilisé par le KPI "impayés actifs" du dashboard.
    """
    try:
        # Valider les champs demandés
        if fields != 'all':
            requested_fields = [f.strip() for f in fields.split(',')]
            # Vérifier que tous les champs existent...
        
        # Déterminer la date de référence
        date_ref = date_echeance_lt or datetime.utcnow()
        date_ref_str = date_ref.isoformat()
        
        # Construire la requête SELECT
        if fields == 'all':
            select_fields = "*"
        else:
            select_fields = ", ".join(requested_fields)
        
        # Requête principale
        query = f"""
            SELECT {select_fields}
            FROM impayes
            WHERE date_echeance < ?
              AND reste_a_payer > ?
              AND (? IS NULL OR statut = ?)
            ORDER BY date_echeance ASC
            LIMIT ? OFFSET ?
        """
        
        cursor = db.cursor()
        cursor.execute(query, (
            date_ref_str,
            reste_a_payer_gt,
            statut,
            statut,
            limit,
            offset
        ))
        
        rows = cursor.fetchall()
        data = [dict(row) for row in rows]
        
        # Requête COUNT pour meta.total
        count_query = """
            SELECT COUNT(*) as total
            FROM impayes
            WHERE date_echeance < ?
              AND reste_a_payer > ?
              AND (? IS NULL OR statut = ?)
        """
        cursor.execute(count_query, (
            date_ref_str,
            reste_a_payer_gt,
            statut,
            statut
        ))
        total = cursor.fetchone()[0]
        
        return {
            "data": data,
            "meta": {
                "total": total,
                "limit": limit,
                "offset": offset
            }
        }
        
    except sqlite3.Error as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erreur base de données",
            code="DB_ERROR"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erreur interne du serveur",
            code="INTERNAL_ERROR"
        )
```

---

## Notes d'implémentation

1. **Performance** : La requête utilise les index sur `date_echeance` si disponibles. Considérer l'ajout d'un index composite sur `(date_echeance, reste_a_payer, statut)` si le volume est important.

2. **Sécurité** : 
   - Toujours valider le token JWT avant exécution
   - Utiliser des requêtes paramétrées pour éviter les injections SQL
   - Vérifier les droits de l'utilisateur sur les données impayés

3. **Pagination** : `limit` maximum à 10000 pour éviter les timeouts. Pour de plus grands volumes, utiliser la pagination par curseur (cursor-based).

4. **Champs JSON** : Le champ `notes_json` est stocké comme TEXT JSON dans SQLite. Il est retourné tel quel (string JSON) dans la réponse.

5. **Dates** : Les dates sont stockées en format ISO 8601 (TEXT) dans SQLite. La comparaison `date_echeance < ?` fonctionne car le format ISO est lexicographiquement comparable.
```
