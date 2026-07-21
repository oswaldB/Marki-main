# DataOps - Impayés (Écran Principal)

Analyse des interactions data pour l'écran "Impayés" (mockups/impayes.html)
Basé sur l'analyse des workflows dans app/templates/impayes/workflows/

---

## Route 1: Liste des impayés paginée

**Titre** : Récupérer la liste paginée des factures impayées  
**Description** : Renvoie la liste paginée des impayés avec filtres (statut, séquence), recherche textuelle, et tri. Utilisé par initial-load.html et les workflows de tri/pagination.

### Endpoint
```
GET /api/impayes
```

### Paramètres d'entrée (Query String)

| Paramètre | Type | Requis | Description |
|-----------|------|--------|-------------|
| `page` | integer | Non | Numéro de page (défaut: 1) |
| `per_page` | integer | Non | Nombre de résultats par page (défaut: 10) |
| `search` | string | Non | Recherche sur N° facture, N° dossier, nom payeur |
| `statut` | string | Non | Filtrer par statut: `non-payee`, `en-relance`, `suspendue`, `a-reparer` |
| `sequence_id` | string | Non | Filtrer par séquence: `R1`, `R2`, `R3`, `R4` |
| `order_by` | string | Non | Colonne de tri: `numero`, `numero_dossier`, `payeur_nom`, `montant`, `reste_a_payer`, `date_echeance` |
| `order` | string | Non | Direction: `ASC` ou `DESC` (défaut: `DESC`) |

### Réponse JSON (200 OK)

```json
{
  "success": true,
  "data": {
    "impayes": [
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
        "notes_json": "[{\"content\":\"Client a promis...\",\"author\":\"user\",\"date\":\"2024-01-20\"}]",
        "payeur": {
          "id": "payeur-001",
          "nom": "ACME Corp",
          "email": "contact@acme.fr",
          "initials": "AC"
        }
      }
    ],
    "total": 156,
    "page": 1,
    "per_page": 10,
    "total_pages": 16
  }
}
```

### Requête SQL

```sql
-- Requête principale avec filtres et pagination
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
  i.notes_json,
  json_object(
    'id', p.id,
    'nom', COALESCE(p.nom, i.payeur_nom, 'Non assigné'),
    'email', COALESCE(p.email, i.payeur_email, ''),
    'initials', UPPER(
      COALESCE(SUBSTR(COALESCE(p.nom, i.payeur_nom, ''), 1, 1), '') ||
      COALESCE(SUBSTR(COALESCE(p.prenom, i.payeur_prenom, ''), 1, 1), '')
    )
  ) AS payeur
FROM impayes i
LEFT JOIN contacts p ON i.payer_id = p.id
WHERE i.facture_soldee = 0
  AND (:statut IS NULL OR i.statut = :statut)
  AND (:sequence_id IS NULL OR i.sequence_id = :sequence_id)
  AND (
    :search IS NULL OR
    LOWER(i.nfacture) LIKE '%' || LOWER(:search) || '%' OR
    LOWER(i.numero_dossier) LIKE '%' || LOWER(:search) || '%' OR
    LOWER(COALESCE(p.nom, i.payeur_nom, '')) LIKE '%' || LOWER(:search) || '%'
  )
ORDER BY 
  CASE WHEN :order_by = 'numero' AND :order = 'ASC' THEN i.nfacture END ASC,
  CASE WHEN :order_by = 'numero' AND :order = 'DESC' THEN i.nfacture END DESC,
  CASE WHEN :order_by = 'numero_dossier' AND :order = 'ASC' THEN i.numero_dossier END ASC,
  CASE WHEN :order_by = 'numero_dossier' AND :order = 'DESC' THEN i.numero_dossier END DESC,
  CASE WHEN :order_by = 'payeur_nom' AND :order = 'ASC' THEN COALESCE(p.nom, i.payeur_nom) END ASC,
  CASE WHEN :order_by = 'payeur_nom' AND :order = 'DESC' THEN COALESCE(p.nom, i.payeur_nom) END DESC,
  CASE WHEN :order_by = 'montant' AND :order = 'ASC' THEN i.montant_ttc END ASC,
  CASE WHEN :order_by = 'montant' AND :order = 'DESC' THEN i.montant_ttc END DESC,
  CASE WHEN :order_by = 'reste_a_payer' AND :order = 'ASC' THEN i.reste_a_payer END ASC,
  CASE WHEN :order_by = 'reste_a_payer' AND :order = 'DESC' THEN i.reste_a_payer END DESC,
  CASE WHEN :order_by = 'date_echeance' AND :order = 'ASC' THEN i.date_echeance END ASC,
  CASE WHEN :order_by = 'date_echeance' AND :order = 'DESC' THEN i.date_echeance END DESC
LIMIT :per_page OFFSET :offset;

-- Requête comptage total
SELECT COUNT(*) AS total
FROM impayes i
LEFT JOIN contacts p ON i.payer_id = p.id
WHERE i.facture_soldee = 0
  AND (:statut IS NULL OR i.statut = :statut)
  AND (:sequence_id IS NULL OR i.sequence_id = :sequence_id)
  AND (
    :search IS NULL OR
    LOWER(i.nfacture) LIKE '%' || LOWER(:search) || '%' OR
    LOWER(i.numero_dossier) LIKE '%' || LOWER(:search) || '%' OR
    LOWER(COALESCE(p.nom, i.payeur_nom, '')) LIKE '%' || LOWER(:search) || '%'
  );
```

---

## Route 2: Détail d'un impayé

**Titre** : Récupérer le détail complet d'une facture impayée  
**Description** : Renvoie toutes les informations d'un impayé pour affichage dans le panneau de détail (open-detail.html).

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
    "total_ht": 10416.67,
    "sequence": "R1",
    "statut": "en-relance",
    "notes_json": "[{\"content\":\"Client a promis...\",\"author\":\"user\",\"date\":\"2024-01-20\"}]",
    "url_pdf": "/pdf/facture-001.pdf",
    "payeur": {
      "id": "payeur-001",
      "nom": "ACME Corp",
      "email": "contact@acme.fr",
      "telephone": "01 23 45 67 89",
      "initials": "AC"
    },
    "proprietaire": {
      "nom": "Dupont",
      "prenom": "Jean",
      "email": "jean.dupont@email.com"
    },
    "adresse_bien": "123 Rue de Paris",
    "ville": "Paris",
    "code_postal": "75001"
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
  i.total_ht,
  i.sequence_id AS sequence,
  i.statut,
  i.notes_json,
  i.url_pdf,
  json_object(
    'id', p.id,
    'nom', COALESCE(p.nom, i.payeur_nom, 'Non assigné'),
    'email', COALESCE(p.email, i.payeur_email, ''),
    'telephone', COALESCE(p.telephone, i.payeur_telephone, ''),
    'initials', UPPER(
      COALESCE(SUBSTR(COALESCE(p.nom, i.payeur_nom, ''), 1, 1), '') ||
      COALESCE(SUBSTR(COALESCE(p.prenom, i.payeur_prenom, ''), 1, 1), '')
    )
  ) AS payeur,
  json_object(
    'nom', COALESCE(prop.nom, i.proprietaire_nom, ''),
    'prenom', COALESCE(prop.prenom, i.proprietaire_prenom, ''),
    'email', COALESCE(prop.email, i.proprietaire_email, '')
  ) AS proprietaire,
  i.adresse_bien,
  i.ville,
  i.code_postal
FROM impayes i
LEFT JOIN contacts p ON i.payer_id = p.id
LEFT JOIN contacts prop ON i.proprietaire_id = prop.id
WHERE i.id = :id;
```

---

## Route 3: Mise à jour d'un impayé (Notes et Séquence)

**Titre** : Mettre à jour les notes et/ou la séquence d'un impayé  
**Description** : Permet de modifier les notes JSON et/ou la séquence d'une facture. Utilisé par save-note.html, delete-note.html, et update-sequence.html.

### Endpoint
```
PUT /api/impayes/:id
```

### Paramètres d'entrée (URL + Body)

**URL Parameters:**
| Paramètre | Type | Requis | Description |
|-----------|------|--------|-------------|
| `id` | string | Oui | UUID de l'impayé |

**Body JSON:**
```json
{
  "notes_json": "[{\"content\":\"Nouvelle note\",\"author\":\"user@marki.fr\",\"date\":\"2024-01-20T10:30:00Z\"}]",
  "sequence_code": "R2",
  "updated_at": "2024-01-20T10:30:00Z"
}
```

| Champ | Type | Requis | Description |
|-------|------|--------|-------------|
| `notes_json` | string | Non | Notes au format JSON array |
| `sequence_code` | string | Non | Code séquence: `R1`, `R2`, `R3`, `R4` ou vide |
| `updated_at` | string | Non | Timestamp ISO 8601 |

### Réponse JSON (200 OK)

```json
{
  "success": true,
  "message": "Impayé mis à jour avec succès",
  "data": {
    "id": "impaye-001",
    "notes_json": "[{\"content\":\"Nouvelle note\"...}]",
    "sequence": "R2",
    "updated_at": "2024-01-20T10:30:00Z"
  }
}
```

### Requête SQL

```sql
UPDATE impayes 
SET 
  notes_json = COALESCE(:notes_json, notes_json),
  sequence_id = COALESCE(:sequence_code, sequence_id),
  updated_at = COALESCE(:updated_at, CURRENT_TIMESTAMP)
WHERE id = :id
RETURNING id, notes_json, sequence_id AS sequence, updated_at;
```

---

## Route 4: Suspendre une facture

**Titre** : Suspendre une facture impayée  
**Description** : Suspend la facture (statut = 'suspendue') et annule les relances programmées. Utilisé par suspend-facture.html.

### Endpoint
```
POST /api/impayes/:id/suspend
```

### Paramètres d'entrée (URL + Body)

**URL Parameters:**
| Paramètre | Type | Requis | Description |
|-----------|------|--------|-------------|
| `id` | string | Oui | UUID de l'impayé |

**Body JSON:**
```json
{
  "motif": "litige",
  "detail": "Litige en cours sur la facture"
}
```

| Champ | Type | Requis | Description |
|-------|------|--------|-------------|
| `motif` | string | Oui | Motif: `litige`, `arrangement`, `procedure`, `cessation`, `autre` |
| `detail` | string | Non | Détail optionnel |

### Réponse JSON (200 OK)

```json
{
  "success": true,
  "message": "Facture suspendue avec succès",
  "data": {
    "facture_id": "impaye-001",
    "relances_annulees": 2,
    "statut": "suspendue"
  }
}
```

### Requête SQL

```sql
-- Transaction
BEGIN;

-- Mise à jour du statut et ajout note de suspension
UPDATE impayes 
SET 
  statut = 'suspendue',
  notes_json = CASE 
    WHEN notes_json IS NULL OR notes_json = '' OR notes_json = '[]' 
    THEN json_array(json_object('content', 'Suspension: ' || :motif || COALESCE(' - ' || :detail, ''), 'author', :current_user, 'date', CURRENT_TIMESTAMP))
    ELSE json_insert(notes_json, '$[#]', json_object('content', 'Suspension: ' || :motif || COALESCE(' - ' || :detail, ''), 'author', :current_user, 'date', CURRENT_TIMESTAMP))
  END,
  updated_at = CURRENT_TIMESTAMP
WHERE id = :id;

-- Annuler les relances programmées (brouillon ou programmée)
UPDATE relances 
SET 
  statut = 'annulee',
  updated_at = CURRENT_TIMESTAMP
WHERE id IN (
  SELECT ri.relance_id 
  FROM relance_impayes ri
  JOIN relances r ON ri.relance_id = r.id
  WHERE ri.impaye_id = :id 
    AND r.statut IN ('brouillon', 'programmee')
);

-- Retourner le nombre de relances annulées
SELECT COUNT(*) AS relances_annulees 
FROM relances r
JOIN relance_impayes ri ON r.id = ri.relance_id
WHERE ri.impaye_id = :id AND r.statut = 'annulee';

COMMIT;
```

---

## Route 5: Réactiver une facture (Désuspendre)

**Titre** : Réactiver une facture suspendue  
**Description** : Réactive une facture suspendue (statut = 'en-relance') et recrée automatiquement les relances nécessaires selon la séquence configurée. Utilisé par unsuspend-facture.html.

### Endpoint
```
POST /api/impayes/:id/unsuspend
```

### Paramètres d'entrée (URL)

| Paramètre | Type | Requis | Description |
|-----------|------|--------|-------------|
| `id` | string | Oui | UUID de l'impayé |

### Réponse JSON (200 OK)

```json
{
  "success": true,
  "message": "Facture réactivée avec succès",
  "data": {
    "facture_id": "impaye-001",
    "relances_crees": 1,
    "statut": "en-relance"
  }
}
```

### Requête SQL

```sql
-- Transaction
BEGIN;

-- Mise à jour du statut et ajout note de réactivation
UPDATE impayes 
SET 
  statut = 'en-relance',
  notes_json = CASE 
    WHEN notes_json IS NULL OR notes_json = '' OR notes_json = '[]' 
    THEN json_array(json_object('content', 'Réactivation de la facture', 'author', :current_user, 'date', CURRENT_TIMESTAMP))
    ELSE json_insert(notes_json, '$[#]', json_object('content', 'Réactivation de la facture', 'author', :current_user, 'date', CURRENT_TIMESTAMP))
  END,
  updated_at = CURRENT_TIMESTAMP
WHERE id = :id;

-- Créer une nouvelle relance selon la séquence configurée si nécessaire
-- (Logique métier: vérifier s'il existe une relance active, sinon créer)
-- INSERT INTO relances (...) SELECT ... FROM sequences WHERE ...;
-- INSERT INTO relance_impayes (relance_id, impaye_id) VALUES (...);

-- Retourner le nombre de relances créées
SELECT COUNT(*) AS relances_crees 
FROM relances r
JOIN relance_impayes ri ON r.id = ri.relance_id
WHERE ri.impaye_id = :id 
  AND r.created_at > datetime('now', '-1 minute');

COMMIT;
```

---

## Route 6: Liste des séquences disponibles

**Titre** : Récupérer les séquences de relance actives  
**Description** : Renvoie la liste des séquences pour le filtre et le dropdown dans le panneau de détail. Utilisé par initial-load.html.

### Endpoint
```
GET /api/impayes/sequences
```

### Paramètres d'entrée

Aucun paramètre requis.

### Réponse JSON (200 OK)

```json
{
  "success": true,
  "data": {
    "sequences": [
      { "id": "seq-r1", "code": "R1", "nom": "R1 - Première relance", "niveau": 1 },
      { "id": "seq-r2", "code": "R2", "nom": "R2 - Deuxième relance", "niveau": 2 },
      { "id": "seq-r3", "code": "R3", "nom": "R3 - Troisième relance", "niveau": 3 },
      { "id": "seq-r4", "code": "R4", "nom": "R4 - Dernière relance", "niveau": 4 }
    ]
  }
}
```

### Requête SQL

```sql
SELECT 
  id,
  COALESCE(scenario, id) AS code,
  nom,
  COALESCE(niveau, 0) AS niveau
FROM sequences
WHERE actif = 1
ORDER BY niveau ASC, nom ASC;
```

---

## Route 7: Statistiques des impayés

**Titre** : Récupérer les statistiques globales des impayés  
**Description** : Renvoie les statistiques pour l'affichage dans le header (total, à réparer, etc.). Utilisé par initial-load.html.

### Endpoint
```
GET /api/impayes/stats
```

### Paramètres d'entrée

Aucun paramètre requis.

### Réponse JSON (200 OK)

```json
{
  "success": true,
  "data": {
    "stats": {
      "total": 156,
      "total_montant": 1250000.50,
      "non_payee": 45,
      "en_relance": 98,
      "suspendue": 13,
      "a_reparer": 3
    }
  }
}
```

### Requête SQL

```sql
SELECT 
  COUNT(*) AS total,
  SUM(montant_ttc) AS total_montant,
  SUM(CASE WHEN statut = 'non-payee' THEN 1 ELSE 0 END) AS non_payee,
  SUM(CASE WHEN statut = 'en-relance' THEN 1 ELSE 0 END) AS en_relance,
  SUM(CASE WHEN statut = 'suspendue' THEN 1 ELSE 0 END) AS suspendue,
  SUM(CASE WHEN payer_id IS NULL AND (payeur_nom IS NULL OR payeur_nom = '') THEN 1 ELSE 0 END) AS a_reparer
FROM impayes
WHERE facture_soldee = 0
  AND reste_a_payer > 0;
```

---

## Route 8: Synchronisation des factures

**Titre** : Déclencher la synchronisation des factures depuis l'ERP  
**Description** : Lance l'import des factures depuis la source externe. Met à jour les impayés existants et crée les nouveaux. Utilisé par sync-data.html.

### Endpoint
```
POST /api/sync/invoices
```

### Paramètres d'entrée (Body JSON)

| Paramètre | Type | Requis | Description |
|-----------|------|--------|-------------|
| `force` | boolean | Non | Forcer la sync même si déjà récente (défaut: false) |
| `date_debut` | string | Non | Date de début ISO 8601 |
| `date_fin` | string | Non | Date de fin ISO 8601 |

**Body JSON:**
```json
{
  "force": false,
  "date_debut": "2024-01-01",
  "date_fin": "2024-12-31"
}
```

### Réponse JSON (200 OK)

```json
{
  "success": true,
  "message": "Synchronisation terminée",
  "data": {
    "pieces_count": 45,
    "impayes_created": 12,
    "impayes_updated": 33,
    "errors": [],
    "duration_ms": 2500
  }
}
```

### Requête SQL (Log de synchronisation)

```sql
-- Insertion dans la table events pour traçabilité
INSERT INTO events (id, type, titre, description, entity_type, entity_id, by_marki, created_at)
VALUES (
  :uuid, 
  'sync', 
  'Synchronisation factures', 
  json_object('pieces', :pieces_count, 'created', :impayes_created, 'updated', :impayes_updated),
  'sync',
  :sync_id,
  1,
  CURRENT_TIMESTAMP
);
```

---

## Route 9: Liste des factures à réparer

**Titre** : Récupérer les factures sans payeur associé  
**Description** : Renvoie les factures impayées qui n'ont pas de payeur (payer_id IS NULL) et nécessitent une intervention manuelle. Affiché dans la vue "À réparer" du mockup.

### Endpoint
```
GET /api/impayes/a-reparer
```

### Paramètres d'entrée (Query String)

| Paramètre | Type | Requis | Description |
|-----------|------|--------|-------------|
| `page` | integer | Non | Numéro de page (défaut: 1) |
| `per_page` | integer | Non | Nombre de résultats par page (défaut: 10) |

### Réponse JSON (200 OK)

```json
{
  "success": true,
  "data": {
    "factures": [
      {
        "id": "impaye-101",
        "numero": "FAC-2024-099",
        "numero_dossier": "D-2024-123",
        "montant_ttc": 4500.00,
        "date_facture": "2024-01-10",
        "nature_probleme": "Facture sans payeur"
      }
    ],
    "total": 3,
    "page": 1,
    "per_page": 10
  }
}
```

### Requête SQL

```sql
-- Requête principale
SELECT 
  i.id,
  i.nfacture AS numero,
  i.numero_dossier,
  i.montant_ttc,
  i.date_facture,
  'Facture sans payeur' AS nature_probleme
FROM impayes i
WHERE i.facture_soldee = 0
  AND i.payer_id IS NULL
  AND (i.payeur_nom IS NULL OR i.payeur_nom = '')
  AND (i.payeur_email IS NULL OR i.payeur_email = '')
ORDER BY i.date_facture DESC
LIMIT :per_page OFFSET :offset;

-- Comptage
SELECT COUNT(*) AS total
FROM impayes
WHERE facture_soldee = 0
  AND payer_id IS NULL
  AND (payeur_nom IS NULL OR payeur_nom = '')
  AND (payeur_email IS NULL OR payeur_email = '');
```

---

## Résumé des Routes

| Méthode | Endpoint | Description | Frontend Usage |
|---------|----------|-------------|----------------|
| GET | `/api/impayes` | Liste paginée avec filtres/recherche | initial-load.html, pagination-*.html, sort-*.html |
| GET | `/api/impayes/:id` | Détail d'un impayé | open-detail.html |
| PUT | `/api/impayes/:id` | Maj notes/séquence | save-note.html, delete-note.html, update-sequence.html, edit-note.html |
| POST | `/api/impayes/:id/suspend` | Suspendre facture | suspend-facture.html |
| POST | `/api/impayes/:id/unsuspend` | Réactiver facture | unsuspend-facture.html |
| GET | `/api/impayes/sequences` | Liste séquences | initial-load.html (filtres) |
| GET | `/api/impayes/stats` | Statistiques | initial-load.html (header) |
| POST | `/api/sync/invoices` | Synchronisation | sync-data.html |
| GET | `/api/impayes/a-reparer` | Factures sans payeur | Vue "À réparer" du mockup |

---

## Mapping des Champs Mockup ↔ Base de Données

| Champ Mockup | Champ SQL | Table | Notes |
|--------------|-----------|-------|-------|
| `facture.id` | `id` | impayes | UUID |
| `facture.numero` | `nfacture` | impayes | N° facture affiché |
| `facture.numeroDossier` | `numero_dossier` | impayes | Peut être NULL |
| `facture.dateFacture` | `date_facture` | impayes | Format ISO 8601 |
| `facture.echeance` | `date_echeance` | impayes | Format ISO 8601 |
| `facture.montant` | `montant_ttc` | impayes | Montant TTC |
| `facture.resteAPayer` | `reste_a_payer` | impayes | Reste dû |
| `facture.sequence` | `sequence_id` | impayes | Clé étrangère sequences |
| `facture.statut` | `statut` | impayes | non-payee/en-relance/suspendue |
| `facture.note` / `facture.notes_json` | `notes_json` | impayes | JSON array |
| `facture.payeur.id` | `payer_id` | impayes | FK contacts |
| `facture.payeur.nom` | `payeur_nom` ou `contacts.nom` | impayes/contacts | Fallback sur denormalized |
| `facture.payeur.email` | `payeur_email` ou `contacts.email` | impayes/contacts | Fallback sur denormalized |
| `facture.payeur.initials` | Calculé | - | SUBSTR(nom,1,1)+SUBSTR(prenom,1,1) |
| `stats.total` | COUNT(*) | impayes | Total factures impayées |
| `stats.aReparer` | COUNT(*) WHERE payer_id IS NULL | impayes | Sans payeur associé |

---

## Contraintes et Validation

### Statuts valides pour impayes.statut
- `non-payee` : Facture non payée, pas encore en relance
- `en-relance` : Facture en cours de relance
- `suspendue` : Facture suspendée (pas de relance)
- `a-reparer` : Facture avec problème de données

### Séquences valides pour impayes.sequence_id
- `R1` : Première relance
- `R2` : Deuxième relance
- `R3` : Troisième relance
- `R4` : Dernière relance
- NULL : Aucune séquence assignée

### Notes JSON Format
```json
[
  {
    "content": "Texte de la note",
    "author": "username ou email",
    "date": "2024-01-20T10:30:00Z"
  }
]
```
