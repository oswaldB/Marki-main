# Routes API REST - Dashboard

Document de spécification des routes API backend nécessaires pour l'écran Dashboard.
Basé sur l'analyse du mockup `mockups/dashboard.html` et des workflows frontend.

---

## 1. Liste des Impayés

**Description** : Récupère la liste complète des impayés avec filtres optionnels. Utilisé pour calculer les KPIs, l'ancienneté et alimenter les données du dashboard.

### Endpoint

```
GET /api/impayes
```

### Paramètres d'entrée (Query)

| Paramètre | Type | Obligatoire | Description |
|-----------|------|-------------|-------------|
| `statut` | string | non | Filtrer par statut (`impaye`, `paye`, `relance`) |
| `facture_soldee` | integer | non | 0 = non soldée, 1 = soldée |
| `date_from` | string | non | Date de début (ISO 8601) pour filtrer les factures |
| `date_to` | string | non | Date de fin (ISO 8601) |
| `limit` | integer | non | Nombre maximum de résultats (défaut: 100) |

### Réponse JSON (200 OK)

```json
{
  "impayes": [
    {
      "id": "imp_001",
      "payer_id": "cont_001",
      "payer_nom": "DUPONT",
      "payer_prenom": "Jean",
      "nfacture": "F-2024-0156",
      "date_facture": "2024-01-01",
      "date_echeance": "2024-01-31",
      "montant_ttc": 5000.00,
      "reste_a_payer": 3500.00,
      "statut": "impaye",
      "facture_soldee": 0,
      "created_at": "2024-01-01T10:00:00Z"
    }
  ],
  "total": 45,
  "page": 1,
  "per_page": 100
}
```

### Requête SQL

```sql
SELECT 
    i.id,
    i.payer_id,
    c.nom as payer_nom,
    c.prenom as payer_prenom,
    i.nfacture,
    i.date_facture,
    i.date_echeance,
    i.montant_ttc,
    i.reste_a_payer,
    i.statut,
    i.facture_soldee,
    i.created_at
FROM impayes i
LEFT JOIN contacts c ON i.payer_id = c.id
WHERE (:statut IS NULL OR i.statut = :statut)
  AND (:facture_soldee IS NULL OR i.facture_soldee = :facture_soldee)
  AND (:date_from IS NULL OR i.date_echeance >= :date_from)
  AND (:date_to IS NULL OR i.date_echeance <= :date_to)
ORDER BY i.date_echeance ASC
LIMIT :limit OFFSET :offset;
```

---

## 2. Relances du Jour

**Description** : Récupère les relances programmées ou envoyées aujourd'hui. Affiché dans la carte KPI "Relances du jour".

### Endpoint

```
GET /api/relances
```

### Paramètres d'entrée (Query)

| Paramètre | Type | Obligatoire | Description |
|-----------|------|-------------|-------------|
| `today` | integer | non | Si 1, filtre uniquement les relances du jour |
| `statut` | string | non | Filtrer par statut (`brouillon`, `programmee`, `envoyee`, `annulee`) |
| `date_programmation` | string | non | Date de programmation spécifique (YYYY-MM-DD) |

### Réponse JSON (200 OK)

```json
{
  "relances": [
    {
      "id": "rel_001",
      "contact_id": "cont_001",
      "contact_nom": "ACME Corp",
      "statut": "envoyee",
      "date_envoi": "2024-01-15T09:00:00Z",
      "sujet": "Relance facture F-2024-0156",
      "sequence_id": "seq_001",
      "email_index": 1
    }
  ],
  "total": 18
}
```

### Requête SQL

```sql
SELECT 
    r.id,
    r.contact_id,
    c.nom as contact_nom,
    r.statut,
    r.date_envoi,
    r.sujet,
    r.sequence_id,
    r.email_index
FROM relances r
LEFT JOIN contacts c ON r.contact_id = c.id
WHERE (:today IS NULL OR DATE(r.date_envoi) = DATE('now') OR DATE(r.date_programmation) = DATE('now'))
  AND (:statut IS NULL OR r.statut = :statut)
  AND (:date_programmation IS NULL OR DATE(r.date_programmation) = :date_programmation)
ORDER BY r.date_envoi DESC, r.date_programmation DESC;
```

---

## 3. Événements Récents

**Description** : Récupère les événements d'activité récents avec jointure sur users pour afficher l'auteur. Utilisé dans la section "Événements récents".

### Endpoint

```
GET /api/events
```

### Paramètres d'entrée (Query)

| Paramètre | Type | Obligatoire | Description |
|-----------|------|-------------|-------------|
| `type` | string | non | Filtrer par type (`sync`, `payment`, `relance`, `alert`, `import`, `relance_cleaned`, `contact_blacklisted`, `payment_suspended`) |
| `limit` | integer | non | Nombre maximum d'événements (défaut: 10) |
| `page` | integer | non | Numéro de page (défaut: 1) |
| `per_page` | integer | non | Éléments par page (défaut: 10) |
| `unread_only` | integer | non | Si 1, filtre uniquement les événements non lus |

### Réponse JSON (200 OK)

```json
{
  "events": [
    {
      "id": "evt_001",
      "type": "sync",
      "icon": "fa-sync-alt",
      "titre": "Synchronisation effectuée",
      "description": "3 nouvelles factures importées depuis ADTI",
      "created_at": "2024-01-15T10:30:00Z",
      "user_id": "user_001",
      "user_username": "admin",
      "by_marki": 0,
      "read": 0
    }
  ],
  "total": 42,
  "page": 1,
  "per_page": 10
}
```

### Requête SQL

```sql
SELECT 
    e.id,
    e.type,
    COALESCE(e.icon, CASE e.type
        WHEN 'sync' THEN 'fa-sync-alt'
        WHEN 'payment' THEN 'fa-check-circle'
        WHEN 'relance' THEN 'fa-paper-plane'
        WHEN 'alert' THEN 'fa-exclamation-circle'
        WHEN 'import' THEN 'fa-file-import'
        WHEN 'relance_cleaned' THEN 'fa-broom'
        WHEN 'contact_blacklisted' THEN 'fa-ban'
        WHEN 'payment_suspended' THEN 'fa-pause-circle'
        ELSE 'fa-bell'
    END) as icon,
    e.titre,
    e.description,
    e.created_at,
    e.who_id as user_id,
    u.username as user_username,
    e.by_marki,
    e.read
FROM events e
LEFT JOIN users u ON e.who_id = u.id
LEFT JOIN contacts c ON e.who_id = c.id
WHERE (:type IS NULL OR e.type = :type)
  AND (:unread_only IS NULL OR e.read = 0)
ORDER BY e.created_at DESC
LIMIT :limit OFFSET :offset;
```

---

## 4. Dernière Synchronisation

**Description** : Récupère le dernier événement de synchronisation pour afficher l'heure de dernière synchro dans le header.

### Endpoint

```
GET /api/events/last-sync
```

### Paramètres d'entrée

*Aucun paramètre requis*

### Réponse JSON (200 OK)

```json
{
  "last_sync": {
    "id": "evt_001",
    "type": "sync",
    "titre": "Synchronisation effectuée",
    "created_at": "2024-01-15T09:45:00Z",
    "description": "15 factures importées"
  }
}
```

Ou 204 No Content si aucune synchro n'a été effectuée.

### Requête SQL

```sql
SELECT 
    e.id,
    e.type,
    e.titre,
    e.created_at,
    e.description
FROM events e
WHERE e.type IN ('sync', 'import')
ORDER BY e.created_at DESC
LIMIT 1;
```

---

## 5. Données du Graphique d'Évolution

**Description** : Récupère les données agrégées pour le graphique des 12 mois glissants (montants payés, restes à payer, nombre de factures).

### Endpoint

```
GET /api/impayes/chart-data
```

### Paramètres d'entrée (Query)

| Paramètre | Type | Obligatoire | Description |
|-----------|------|-------------|-------------|
| `date_from` | string | oui | Date de début (12 mois avant) format ISO 8601 |
| `date_to` | string | non | Date de fin (défaut: aujourd'hui) |

### Réponse JSON (200 OK)

```json
{
  "period": {
    "from": "2023-01-15",
    "to": "2024-01-15"
  },
  "factures": [
    {
      "id": "imp_001",
      "date_echeance": "2023-06-15",
      "montant_ttc": 5000.00,
      "reste_a_payer": 2500.00,
      "montant_paye": 2500.00,
      "statut": "impaye",
      "payer_id": "cont_001"
    }
  ],
  "aggregated": {
    "before": {
      "restesAPayer": 28000,
      "montantsPayes": 0,
      "facturesImpayees": 5
    },
    "months": [
      { "month": "Jan", "year": 2023, "montantsPayes": 52000, "restesAPayer": 32000, "facturesImpayees": 15 },
      { "month": "Fév", "year": 2023, "montantsPayes": 48000, "restesAPayer": 35000, "facturesImpayees": 18 }
    ]
  }
}
```

### Requête SQL

```sql
-- Récupération des factures pour calcul côté frontend
SELECT 
    i.id,
    i.date_echeance,
    i.montant_ttc,
    i.reste_a_payer,
    (i.montant_ttc - i.reste_a_payer) as montant_paye,
    i.statut,
    i.payer_id
FROM impayes i
WHERE i.date_echeance >= :date_from
  AND (:date_to IS NULL OR i.date_echeance <= :date_to)
  AND i.statut = 'impaye'
ORDER BY i.date_echeance ASC;
```

---

## 6. Top Débiteurs

**Description** : Récupère les 5 principaux débiteurs par montant total dû, avec calcul des jours de retard.

### Endpoint

```
GET /api/impayes/top-debiteurs
```

### Paramètres d'entrée (Query)

| Paramètre | Type | Obligatoire | Description |
|-----------|------|-------------|-------------|
| `limit` | integer | non | Nombre de débiteurs (défaut: 5, max: 20) |

### Réponse JSON (200 OK)

```json
{
  "debitors": [
    {
      "id": "cont_001",
      "name": "ACME Corp",
      "initials": "AC",
      "montant": 45230.00,
      "jours": 87,
      "impayesCount": 3,
      "relance": "R3"
    }
  ]
}
```

### Requête SQL

```sql
SELECT 
    c.id,
    COALESCE(NULLIF(c.prenom || ' ' || c.nom, ' '), c.nom, 'Inconnu') as name,
    SUBSTRING(COALESCE(c.prenom, '') || COALESCE(c.nom, ''), 1, 2) as initials,
    SUM(i.reste_a_payer) as montant,
    MAX(JULIANDAY('now') - JULIANDAY(i.date_echeance)) as jours,
    COUNT(i.id) as impayesCount,
    CASE 
        WHEN MAX(JULIANDAY('now') - JULIANDAY(i.date_echeance)) > 90 THEN 'R3'
        WHEN MAX(JULIANDAY('now') - JULIANDAY(i.date_echeance)) > 30 THEN 'R2'
        ELSE 'R1'
    END as relance
FROM impayes i
JOIN contacts c ON i.payer_id = c.id
WHERE i.reste_a_payer > 0
  AND i.statut = 'impaye'
  AND i.date_echeance < DATE('now')
GROUP BY c.id, c.nom, c.prenom
ORDER BY montant DESC
LIMIT :limit;
```

---

## 7. KPIs Dashboard (Agrégé)

**Description** : Route optimisée qui retourne tous les KPIs du dashboard en une seule requête. Alternative aux calculs frontend.

### Endpoint

```
GET /api/dashboard/kpis
```

### Paramètres d'entrée

*Aucun paramètre requis*

### Réponse JSON (200 OK)

```json
{
  "facturesEnAttente": 45,
  "impayesActifs": 28,
  "montantTotal": 128500.00,
  "relancesJour": 18,
  "tauxRecouvrement": 68,
  "dso": 42,
  "anciennete": {
    "moins7j": { "count": 12, "montant": 15400 },
    "j8a30": { "count": 15, "montant": 28300 },
    "j31a60": { "count": 10, "montant": 42100 },
    "j60a120": { "count": 8, "montant": 22700 },
    "plus120j": { "count": 5, "montant": 20100 }
  }
}
```

### Requêtes SQL

```sql
-- Factures en attente (reste > 0)
SELECT COUNT(*) as facturesEnAttente
FROM impayes
WHERE reste_a_payer > 0;

-- Impayés actifs (échus)
SELECT COUNT(*) as impayesActifs
FROM impayes
WHERE date_echeance < DATE('now')
  AND reste_a_payer > 0
  AND statut = 'impaye';

-- Montant total
SELECT SUM(reste_a_payer) as montantTotal
FROM impayes
WHERE date_echeance < DATE('now')
  AND reste_a_payer > 0;

-- Relances du jour
SELECT COUNT(*) as relancesJour
FROM relances
WHERE DATE(date_envoi) = DATE('now')
   OR DATE(date_programmation) = DATE('now');

-- Taux de recouvrement (M-1)
WITH mois_precedent AS (
    SELECT 
        SUM(CASE WHEN reste_a_payer = 0 THEN montant_ttc ELSE 0 END) as paye,
        SUM(montant_ttc) as total
    FROM impayes
    WHERE strftime('%Y-%m', date_echeance) = strftime('%Y-%m', DATE('now', '-1 month'))
)
SELECT 
    CASE 
        WHEN total > 0 THEN ROUND((paye * 100.0 / total), 0)
        ELSE 0
    END as tauxRecouvrement
FROM mois_precedent;

-- DSO (Days Sales Outstanding)
SELECT 
    CASE 
        WHEN SUM(reste_a_payer) > 0 
        THEN ROUND(SUM((JULIANDAY('now') - JULIANDAY(date_echeance)) * reste_a_payer) / SUM(reste_a_payer), 0)
        ELSE 0
    END as dso
FROM impayes
WHERE date_echeance < DATE('now') AND reste_a_payer > 0;

-- Ancienneté - Moins de 7 jours
SELECT 
    COUNT(*) as count,
    SUM(reste_a_payer) as montant
FROM impayes
WHERE date_echeance >= DATE('now', '-7 days')
  AND reste_a_payer > 0;

-- Ancienneté - 8 à 30 jours
SELECT 
    COUNT(*) as count,
    SUM(reste_a_payer) as montant
FROM impayes
WHERE date_echeance < DATE('now', '-7 days')
  AND date_echeance >= DATE('now', '-30 days')
  AND reste_a_payer > 0;

-- Ancienneté - 31 à 60 jours
SELECT 
    COUNT(*) as count,
    SUM(reste_a_payer) as montant
FROM impayes
WHERE date_echeance < DATE('now', '-30 days')
  AND date_echeance >= DATE('now', '-60 days')
  AND reste_a_payer > 0;

-- Ancienneté - 60 à 120 jours
SELECT 
    COUNT(*) as count,
    SUM(reste_a_payer) as montant
FROM impayes
WHERE date_echeance < DATE('now', '-60 days')
  AND date_echeance >= DATE('now', '-120 days')
  AND reste_a_payer > 0;

-- Ancienneté - Plus de 120 jours
SELECT 
    COUNT(*) as count,
    SUM(reste_a_payer) as montant
FROM impayes
WHERE date_echeance < DATE('now', '-120 days')
  AND reste_a_payer > 0;
```

---

## 8. Synchronisation des Données

**Description** : Lance le workflow de synchronisation des factures depuis la source externe (ADTI). Crée un événement de type `sync`.

### Endpoint

```
POST /api/workflows/sync-orchestrator
```

### Paramètres d'entrée (Body JSON)

| Paramètre | Type | Obligatoire | Description |
|-----------|------|-------------|-------------|
| `force` | boolean | non | Forcer la synchro même si une est en cours |
| `date_from` | string | non | Date de début pour import partiel |

### Réponse JSON (200 OK)

```json
{
  "success": true,
  "imported_count": 15,
  "updated_count": 3,
  "errors": [],
  "duration_seconds": 12.5,
  "event_id": "evt_002"
}
```

### Requête SQL

```sql
-- Création de l'événement de sync
INSERT INTO events (id, type, titre, description, created_at, by_marki, icon)
VALUES (
    LOWER(HEX(RANDOMBLOB(16))),
    'sync',
    'Synchronisation effectuée',
    :imported_count || ' factures importées',
    DATETIME('now'),
    0,
    'fa-sync-alt'
);
```

---

## 9. Marquer Événement comme Lu

**Description** : Marque un événement spécifique comme lu (la persistence est gérée en localStorage côté frontend, mais cette route permet la sync cross-device).

### Endpoint

```
POST /api/events/:id/read
```

Ou

```
POST /api/events/read-all
```

### Paramètres d'entrée (Body JSON pour read-all)

| Paramètre | Type | Obligatoire | Description |
|-----------|------|-------------|-------------|
| `event_ids` | array | oui | Liste des IDs d'événements à marquer comme lus |

### Réponse JSON (200 OK)

```json
{
  "success": true,
  "marked_count": 5
}
```

### Requête SQL

```sql
-- Marquer un événement comme lu
UPDATE events
SET read = 1
WHERE id = :event_id;

-- Marquer tous les événements comme lus
UPDATE events
SET read = 1
WHERE read = 0;
```

---

## Résumé des Routes

| # | Méthode | Endpoint | Usage Principal |
|---|---------|----------|-----------------|
| 1 | GET | `/api/impayes` | Liste impayés avec filtres |
| 2 | GET | `/api/relances?today=1` | Relances du jour (KPI) |
| 3 | GET | `/api/events` | Événements récents |
| 4 | GET | `/api/events/last-sync` | Heure dernière synchro |
| 5 | GET | `/api/impayes/chart-data` | Données graphique 12 mois |
| 6 | GET | `/api/impayes/top-debiteurs` | Top 5 débiteurs |
| 7 | GET | `/api/dashboard/kpis` | Tous les KPIs agrégés |
| 8 | POST | `/api/workflows/sync-orchestrator` | Lancer synchronisation |
| 9 | POST | `/api/events/:id/read` | Marquer comme lu |

---

## Notes d'Implémentation

1. **Authentification** : Toutes les routes nécessitent un token JWT dans le header `Authorization: Bearer <token>`
2. **Pagination** : Les routes list utilisent `page` et `per_page` avec un maximum de 100 éléments par page
3. **Format dates** : Toutes les dates sont en format ISO 8601 (YYYY-MM-DDTHH:mm:ssZ)
4. **SQLite** : Les requêtes utilisent la syntaxe SQLite (JULIANDAY pour les calculs de dates)
5. **Caching** : Les routes KPI peuvent être mises en cache côté serveur (TTL: 5 minutes)
