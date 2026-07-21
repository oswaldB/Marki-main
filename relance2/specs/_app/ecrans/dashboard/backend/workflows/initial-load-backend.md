```markdown
# Workflow Backend: Dashboard Initial Load

## 1. Titre

**dashboard-initial-load** - Agrégation des données complètes pour l'initialisation du tableau de bord

## 2. Objectifs

Ce workflow backend fournit un **endpoint unique** qui agrège toutes les données nécessaires à l'initialisation du dashboard en une seule requête HTTP, évitant ainsi les multiples appels API des workflows enfants.

Responsabilités :
- Agréger les KPIs (factures, impayés, montants, relances, taux de recouvrement)
- Calculer le top 5 des débiteurs côté serveur
- Fournir les données pour le graphique d'évolution des impayés
- Retourner les événements récents
- Calculer les tranches d'ancienneté des impayés

## 3. Route API

| Attribut | Valeur |
|----------|--------|
| **Méthode** | `GET` |
| **Endpoint** | `/api/dashboard/initial-load` |
| **Authentication** | Requis (JWT Bearer) |
| **Content-Type** | `application/json` |

## 4. Paramètres

### Paramètres de requête (Query Params)

| Paramètre | Type | Obligatoire | Défaut | Description |
|-----------|------|-------------|--------|-------------|
| `periode` | string | Non | `30j` | Période d'analyse (`7j`, `30j`, `90j`, `1an`) |
| `date_reference` | string | Non | `now` | Date de référence ISO 8601 (def: date courante) |

## 5. Requêtes SQL

### 5.1 KPI - Factures en attente

```sql
SELECT 
    COUNT(*) as total_factures,
    SUM(montant_ttc) as montant_total,
    AVG(reste_a_payer) as moyenne_reste
FROM impayes
WHERE statut = 'impaye'
    AND facture_soldee = 0
    AND is_blacklisted = 0
    AND payeur_id IS NOT NULL
```

### 5.2 KPI - Impayés actifs

```sql
SELECT 
    COUNT(*) as nb_impayes,
    COUNT(DISTINCT payeur_id) as nb_debiteurs_distincts,
    SUM(reste_a_payer) as total_reste_a_payer,
    MIN(date_echeance) as plus_ancienne_echeance,
    MAX(date_echeance) as plus_recente_echeance
FROM impayes
WHERE statut = 'impaye'
    AND facture_soldee = 0
    AND is_blacklisted = 0
    AND payeur_id IS NOT NULL
```

### 5.3 KPI - Montant total impayé

```sql
SELECT 
    COALESCE(SUM(reste_a_payer), 0) as montant_total_impaye,
    COALESCE(SUM(CASE 
        WHEN date_echeance < date('now') 
        THEN reste_a_payer 
        ELSE 0 
    END), 0) as montant_retard,
    COALESCE(SUM(CASE 
        WHEN date_echeance >= date('now') 
        THEN reste_a_payer 
        ELSE 0 
    END), 0) as montant_a_echeance
FROM impayes
WHERE statut = 'impaye'
    AND facture_soldee = 0
    AND is_blacklisted = 0
```

### 5.4 KPI - Relances du jour

```sql
SELECT 
    COUNT(*) as nb_relances_jour,
    COUNT(CASE WHEN email_sent = 1 THEN 1 END) as nb_envoyees,
    COUNT(CASE WHEN email_sent = 0 THEN 1 END) as nb_programmees,
    COUNT(CASE WHEN last_error IS NOT NULL THEN 1 END) as nb_erreurs
FROM relances
WHERE date(date_envoi) = date('now')
    AND statut NOT IN ('brouillon', 'annule')
```

### 5.5 KPI - Taux de recouvrement

```sql
-- Sur la période demandée
WITH periode_params AS (
    SELECT 
        CASE 
            WHEN :periode = '7j' THEN date('now', '-7 days')
            WHEN :periode = '30j' THEN date('now', '-30 days')
            WHEN :periode = '90j' THEN date('now', '-90 days')
            WHEN :periode = '1an' THEN date('now', '-1 year')
            ELSE date('now', '-30 days')
        END as date_debut
),
factures_periode AS (
    SELECT 
        SUM(montant_ttc) as total_factures,
        SUM(CASE WHEN facture_soldee = 1 THEN montant_ttc ELSE 0 END) as total_solde
    FROM impayes
    WHERE date_facture >= (SELECT date_debut FROM periode_params)
        AND statut IN ('impaye', 'paye', 'partiel')
),
paiements_periode AS (
    SELECT 
        COALESCE(SUM(montant), 0) as total_paiements
    FROM suivis
    WHERE date_envoi >= (SELECT date_debut FROM periode_params)
        AND statut = 'paye'
)
SELECT 
    fp.total_factures,
    fp.total_solde,
    pp.total_paiements,
    CASE 
        WHEN fp.total_factures > 0 
        THEN ROUND((fp.total_solde / fp.total_factures) * 100, 2)
        ELSE 0 
    END as taux_recouvrement_pct
FROM factures_periode fp
LEFT JOIN paiements_periode pp ON 1=1
```

### 5.6 KPI - Tranches d'ancienneté

```sql
SELECT 
    COUNT(CASE 
        WHEN date_echeance >= date('now', '-30 days') 
        THEN 1 
    END) as moins_30j,
    COUNT(CASE 
        WHEN date_echeance < date('now', '-30 days') 
        AND date_echeance >= date('now', '-60 days')
        THEN 1 
    END) as entre_30_60j,
    COUNT(CASE 
        WHEN date_echeance < date('now', '-60 days') 
        AND date_echeance >= date('now', '-90 days')
        THEN 1 
    END) as entre_60_90j,
    COUNT(CASE 
        WHEN date_echeance < date('now', '-90 days') 
        THEN 1 
    END) as plus_90j,
    COUNT(*) as total
FROM impayes
WHERE statut = 'impaye'
    AND facture_soldee = 0
    AND is_blacklisted = 0
```

### 5.7 Top 5 Débiteurs

```sql
SELECT 
    i.payeur_id,
    c.nom as nom_debiteur,
    c.prenom as prenom_debiteur,
    c.email as email_debiteur,
    COUNT(*) as nb_factures,
    SUM(i.reste_a_payer) as total_du,
    MAX((julianday('now') - julianday(i.date_echeance))) as jours_retard_max,
    MIN(i.date_echeance) as plus_ancienne_facture
FROM impayes i
JOIN contacts c ON i.payeur_id = c.id
WHERE i.statut = 'impaye'
    AND i.facture_soldee = 0
    AND i.is_blacklisted = 0
    AND i.payeur_id IS NOT NULL
GROUP BY i.payeur_id, c.nom, c.prenom, c.email
ORDER BY total_du DESC
LIMIT 5
```

### 5.8 Graphique Évolution Impayés

```sql
-- Données pour graphique sur les 12 derniers mois
WITH months AS (
    SELECT 
        strftime('%Y-%m', date('now', '-' || n || ' months')) as mois,
        date('now', '-' || n || ' months', 'start of month') as debut_mois,
        date('now', '-' || n || ' months', 'start of month', '+1 month', '-1 day') as fin_mois
    FROM (SELECT 0 as n UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 
          UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 
          UNION SELECT 8 UNION SELECT 9 UNION SELECT 10 UNION SELECT 11)
)
SELECT 
    m.mois,
    COALESCE(SUM(i.reste_a_payer), 0) as montant_impaye,
    COUNT(i.id) as nb_factures
FROM months m
LEFT JOIN impayes i ON strftime('%Y-%m', i.date_echeance) = m.mois
    AND i.statut = 'impaye'
    AND i.facture_soldee = 0
    AND i.is_blacklisted = 0
GROUP BY m.mois, m.debut_mois
ORDER BY m.mois ASC
```

### 5.9 Événements Récents

```sql
SELECT 
    e.id,
    e.type,
    e.titre,
    e.description,
    e.entity_type,
    e.entity_id,
    e.read,
    e.created_at,
    e.who_id,
    e.by_marki,
    e.metadata,
    e.icon,
    c.nom as who_nom,
    c.prenom as who_prenom
FROM events e
LEFT JOIN contacts c ON e.who_id = c.id
WHERE e.created_at >= date('now', '-7 days')
ORDER BY e.created_at DESC
LIMIT 50
```

## 6. Modèles Pydantic

```python
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum


class PeriodeEnum(str, Enum):
    SEVEN_DAYS = "7j"
    THIRTY_DAYS = "30j"
    NINETY_DAYS = "90j"
    ONE_YEAR = "1an"


class DashboardInitialLoadRequest(BaseModel):
    """Paramètres de requête pour le chargement initial du dashboard"""
    periode: PeriodeEnum = Field(default=PeriodeEnum.THIRTY_DAYS, description="Période d'analyse")
    date_reference: Optional[str] = Field(default=None, description="Date de référence ISO 8601")


class KPIFactures(BaseModel):
    """KPI des factures"""
    total_factures: int = Field(..., description="Nombre total de factures")
    montant_total: Optional[float] = Field(None, description="Montant total TTC")
    moyenne_reste: Optional[float] = Field(None, description="Moyenne du reste à payer")


class KPIImpayes(BaseModel):
    """KPI des impayés actifs"""
    nb_impayes: int = Field(..., description="Nombre d'impayés")
    nb_debiteurs_distincts: int = Field(..., description="Nombre de débiteurs distincts")
    total_reste_a_payer: Optional[float] = Field(None, description="Total reste à payer")
    plus_ancienne_echeance: Optional[str] = Field(None, description="Date échéance la plus ancienne")
    plus_recente_echeance: Optional[str] = Field(None, description="Date échéance la plus récente")


class KPIMontantTotal(BaseModel):
    """KPI montants"""
    montant_total_impaye: float = Field(..., description="Montant total impayé")
    montant_retard: float = Field(..., description="Montant en retard")
    montant_a_echeance: float = Field(..., description="Montant à échéance")


class KPIRelancesJour(BaseModel):
    """KPI relances du jour"""
    nb_relances_jour: int = Field(..., description="Nombre de relances aujourd'hui")
    nb_envoyees: int = Field(..., description="Relances envoyées")
    nb_programmees: int = Field(..., description="Relances programmées")
    nb_erreurs: int = Field(..., description="Relances en erreur")


class KPITauxRecouvrement(BaseModel):
    """KPI taux de recouvrement"""
    total_factures: Optional[float] = Field(None, description="Total factures période")
    total_solde: Optional[float] = Field(None, description="Total soldé")
    total_paiements: float = Field(..., description="Total paiements reçus")
    taux_recouvrement_pct: float = Field(..., description="Taux de recouvrement en %")


class KPIAncienneteTranches(BaseModel):
    """KPI répartition par ancienneté"""
    moins_30j: int = Field(..., description="Impayés de moins de 30 jours")
    entre_30_60j: int = Field(..., description="Impayés entre 30 et 60 jours")
    entre_60_90j: int = Field(..., description="Impayés entre 60 et 90 jours")
    plus_90j: int = Field(..., description="Impayés de plus de 90 jours")
    total: int = Field(..., description="Total des impayés")


class TopDebiteurItem(BaseModel):
    """Un débiteur dans le top 5"""
    payeur_id: str = Field(..., description="ID du contact payeur")
    nom_debiteur: Optional[str] = Field(None, description="Nom du débiteur")
    prenom_debiteur: Optional[str] = Field(None, description="Prénom du débiteur")
    email_debiteur: Optional[str] = Field(None, description="Email du débiteur")
    nb_factures: int = Field(..., description="Nombre de factures impayées")
    total_du: float = Field(..., description="Montant total dû")
    jours_retard_max: Optional[float] = Field(None, description="Jours de retard maximum")
    plus_ancienne_facture: Optional[str] = Field(None, description="Date de la plus ancienne facture")


class EvolutionImpayesItem(BaseModel):
    """Point de données pour le graphique d'évolution"""
    mois: str = Field(..., description="Mois au format YYYY-MM")
    montant_impaye: float = Field(..., description="Montant des impayés ce mois")
    nb_factures: int = Field(..., description="Nombre de factures concernées")


class EventItem(BaseModel):
    """Un événement récent"""
    id: str = Field(..., description="ID de l'événement")
    type: str = Field(..., description="Type d'événement")
    titre: str = Field(..., description="Titre")
    description: Optional[str] = Field(None, description="Description")
    entity_type: Optional[str] = Field(None, description="Type d'entité liée")
    entity_id: Optional[str] = Field(None, description="ID de l'entité liée")
    read: int = Field(0, description="Lu (0=non, 1=oui)")
    created_at: str = Field(..., description="Date de création ISO 8601")
    who_id: Optional[str] = Field(None, description="ID du contact concerné")
    by_marki: int = Field(0, description="Créé par Marki (0=non, 1=oui)")
    metadata: Optional[str] = Field(None, description="Métadonnées JSON")
    icon: str = Field("fa-bell", description="Icône FontAwesome")
    who_nom: Optional[str] = Field(None, description="Nom du contact")
    who_prenom: Optional[str] = Field(None, description="Prénom du contact")


class DashboardInitialLoadResponse(BaseModel):
    """Réponse complète du endpoint initial-load"""
    # KPIs
    factures: KPIFactures
    impayes: KPIImpayes
    montants: KPIMontantTotal
    relances_jour: KPIRelancesJour
    taux_recouvrement: KPITauxRecouvrement
    anciennete: KPIAncienneteTranches
    
    # Données détaillées
    top_debiteurs: List[TopDebiteurItem]
    evolution_impayes: List[EvolutionImpayesItem]
    evenements: List[EventItem]
    
    # Métadonnées
    date_generation: str = Field(..., description="Date de génération ISO 8601")
    periode_analyse: str = Field(..., description="Période analysée")
    
    class Config:
        json_schema_extra = {
            "example": {
                "factures": {
                    "total_factures": 150,
                    "montant_total": 125000.50,
                    "moyenne_reste": 833.33
                },
                "impayes": {
                    "nb_impayes": 45,
                    "nb_debiteurs_distincts": 12,
                    "total_reste_a_payer": 37500.00,
                    "plus_ancienne_echeance": "2024-01-15",
                    "plus_recente_echeance": "2024-06-20"
                },
                "montants": {
                    "montant_total_impaye": 37500.00,
                    "montant_retard": 28500.00,
                    "montant_a_echeance": 9000.00
                },
                "relances_jour": {
                    "nb_relances_jour": 8,
                    "nb_envoyees": 5,
                    "nb_programmees": 2,
                    "nb_erreurs": 1
                },
                "taux_recouvrement": {
                    "total_factures": 50000.00,
                    "total_solde": 12500.00,
                    "total_paiements": 12500.00,
                    "taux_recouvrement_pct": 25.0
                },
                "anciennete": {
                    "moins_30j": 15,
                    "entre_30_60j": 12,
                    "entre_60_90j": 8,
                    "plus_90j": 10,
                    "total": 45
                },
                "top_debiteurs": [],
                "evolution_impayes": [],
                "evenements": [],
                "date_generation": "2024-06-21T10:30:00Z",
                "periode_analyse": "30j"
            }
        }
```

## 7. Gestion des Erreurs

| Code HTTP | Situation | Message |
|-----------|-----------|---------|
| `200` | Succès | Données retournées normalement |
| `401` | Non authentifié | `{"detail": "Authentication required"}` |
| `403` | Droits insuffisants | `{"detail": "Insufficient permissions"}` |
| `500` | Erreur serveur/SQL | `{"detail": "Internal server error", "error_code": "DB_ERROR"}` |

### Codes d'erreur internes

| Code | Description | Action recommandée |
|------|-------------|------------------|
| `DB_CONNECTION_ERROR` | Connexion SQLite échouée | Réessayer dans 5s |
| `DB_QUERY_ERROR` | Erreur lors de l'exécution SQL | Contacter support |
| `INVALID_PERIODE` | Période non reconnue | Utiliser: 7j, 30j, 90j, 1an |
| `DATE_PARSE_ERROR` | Date de référence invalide | Format attendu: ISO 8601 |

## 8. Exemples

### Requête d'exemple

```bash
curl -X GET "https://api.marki.fr/api/dashboard/initial-load?periode=30j" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json"
```

### Réponse d'exemple (succès - 200 OK)

```json
{
  "factures": {
    "total_factures": 156,
    "montant_total": 145320.75,
    "moyenne_reste": 931.54
  },
  "impayes": {
    "nb_impayes": 47,
    "nb_debiteurs_distincts": 14,
    "total_reste_a_payer": 45250.00,
    "plus_ancienne_echeance": "2024-01-10",
    "plus_recente_echeance": "2024-06-18"
  },
  "montants": {
    "montant_total_impaye": 45250.00,
    "montant_retard": 38450.00,
    "montant_a_echeance": 6800.00
  },
  "relances_jour": {
    "nb_relances_jour": 12,
    "nb_envoyees": 9,
    "nb_programmees": 2,
    "nb_erreurs": 1
  },
  "taux_recouvrement": {
    "total_factures": 78500.00,
    "total_solde": 19625.00,
    "total_paiements": 19625.00,
    "taux_recouvrement_pct": 25.0
  },
  "anciennete": {
    "moins_30j": 18,
    "entre_30_60j": 13,
    "entre_60_90j": 9,
    "plus_90j": 7,
    "total": 47
  },
  "top_debiteurs": [
    {
      "payeur_id": "cnt_abc123",
      "nom_debiteur": "DUPONT",
      "prenom_debiteur": "Jean",
      "email_debiteur": "jean.dupont@email.com",
      "nb_factures": 8,
      "total_du": 18500.00,
      "jours_retard_max": 156.0,
      "plus_ancienne_facture": "2024-01-15"
    },
    {
      "payeur_id": "cnt_def456",
      "nom_debiteur": "MARTIN",
      "prenom_debiteur": "Marie",
      "email_debiteur": "marie.martin@email.com",
      "nb_factures": 5,
      "total_du": 12400.00,
      "jours_retard_max": 89.0,
      "plus_ancienne_facture": "2024-03-23"
    }
  ],
  "evolution_impayes": [
    {"mois": "2023-07", "montant_impaye": 0, "nb_factures": 0},
    {"mois": "2023-08", "montant_impaye": 5200.00, "nb_factures": 3},
    {"mois": "2023-09", "montant_impaye": 12800.00, "nb_factures": 8},
    {"mois": "2023-10", "montant_impaye": 21500.00, "nb_factures": 14},
    {"mois": "2023-11", "montant_impaye": 28900.00, "nb_factures": 19},
    {"mois": "2023-12", "montant_impaye": 35200.00, "nb_factures": 24},
    {"mois": "2024-01", "montant_impaye": 42100.00, "nb_factures": 29},
    {"mois": "2024-02", "montant_impaye": 39800.00, "nb_factures": 27},
    {"mois": "2024-03", "montant_impaye": 45600.00, "nb_factures": 31},
    {"mois": "2024-04", "montant_impaye": 47800.00, "nb_factures": 33},
    {"mois": "2024-05", "montant_impaye": 46900.00, "nb_factures": 32},
    {"mois": "2024-06", "montant_impaye": 45250.00, "nb_factures": 30}
  ],
  "evenements": [
    {
      "id": "evt_xyz789",
      "type": "relance_envoyee",
      "titre": "Relance envoyée",
      "description": "Email de relance envoyé à Jean DUPONT",
      "entity_type": "relance",
      "entity_id": "rlc_abc789",
      "read": 0,
      "created_at": "2024-06-21T09:15:30Z",
      "who_id": "cnt_abc123",
      "by_marki": 1,
      "metadata": "{\"sequence_id\": \"seq_001\", \"email_index\": 2}",
      "icon": "fa-paper-plane",
      "who_nom": "DUPONT",
      "who_prenom": "Jean"
    },
    {
      "id": "evt_def012",
      "type": "paiement_recu",
      "titre": "Paiement reçu",
      "description": "Paiement de 2500€ reçu",
      "entity_type": "impaye",
      "entity_id": "imp_def456",
      "read": 0,
      "created_at": "2024-06-20T16:45:00Z",
      "who_id": "cnt_def456",
      "by_marki": 0,
      "metadata": "{\"montant\": 2500.00}",
      "icon": "fa-euro-sign",
      "who_nom": "MARTIN",
      "who_prenom": "Marie"
    }
  ],
  "date_generation": "2024-06-21T10:30:00Z",
  "periode_analyse": "30j"
}
```

### Réponse d'erreur (401 Unauthorized)

```json
{
  "detail": "Authentication required"
}
```

### Réponse d'erreur (500 Internal Server Error)

```json
{
  "detail": "Failed to execute dashboard queries",
  "error_code": "DB_QUERY_ERROR"
}
```

## 9. Notes d'implémentation

### Optimisations recommandées
- **Cache Redis**: Mettre en cache la réponse pour 5 minutes (clé: `dashboard:{user_id}:{periode}`)
- **Transactions**: Exécuter toutes les requêtes dans une seule transaction SQLite avec `BEGIN IMMEDIATE`
- **Timeouts**: Timeout de 10 secondes maximum pour l'ensemble des requêtes
- **Async**: Utiliser `aiosqlite` pour exécution asynchrone non-bloquante

### Sécurité
- Vérifier que l'utilisateur authentifié a le droit `dashboard:read`
- Sanitizer le paramètre `date_reference` avant utilisation SQL
- Ne jamais exposer les `password_hash` ou tokens sensibles

### Performance
- Temps de réponse cible: < 500ms pour 1000 factures
- Index nécessaires sur: `impayes.statut`, `impayes.date_echeance`, `impayes.payeur_id`
- Considérer des vues matérialisées si > 10k factures
```
