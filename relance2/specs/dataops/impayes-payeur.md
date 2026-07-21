# DataOps - Impayés par Payeur

Analyse des interactions data pour l'écran "Impayés par Payeur" (mockups/impayes-payeur.html)
Basé sur schema.sql et les workflows frontend dans specs/workflows/frontend/impayes-payeur/

---

## Route 1: Liste des impayés groupés par payeur

**Titre** : Récupérer les impayés groupés par payeur  
**Description** : Renvoie la liste des impayés agrégés par payeur, avec possibilité de filtrer par nom/email, filtrer par montant minimum, trier par différents critères. Supporte la pagination côté serveur.

### Endpoint
```
GET /api/impayes/payeur
```

### Paramètres d'entrée (Query String)

| Paramètre | Type | Requis | Description |
|-----------|------|--------|-------------|
| `search` | string | Non | Recherche sur nom ou email du payeur (LIKE %%) |
| `min_montant` | number | Non | Montant total minimum du groupe (ex: 1000, 5000, 10000, 25000) |
| `sort_by` | string | Non | Critère de tri: `montant_desc`, `montant_asc`, `nom_asc`, `factures_desc` |
| `page` | integer | Non | Numéro de page (défaut: 1) |
| `per_page` | integer | Non | Nombre de résultats par page (défaut: 5) |

### Réponse JSON (200 OK)

```json
{
  "success": true,
  "data": {
    "total_payeurs": 12,
    "total_global": 156750.00,
    "page": 1,
    "per_page": 5,
    "total_pages": 3,
    "groupes": [
      {
        "payeur": {
          "id": "acme-corp-uuid",
          "nom": "ACME Corp",
          "email": "contact@acme.fr",
          "initials": "AC"
        },
        "total_reste": 20800.00,
        "nb_factures": 2,
        "nb_factures_suspendues": 0,
        "factures": [
          {
            "id": "impaye-001",
            "numero": "FAC-2024-001",
            "numero_dossier": "D-2024-045",
            "date_facture": "2024-01-15",
            "date_echeance": "2024-02-15",
            "montant_ttc": 12500.00,
            "reste_a_payer": 12500.00,
            "sequence": "R1",
            "statut": "en-relance",
            "note": ""
          },
          {
            "id": "impaye-007",
            "numero": "FAC-2024-007",
            "numero_dossier": "D-2024-051",
            "date_facture": "2024-01-12",
            "date_echeance": "2024-02-12",
            "montant_ttc": 8300.00,
            "reste_a_payer": 8300.00,
            "sequence": "R2",
            "statut": "en-relance",
            "note": ""
          }
        ]
      }
    ]
  }
}
```

### Requête SQL

```sql
-- CTE pour récupérer les impayés actifs avec infos payeur
WITH impayes_actifs AS (
  SELECT 
    i.id,
    i.nfacture AS numero,
    i.numero_dossier,
    i.date_facture,
    i.date_echeance,
    i.montant_ttc,
    i.reste_a_payer,
    i.sequence_id,
    i.statut,
    i.notes_json,
    COALESCE(p.id, 'unknown_' || i.payeur_email) AS payeur_id,
    COALESCE(p.nom, i.payeur_nom) AS payeur_nom,
    COALESCE(p.email, i.payeur_email) AS payeur_email,
    COALESCE(p.prenom, i.payeur_prenom) AS payeur_prenom
  FROM impayes i
  LEFT JOIN contacts p ON i.payer_id = p.id
  WHERE i.facture_soldee = 0
    AND i.is_blacklisted = 0
    AND i.reste_a_payer > 0
),
-- Filtrage par recherche
impayes_filtres AS (
  SELECT *
  FROM impayes_actifs
  WHERE (:search IS NULL 
    OR LOWER(COALESCE(payeur_nom, '')) LIKE '%' || LOWER(:search) || '%' 
    OR LOWER(COALESCE(payeur_email, '')) LIKE '%' || LOWER(:search) || '%')
),
-- Agrégation par payeur
groupes_payeur AS (
  SELECT 
    payeur_id,
    payeur_nom,
    payeur_email,
    payeur_prenom,
    UPPER(
      SUBSTR(COALESCE(payeur_nom, ''), 1, 1) || 
      SUBSTR(COALESCE(payeur_prenom, ''), 1, 1)
    ) AS initials,
    json_group_array(
      json_object(
        'id', id,
        'numero', numero,
        'numero_dossier', numero_dossier,
        'date_facture', date_facture,
        'date_echeance', date_echeance,
        'montant_ttc', montant_ttc,
        'reste_a_payer', reste_a_payer,
        'sequence', sequence_id,
        'statut', statut,
        'note', notes_json
      )
    ) AS factures_json,
    SUM(reste_a_payer) AS total_reste,
    COUNT(*) AS nb_factures,
    SUM(CASE WHEN statut = 'suspendue' THEN 1 ELSE 0 END) AS nb_factures_suspendues
  FROM impayes_filtres
  GROUP BY payeur_id, payeur_nom, payeur_email, payeur_prenom
),
-- Filtrage par montant minimum
groupes_filtres AS (
  SELECT *
  FROM groupes_payeur
  WHERE (:min_montant IS NULL OR total_reste >= :min_montant)
)
-- Résultat final avec tri et pagination
SELECT 
  payeur_id AS id,
  json_object(
    'id', payeur_id,
    'nom', payeur_nom,
    'email', payeur_email,
    'initials', initials
  ) AS payeur,
  total_reste,
  nb_factures,
  nb_factures_suspendues,
  factures_json AS factures
FROM groupes_filtres
ORDER BY 
  CASE WHEN :sort_by = 'montant_desc' THEN total_reste END DESC,
  CASE WHEN :sort_by = 'montant_asc' THEN total_reste END ASC,
  CASE WHEN :sort_by = 'nom_asc' THEN LOWER(COALESCE(payeur_nom, '')) END ASC,
  CASE WHEN :sort_by = 'factures_desc' THEN nb_factures END DESC,
  total_reste DESC
LIMIT :per_page OFFSET :offset;
```

**Requête de comptage total:**

```sql
SELECT 
  COUNT(DISTINCT payeur_id) AS total_payeurs,
  SUM(total_reste) AS total_global
FROM (
  SELECT 
    COALESCE(p.id, 'unknown_' || i.payeur_email) AS payeur_id,
    SUM(i.reste_a_payer) AS total_reste
  FROM impayes i
  LEFT JOIN contacts p ON i.payer_id = p.id
  WHERE i.facture_soldee = 0 
    AND i.is_blacklisted = 0 
    AND i.reste_a_payer > 0
    AND (:search IS NULL 
      OR LOWER(COALESCE(i.payeur_nom, '')) LIKE '%' || LOWER(:search) || '%'
      OR LOWER(COALESCE(i.payeur_email, '')) LIKE '%' || LOWER(:search) || '%')
  GROUP BY COALESCE(p.id, 'unknown_' || i.payeur_email), i.payeur_nom, i.payeur_email
  HAVING (:min_montant IS NULL OR SUM(i.reste_a_payer) >= :min_montant)
);
```

---

## Route 2: Détail d'un impayé

**Titre** : Récupérer le détail d'un impayé  
**Description** : Renvoie toutes les informations d'une facture impayée pour affichage dans le modal de détail.

### Endpoint
```
GET /api/impayes/:id
```

### Paramètres d'entrée (URL)

| Paramètre | Type | Requis | Description |
|-----------|------|--------|-------------|
| `id` | string | Oui | UUID de l'impayé |

### Réponse JSON (200 OK)

```json
{
  "success": true,
  "data": {
    "id": "impaye-001",
    "numero": "FAC-2024-001",
    "numero_dossier": "D-2024-045",
    "date_facture": "2024-01-15",
    "date_echeance": "2024-02-15",
    "montant_ttc": 12500.00,
    "reste_a_payer": 12500.00,
    "sequence": "R1",
    "statut": "en-relance",
    "note": "Client a promis de payer la semaine prochaine",
    "payeur": {
      "id": "acme-corp-uuid",
      "nom": "ACME Corp",
      "email": "contact@acme.fr"
    },
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-07-10T14:20:00Z"
  }
}
```

### Requête SQL

```sql
SELECT 
  i.id,
  i.nfacture AS numero,
  i.numero_dossier,
  i.date_facture,
  i.date_echeance,
  i.montant_ttc,
  i.reste_a_payer,
  i.sequence_id AS sequence,
  i.statut,
  i.notes_json AS note,
  i.created_at,
  i.updated_at,
  json_object(
    'id', COALESCE(p.id, 'unknown'),
    'nom', COALESCE(p.nom, i.payeur_nom),
    'email', COALESCE(p.email, i.payeur_email)
  ) AS payeur
FROM impayes i
LEFT JOIN contacts p ON i.payer_id = p.id
WHERE i.id = :id;
```

---

## Route 3: Mise à jour de la note d'un impayé

**Titre** : Mettre à jour la note personnelle d'un impayé  
**Description** : Enregistre une note personnelle sur une facture impayée (champ notes_json de la table impayes).

### Endpoint
```
PUT /api/impayes/:id/notes
```

### Paramètres d'entrée

**URL Parameters:**
| Paramètre | Type | Requis | Description |
|-----------|------|--------|-------------|
| `id` | string | Oui | UUID de l'impayé |

**Body JSON:**
```json
{
  "note": "Client a promis de payer la semaine prochaine"
}
```

### Réponse JSON (200 OK)

```json
{
  "success": true,
  "message": "Note mise à jour avec succès",
  "data": {
    "id": "impaye-001",
    "note": "Client a promis de payer la semaine prochaine",
    "updated_at": "2024-07-21T10:15:30Z"
  }
}
```

### Requête SQL

```sql
UPDATE impayes 
SET 
  notes_json = :note,
  updated_at = CURRENT_TIMESTAMP
WHERE id = :id;
```

---

## Route 4: Mise à jour de la séquence d'un impayé

**Titre** : Modifier la séquence de relance d'un impayé  
**Description** : Met à jour la séquence de relance associée à une facture (R1, R2, R3, R4 ou vide).

### Endpoint
```
PUT /api/impayes/:id/sequence
```

### Paramètres d'entrée

**URL Parameters:**
| Paramètre | Type | Requis | Description |
|-----------|------|--------|-------------|
| `id` | string | Oui | UUID de l'impayé |

**Body JSON:**
```json
{
  "sequence": "R2"
}
```

Valeurs possibles pour `sequence`: `""`, `"R1"`, `"R2"`, `"R3"`, `"R4"`

### Réponse JSON (200 OK)

```json
{
  "success": true,
  "message": "Séquence mise à jour avec succès",
  "data": {
    "id": "impaye-001",
    "sequence": "R2",
    "updated_at": "2024-07-21T10:15:30Z"
  }
}
```

### Requête SQL

```sql
UPDATE impayes 
SET 
  sequence_id = :sequence,
  updated_at = CURRENT_TIMESTAMP
WHERE id = :id;
```

---

## Route 5: Mise à jour complète d'un impayé (Note + Séquence)

**Titre** : Mettre à jour note et séquence d'un impayé  
**Description** : Met à jour simultanément la note et la séquence d'une facture depuis le modal de détail.

### Endpoint
```
PUT /api/impayes/:id
```

### Paramètres d'entrée

**URL Parameters:**
| Paramètre | Type | Requis | Description |
|-----------|------|--------|-------------|
| `id` | string | Oui | UUID de l'impayé |

**Body JSON:**
```json
{
  "note": "Client a promis de payer la semaine prochaine",
  "sequence": "R2"
}
```

### Réponse JSON (200 OK)

```json
{
  "success": true,
  "message": "Impayé mis à jour avec succès",
  "data": {
    "id": "impaye-001",
    "numero": "FAC-2024-001",
    "sequence": "R2",
    "note": "Client a promis de payer la semaine prochaine",
    "updated_at": "2024-07-21T10:15:30Z"
  }
}
```

### Requête SQL

```sql
UPDATE impayes 
SET 
  notes_json = COALESCE(:note, notes_json),
  sequence_id = COALESCE(:sequence, sequence_id),
  updated_at = CURRENT_TIMESTAMP
WHERE id = :id
RETURNING id, nfacture AS numero, sequence_id AS sequence, notes_json AS note, updated_at;
```

---

## Route 6: Synchronisation des impayés

**Titre** : Déclencher la synchronisation des impayés  
**Description** : Lance une synchronisation des données impayés depuis la source externe (ERP/CRM). Appelle le workflow backend `import-invoices`.

### Endpoint
```
POST /api/impayes/sync
```

### Paramètres d'entrée (Body JSON)

| Paramètre | Type | Requis | Description |
|-----------|------|--------|-------------|
| `force` | boolean | Non | Forcer la sync même si déjà récente |
| `filters` | object | Non | Filtres pour la sync (date_debut, date_fin) |

**Body JSON:**
```json
{
  "force": false,
  "filters": {
    "date_debut": "2024-01-01",
    "date_fin": "2024-12-31"
  }
}
```

### Réponse JSON (200 OK)

```json
{
  "success": true,
  "message": "Synchronisation terminée",
  "data": {
    "imported": 45,
    "updated": 12,
    "deleted": 0,
    "duration_ms": 1250
  }
}
```

### Requête SQL (Workflow backend)

```sql
-- Insertion des nouvelles factures importées
INSERT INTO impayes (
  id, payer_id, nfacture, numero_dossier, date_facture, 
  date_echeance, montant_ttc, reste_a_payer, statut,
  payeur_nom, payeur_email, created_at, updated_at
) VALUES (
  :id, :payer_id, :nfacture, :numero_dossier, :date_facture,
  :date_echeance, :montant_ttc, :reste_a_payer, 'impaye',
  :payeur_nom, :payeur_email, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
) ON CONFLICT (id) DO UPDATE SET
  reste_a_payer = EXCLUDED.reste_a_payer,
  statut = EXCLUDED.statut,
  updated_at = CURRENT_TIMESTAMP;

-- Création d'un event de synchronisation
INSERT INTO events (
  id, type, titre, description, entity_type, read, created_at
) VALUES (
  :event_id, 'sync', 'Synchronisation impayés', 
  :imported || ' factures importées, ' || :updated || ' mises à jour',
  'impayes', 0, CURRENT_TIMESTAMP
);
```

---

## Route 7: Liste des séquences disponibles

**Titre** : Récupérer les séquences de relance disponibles  
**Description** : Renvoie la liste des séquences actives pour le dropdown du modal de détail.

### Endpoint
```
GET /api/sequences
```

### Paramètres d'entrée (Query String)

| Paramètre | Type | Requis | Description |
|-----------|------|--------|-------------|
| `actif` | integer | Non | Filtrer uniquement les actives (1) |

### Réponse JSON (200 OK)

```json
{
  "success": true,
  "data": [
    { "id": "seq-r1", "nom": "R1 - Première relance", "code": "R1", "niveau": 1 },
    { "id": "seq-r2", "nom": "R2 - Deuxième relance", "code": "R2", "niveau": 2 },
    { "id": "seq-r3", "nom": "R3 - Troisième relance", "code": "R3", "niveau": 3 },
    { "id": "seq-r4", "nom": "R4 - Dernière relance", "code": "R4", "niveau": 4 }
  ]
}
```

### Requête SQL

```sql
SELECT 
  id,
  nom,
  COALESCE(scenario, id) AS code,
  niveau
FROM sequences
WHERE actif = COALESCE(:actif, 1)
ORDER BY niveau ASC, nom ASC;
```

---

## Route 8: Liste brute des impayés (alternative frontend)

**Titre** : Récupérer tous les impayés  
**Description** : Renvoie la liste brute des impayés pour traitement côté client (approche alternative aux routes groupées par payeur).

### Endpoint
```
GET /api/impayes
```

### Paramètres d'entrée (Query String)

| Paramètre | Type | Requis | Description |
|-----------|------|--------|-------------|
| `facture_soldee` | integer | Non | 0 = impayés seulement |
| `statut` | string | Non | Filtrer par statut (`impaye`, `en-relance`, `suspendue`) |
| `limit` | integer | Non | Limite de résultats |
| `offset` | integer | Non | Offset pour pagination |

### Réponse JSON (200 OK)

```json
{
  "success": true,
  "data": {
    "total": 150,
    "impayes": [
      {
        "id": "impaye-001",
        "nfacture": "FAC-2024-001",
        "numero_dossier": "D-2024-045",
        "date_facture": "2024-01-15",
        "date_echeance": "2024-02-15",
        "montant_ttc": 12500.00,
        "reste_a_payer": 12500.00,
        "sequence_id": "R1",
        "statut": "en-relance",
        "notes_json": null,
        "payer_id": "acme-corp-uuid",
        "payeur_nom": "ACME Corp",
        "payeur_email": "contact@acme.fr"
      }
    ]
  }
}
```

### Requête SQL

```sql
SELECT 
  i.id,
  i.nfacture,
  i.numero_dossier,
  i.date_facture,
  i.date_echeance,
  i.montant_ttc,
  i.reste_a_payer,
  i.sequence_id,
  i.statut,
  i.notes_json,
  i.payer_id,
  COALESCE(p.nom, i.payeur_nom) AS payeur_nom,
  COALESCE(p.email, i.payeur_email) AS payeur_email
FROM impayes i
LEFT JOIN contacts p ON i.payer_id = p.id
WHERE i.facture_soldee = COALESCE(:facture_soldee, 0)
  AND i.is_blacklisted = 0
  AND (:statut IS NULL OR i.statut = :statut)
ORDER BY i.date_echeance ASC
LIMIT :limit OFFSET :offset;
```

---

## Résumé des Routes

| Méthode | Endpoint | Description | Usage Frontend |
|---------|----------|-------------|----------------|
| GET | `/api/impayes/payeur` | Liste groupée par payeur | Chargement initial + filtres |
| GET | `/api/impayes/:id` | Détail d'un impayé | Modal détail |
| PUT | `/api/impayes/:id/notes` | Maj note | Bouton "Enregistrer" modal |
| PUT | `/api/impayes/:id/sequence` | Maj séquence | Dropdown séquence modal |
| PUT | `/api/impayes/:id` | Maj complète | Sauvegarde modal (note + séquence) |
| POST | `/api/impayes/sync` | Synchronisation | Bouton "Synchroniser" |
| GET | `/api/sequences` | Liste séquences | Dropdown séquences |
| GET | `/api/impayes` | Liste brute | Alternative full-frontend |

---

## Mapping des Champs Mockup ↔ Base de Données

| Champ Mockup | Champ SQL | Table | Notes |
|--------------|-----------|-------|-------|
| `facture.id` | `id` | impayes | UUID |
| `facture.numero` | `nfacture` | impayes | Numéro facture |
| `facture.numeroDossier` | `numero_dossier` | impayes | Référence dossier |
| `facture.dateFacture` | `date_facture` | impayes | Format ISO (affichage FR) |
| `facture.echeance` | `date_echeance` | impayes | Format ISO (affichage FR) |
| `facture.montant` | `montant_ttc` | impayes | Montant TTC |
| `facture.resteAPayer` | `reste_a_payer` | impayes | Reste dû |
| `facture.sequence` | `sequence_id` | impayes | R1, R2, R3, R4 ou vide |
| `facture.statut` | `statut` | impayes | non-payee/en-relance/suspendue |
| `facture.note` | `notes_json` | impayes | Note sur la facture |
| `payeur.id` | `payer_id` | impayes | FK vers contacts |
| `payeur.nom` | `payeur_nom` / `contacts.nom` | impayes/contacts | Fallback si pas de contact |
| `payeur.email` | `payeur_email` / `contacts.email` | impayes/contacts | Fallback si pas de contact |
| `payeur.initials` | Calculé | - | SUBSTR(nom,1,1) + SUBSTR(prenom,1,1) |

---

## Workflows Frontend Associés

| Workflow | Déclencheur | Route API | Description |
|----------|-------------|-----------|-------------|
| `initial-load.md` | x-init | `GET /api/impayes/payeur` | Chargement initial groupé |
| `sync-data.md` | Bouton Sync | `POST /api/impayes/sync` | Synchronisation ADTI |
| `open-detail.md` | Click facture | `GET /api/impayes/:id` | Ouverture modal |
| `close-detail.md` | Click fermer | - | Action client uniquement |
| `save-note.md` | Bouton Enregistrer | `PUT /api/impayes/:id` | Sauvegarde note+séquence |
| `pagination-next.md` | Bouton next | - | Pagination client |
| `pagination-prev.md` | Bouton prev | - | Pagination client |

---

## Notes d'Implémentation

1. **Groupement par payeur**: La route `/api/impayes/payeur` effectue l'agrégation côté serveur via SQL pour optimiser les performances.

2. **Pagination**: La pagination est gérée côté serveur pour la liste groupée, mais les workflows frontend suggèrent également une pagination côté client possible avec la route `/api/impayes`.

3. **Fallback payeur**: Si `payer_id` est NULL, les champs `payeur_nom` et `payeur_email` de la table `impayes` sont utilisés comme fallback.

4. **Calcul des initiales**: Les initiales du payeur sont calculées dynamiquement: `UPPER(SUBSTR(nom,1,1) || SUBSTR(prenom,1,1))`.

5. **Filtres**: Les filtres `search`, `min_montant` et `sort_by` sont appliqués côté serveur pour réduire le volume de données transféré.

6. **Notes**: Contrairement au workflow `save-note.md` initial qui mentionnait les notes du contact, le mockup montre des notes au niveau de la **facture** (table `impayes.notes_json`).
