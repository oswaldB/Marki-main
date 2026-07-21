# Workflow Backend: list-impayes-filtres

## Objectifs

- Fournir un endpoint sécurisé pour récupérer la liste des factures impayées avec filtres
- Permettre le filtrage par date d'échéance et montant restant à payer
- Optimiser les performances via sélection dynamique des champs retournés
- Support KPI d'ancienneté : alimentation des tranches d'ancienneté côté frontend

---

## Route API

| Attribut | Valeur |
|----------|--------|
| **Méthode** | `GET` |
| **Endpoint** | `/api/impayes` |
| **Base de données** | `app/data/marki.db` |
| **Table principale** | `impayes` |
| **Content-Type** | `application/json` |

---

## Requêtes SQL

### Requête principale (avec filtres et sélection de champs)

```sql
-- Paramètres:
-- :date_echeance_lt  TEXT (ISO 8601) - optionnel
-- :reste_a_payer_gt  REAL - optionnel  
-- :statut            TEXT - défaut 'impaye'
-- :allowed_fields    liste des champs autorisés à sélectionner

SELECT {selected_fields}
FROM impayes
WHERE 1=1
  AND (:statut IS NULL OR statut = :statut)
  AND (:date_echeance_lt IS NULL OR date_echeance < :date_echeance_lt)
  AND (:reste_a_payer_gt IS NULL OR reste_a_payer > :reste_a_payer_gt)
  AND (facture_soldee = 0 OR facture_soldee IS NULL)
ORDER BY date_echeance ASC;
```

### Requête de comptage (total)

```sql
SELECT COUNT(*) as total
FROM impayes
WHERE 1=1
  AND (:statut IS NULL OR statut = :statut)
  AND (:date_echeance_lt IS NULL OR date_echeance < :date_echeance_lt)
  AND (:reste_a_payer_gt IS NULL OR reste_a_payer > :reste_a_payer_gt)
  AND (facture_soldee = 0 OR facture_soldee IS NULL);
```

### Champs disponibles (schema impayes)

| Champ | Type SQL | Description |
|-------|----------|-------------|
| `id` | TEXT | UUID facture |
| `date_echeance` | TEXT | Date échéance (ISO 8601) |
| `reste_a_payer` | REAL | Montant restant |
| `nfacture` | TEXT | Numéro de facture |
| `date_facture` | TEXT | Date de facturation |
| `montant_ttc` | REAL | Montant TTC |
| `statut` | TEXT | Statut (impaye/paye) |
| `facture_soldee` | INTEGER | 0=non soldée, 1=soldée |
| `payeur_nom` | TEXT | Nom payeur |
| `payeur_prenom` | TEXT | Prénom payeur |
| `payeur_email` | TEXT | Email payeur |
| `created_at` | TEXT | Date création |
| `updated_at` | TEXT | Date modification |

> **Note sécurité** : Le paramètre `fields` doit être validé contre une whitelist des colonnes autorisées pour éviter l'injection SQL.

---

## Modèles Pydantic

```python
from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any, Literal
from datetime import datetime

# Whitelist des champs sélectionnables
ALLOWED_FIELDS = {
    'id', 'nfacture', 'date_facture', 'date_echeance', 'date_piece',
    'montant_ttc', 'reste_a_payer', 'statut', 'facture_soldee',
    'payeur_nom', 'payeur_prenom', 'payeur_email', 'payeur_telephone',
    'proprietaire_nom', 'proprietaire_prenom', 'numero_dossier',
    'adresse_bien', 'code_postal', 'ville', 'created_at', 'updated_at'
}

# --- Requête ---

class ImpayeListFilters(BaseModel):
    """Paramètres de requête pour le filtrage des impayés"""
    
    date_echeance_lt: Optional[str] = Field(
        None, 
        description="Date limite exclusive (ISO 8601)",
        example="2024-01-16T00:00:00"
    )
    
    reste_a_payer_gt: Optional[float] = Field(
        None,
        ge=0,
        description="Montant minimum du reste à payer",
        example=0
    )
    
    fields: Optional[str] = Field(
        None,
        description="Champs à retourner, séparés par virgule",
        example="id,date_echeance,reste_a_payer,nfacture"
    )
    
    statut: Literal['impaye', 'paye', 'tous'] = Field(
        'impaye',
        description="Filtrer par statut"
    )

    @validator('fields')
    def validate_fields(cls, v):
        """Validation whitelist des champs pour éviter injection SQL"""
        if v is None:
            return 'id,date_echeance,reste_a_payer'
        
        requested = set(f.strip() for f in v.split(','))
        invalid = requested - ALLOWED_FIELDS
        
        if invalid:
            raise ValueError(f"Champs non autorisés: {invalid}")
        
        return ','.join(requested)


# --- Réponse ---

class ImpayeMetaFilters(BaseModel):
    """Filtres effectivement appliqués"""
    date_echeance_lt: Optional[str] = None
    reste_a_payer_gt: Optional[float] = None
    statut: str

class ImpayeMeta(BaseModel):
    """Métadonnées de la réponse"""
    filters_applied: ImpayeMetaFilters

class ImpayeItem(BaseModel):
    """Item impayé - champs dynamiques selon la requête"""
    model_config = {'extra': 'allow'}  # Autorise champs dynamiques
    
    id: str
    date_echeance: Optional[str] = None
    reste_a_payer: Optional[float] = None

class ImpayeListResponse(BaseModel):
    """Réponse complète listant les impayés"""
    data: List[Dict[str, Any]] = Field(
        default_factory=list,
        description="Liste des impayés (champs selon paramètre 'fields')"
    )
    total: int = Field(
        ge=0,
        description="Nombre total d'impayés correspondant aux filtres"
    )
    meta: ImpayeMeta
```

---

## Gestion des erreurs

| Code HTTP | Condition | Réponse |
|-----------|-----------|---------|
| **401** | Session invalide ou expirée | `{"detail": "Session invalide ou expirée"}` |
| **403** | Utilisateur sans droit de lecture | `{"detail": "Accès refusé aux données d'impayés"}` |
| **422** | Paramètres invalides (validation Pydantic) | `{"detail": [{"loc": ["query", "fields"], "msg": "Champs non autorisés: ..."}]}` |
| **500** | Erreur base de données SQLite | `{"data": [], "total": 0, "meta": {...}}` (graceful degradation) |

---

## Exemples

### Requête

```bash
curl -X GET "http://localhost:8000/api/impayes?date_echeance_lt=2024-01-16&reste_a_payer_gt=0&fields=id,date_echeance,reste_a_payer,nfacture&statut=impaye" \
  -H "Authorization: Bearer <token>" \
  -H "Accept: application/json"
```

### Réponse (200 OK)

```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "date_echeance": "2024-01-10",
      "reste_a_payer": 1500.00,
      "nfacture": "FACT-2023-1254"
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "date_echeance": "2023-12-15",
      "reste_a_payer": 3200.50,
      "nfacture": "FACT-2023-0987"
    }
  ],
  "total": 2,
  "meta": {
    "filters_applied": {
      "date_echeance_lt": "2024-01-16",
      "reste_a_payer_gt": 0,
      "statut": "impaye"
    }
  }
}
```

### Réponse (aucun résultat - 200 OK)

```json
{
  "data": [],
  "total": 0,
  "meta": {
    "filters_applied": {
      "date_echeance_lt": "2022-01-01",
      "reste_a_payer_gt": 10000,
      "statut": "impaye"
    }
  }
}
```

---

## Points d'attention implémentation

1. **Validation stricte des champs** : Utiliser la whitelist `ALLOWED_FIELDS` avant construction SQL
2. **Paramètres SQL** : Toujours utiliser des paramètres liés (`:param`) pour éviter l'injection SQL
3. **Timezone** : Les dates ISO 8601 doivent être comparées au format texte SQLite (format ISO)
4. **facture_soldee** : Exclure implicitement les factures soldées (`facture_soldee = 1`)
5. **Gestion graceful** : En cas d'erreur 500, retourner structure JSON vide avec `total: 0`
