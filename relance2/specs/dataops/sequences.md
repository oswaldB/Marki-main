# API Routes - Séquences

Document définissant les routes API REST backend pour l'écran **Séquences de relance**.

---

## Route 1: Lister les séquences

**Titre** : Liste des séquences de relance

**Description** : Récupère la liste paginée des séquences avec filtres optionnels (recherche textuelle, type). Utilisée pour afficher le tableau principal de l'écran sequences.

**Endpoint** : `GET /api/sequences`

**Paramètres d'entrée** :
| Paramètre | Type | Requis | Description |
|-----------|------|--------|-------------|
| search | string | Non | Recherche dans nom/description |
| type | string | Non | Filtre par type : `relance`, `suivi`, ou `all` |
| page | integer | Non | Numéro de page (défaut: 1) |
| limit | integer | Non | Items par page (défaut: 20, max: 100) |
| actif | integer | Non | Filtre par statut actif (1 ou 0) |

**Réponse JSON (200 OK)** :
```json
{
  "success": true,
  "data": {
    "sequences": [
      {
        "id": "seq_001",
        "nom": "Relance Standard 24 étapes",
        "type_sequence": "relance",
        "description": "Scénario complet de relance clients avec escalation progressive sur 24 étapes",
        "niveau": 0,
        "actif": 1,
        "validation_obligatoire": 0,
        "attribution_automatique": 0,
        "etapes_total": 24,
        "factures_liees": 45,
        "frequence": null,
        "created_at": "2024-01-15T10:30:00Z",
        "updated_at": "2024-03-20T14:22:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 4,
      "total_pages": 1
    }
  }
}
```

**Requête SQL** :
```sql
SELECT 
    s.id,
    s.nom,
    s.type_sequence,
    s.description,
    s.niveau,
    s.actif,
    s.validation_obligatoire,
    s.attribution_automatique,
    s.lien_paiement,
    s.created_at,
    s.updated_at,
    COUNT(DISTINCT ss.id) as etapes_total,
    COUNT(DISTINCT i.id) as factures_liees,
    MAX(ss.frequence) as frequence
FROM sequences s
LEFT JOIN sequences_scenarios ss ON s.id = ss.sequence_id AND ss.active = 1
LEFT JOIN impayes i ON s.id = i.sequence_id
WHERE (:search IS NULL OR s.nom LIKE '%' || :search || '%' OR s.description LIKE '%' || :search || '%')
  AND (:type = 'all' OR :type IS NULL OR s.type_sequence = :type)
  AND (:actif IS NULL OR s.actif = :actif)
GROUP BY s.id
ORDER BY s.created_at DESC
LIMIT :limit OFFSET :offset;
```

---

## Route 2: Statistiques des séquences

**Titre** : Statistiques globales des séquences

**Description** : Récupère les compteurs affichés dans la barre de stats (total, relances, suivis, factures liées).

**Endpoint** : `GET /api/sequences/stats`

**Paramètres d'entrée** : Aucun

**Réponse JSON (200 OK)** :
```json
{
  "success": true,
  "data": {
    "total_actives": 4,
    "total_relances": 2,
    "total_suivis": 2,
    "total_factures_liees": 93
  }
}
```

**Requête SQL** :
```sql
SELECT 
    COUNT(*) as total_actives,
    COUNT(CASE WHEN type_sequence = 'relance' THEN 1 END) as total_relances,
    COUNT(CASE WHEN type_sequence = 'suivi' THEN 1 END) as total_suivis,
    (SELECT COUNT(*) FROM impayes WHERE sequence_id IS NOT NULL) as total_factures_liees
FROM sequences
WHERE actif = 1;
```

---

## Route 3: Détail d'une séquence

**Titre** : Détails complets d'une séquence

**Description** : Récupère tous les détails d'une séquence spécifique, y compris ses étapes/scénarios. Utilisée pour la navigation vers la page de détail et le mode édition.

**Endpoint** : `GET /api/sequences/:id`

**Paramètres d'entrée** (URL) :
| Paramètre | Type | Requis | Description |
|-----------|------|--------|-------------|
| id | string | Oui | Identifiant de la séquence |

**Réponse JSON (200 OK)** :
```json
{
  "success": true,
  "data": {
    "id": "seq_001",
    "nom": "Relance Standard 24 étapes",
    "type_sequence": "relance",
    "description": "Scénario complet de relance clients avec escalation progressive sur 24 étapes",
    "niveau": 0,
    "actif": 1,
    "validation_obligatoire": 0,
    "attribution_automatique": 0,
    "lien_paiement": null,
    "scenario": null,
    "emails_json": null,
    "regles_json": null,
    "groupes_regles_json": null,
    "etapes": [
      {
        "id": "step_001",
        "email_index": 1,
        "format": "email",
        "active": 1,
        "smtp": null,
        "cc": null,
        "objet": "Rappel amical",
        "corps": "Bonjour, nous vous rappelons...",
        "delai": 15,
        "frequence": null,
        "created_at": "2024-01-15T10:30:00Z"
      }
    ],
    "factures_liees": 45,
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-03-20T14:22:00Z"
  }
}
```

**Requête SQL** :
```sql
-- Séquence principale
SELECT * FROM sequences WHERE id = :id;

-- Étapes/scénarios
SELECT 
    id,
    email_index,
    format,
    active,
    smtp,
    cc,
    objet,
    corps,
    COALESCE(
        JSON_EXTRACT(scenario, '$.delai'),
        CAST((email_index * 5 + 10) AS TEXT)
    ) as delai,
    frequence,
    created_at,
    updated_at
FROM sequences_scenarios 
WHERE sequence_id = :id 
ORDER BY email_index ASC;

-- Comptage factures liées
SELECT COUNT(*) as factures_liees 
FROM impayes 
WHERE sequence_id = :id;
```

---

## Route 4: Créer une séquence

**Titre** : Création d'une nouvelle séquence

**Description** : Crée une nouvelle séquence de relance ou de suivi. Utilisée par le modal "Nouvelle séquence".

**Endpoint** : `POST /api/sequences`

**Paramètres d'entrée** (Body JSON) :
| Paramètre | Type | Requis | Description |
|-----------|------|--------|-------------|
| nom | string | Oui | Nom de la séquence |
| type_sequence | string | Oui | Type : `relance` ou `suivi` |
| description | string | Non | Description détaillée |
| niveau | integer | Non | Niveau de la séquence (défaut: 0) |
| validation_obligatoire | integer | Non | Nécessite validation (0 ou 1, défaut: 0) |
| attribution_automatique | integer | Non | Attribution auto (0 ou 1, défaut: 0) |
| lien_paiement | string | Non | URL de paiement associée |

**Réponse JSON (201 Created)** :
```json
{
  "success": true,
  "message": "Séquence créée avec succès",
  "data": {
    "id": "seq_005",
    "nom": "Nouvelle séquence",
    "type_sequence": "relance",
    "description": "Description...",
    "actif": 1,
    "created_at": "2024-03-21T10:00:00Z",
    "updated_at": "2024-03-21T10:00:00Z"
  }
}
```

**Requête SQL** :
```sql
INSERT INTO sequences (
    id,
    nom,
    type_sequence,
    description,
    niveau,
    actif,
    validation_obligatoire,
    attribution_automatique,
    lien_paiement,
    created_at,
    updated_at
) VALUES (
    'seq_' || lower(hex(randomblob(16))),
    :nom,
    :type_sequence,
    :description,
    COALESCE(:niveau, 0),
    1,
    COALESCE(:validation_obligatoire, 0),
    COALESCE(:attribution_automatique, 0),
    :lien_paiement,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
RETURNING *;
```

---

## Route 5: Modifier une séquence

**Titre** : Mise à jour d'une séquence

**Description** : Met à jour les informations d'une séquence existante. Utilisée par l'action "Modifier" du tableau.

**Endpoint** : `PUT /api/sequences/:id`

**Paramètres d'entrée** :
- URL: `id` (string, requis) - Identifiant de la séquence
- Body JSON: mêmes champs que la création (tous optionnels)

**Réponse JSON (200 OK)** :
```json
{
  "success": true,
  "message": "Séquence mise à jour avec succès",
  "data": {
    "id": "seq_001",
    "nom": "Nouveau nom",
    "updated_at": "2024-03-21T10:30:00Z"
  }
}
```

**Requête SQL** :
```sql
UPDATE sequences 
SET 
    nom = COALESCE(:nom, nom),
    type_sequence = COALESCE(:type_sequence, type_sequence),
    description = COALESCE(:description, description),
    niveau = COALESCE(:niveau, niveau),
    actif = COALESCE(:actif, actif),
    validation_obligatoire = COALESCE(:validation_obligatoire, validation_obligatoire),
    attribution_automatique = COALESCE(:attribution_automatique, attribution_automatique),
    lien_paiement = COALESCE(:lien_paiement, lien_paiement),
    updated_at = CURRENT_TIMESTAMP
WHERE id = :id
RETURNING *;
```

---

## Route 6: Dupliquer une séquence

**Titre** : Duplication d'une séquence

**Description** : Crée une copie d'une séquence existante avec toutes ses étapes. Utilisée par l'action "Dupliquer".

**Endpoint** : `POST /api/sequences/:id/duplicate`

**Paramètres d'entrée** (URL) :
| Paramètre | Type | Requis | Description |
|-----------|------|--------|-------------|
| id | string | Oui | Identifiant de la séquence source |

**Body JSON (optionnel)** :
| Paramètre | Type | Requis | Description |
|-----------|------|--------|-------------|
| nom | string | Non | Nom pour la copie (défaut: "{nom} (copie)") |

**Réponse JSON (201 Created)** :
```json
{
  "success": true,
  "message": "Séquence dupliquée avec succès",
  "data": {
    "id": "seq_006",
    "nom": "Relance Standard 24 étapes (copie)",
    "type_sequence": "relance",
    "etapes_copiees": 24,
    "created_at": "2024-03-21T11:00:00Z"
  }
}
```

**Requête SQL** :
```sql
-- Transaction
BEGIN;

-- 1. Copier la séquence
INSERT INTO sequences (
    id, nom, type_sequence, description, niveau, actif,
    validation_obligatoire, attribution_automatique, lien_paiement,
    scenario, emails_json, regles_json, groupes_regles_json,
    created_at, updated_at
)
SELECT 
    'seq_' || lower(hex(randomblob(16))),
    COALESCE(:new_nom, nom || ' (copie)'),
    type_sequence,
    description,
    niveau,
    actif,
    validation_obligatoire,
    attribution_automatique,
    lien_paiement,
    scenario,
    emails_json,
    regles_json,
    groupes_regles_json,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM sequences
WHERE id = :id
RETURNING id INTO @new_sequence_id;

-- 2. Copier les étapes
INSERT INTO sequences_scenarios (
    id, sequence_id, email_index, format, active,
    smtp, cc, objet, corps, created_at, updated_at
)
SELECT 
    'step_' || lower(hex(randomblob(16))),
    @new_sequence_id,
    email_index,
    format,
    active,
    smtp,
    cc,
    objet,
    corps,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM sequences_scenarios
WHERE sequence_id = :id;

COMMIT;

-- Retourner la nouvelle séquence
SELECT * FROM sequences WHERE id = @new_sequence_id;
```

---

## Route 7: Supprimer une séquence

**Titre** : Suppression d'une séquence

**Description** : Supprime une séquence et toutes ses étapes associées. Vérifie s'il n'y a pas de factures liées avant suppression.

**Endpoint** : `DELETE /api/sequences/:id`

**Paramètres d'entrée** (URL) :
| Paramètre | Type | Requis | Description |
|-----------|------|--------|-------------|
| id | string | Oui | Identifiant de la séquence |

**Paramètres d'entrée** (Query) :
| Paramètre | Type | Requis | Description |
|-----------|------|--------|-------------|
| force | boolean | Non | Forcer suppression même avec factures liées |

**Réponse JSON (200 OK)** :
```json
{
  "success": true,
  "message": "Séquence supprimée avec succès"
}
```

**Erreur 409 Conflict** (si factures liées et force=false) :
```json
{
  "success": false,
  "error": "SEQUENCE_HAS_LINKED_INVOICES",
  "message": "La séquence est liée à 45 factures. Utilisez ?force=true pour forcer la suppression."
}
```

**Requête SQL** :
```sql
-- Vérifier les factures liées
SELECT COUNT(*) as count FROM impayes WHERE sequence_id = :id;

-- Si count = 0 ou force = true:
BEGIN;

-- Supprimer les étapes
DELETE FROM sequences_scenarios WHERE sequence_id = :id;

-- Supprimer les emails programmés associés
DELETE FROM sequences_emails WHERE sequence_id = :id;

-- Désassocier les relances/suivis (mettre sequence_id à NULL)
UPDATE relances SET sequence_id = NULL WHERE sequence_id = :id;
UPDATE suivis SET sequence_id = NULL WHERE sequence_id = :id;

-- Supprimer la séquence
DELETE FROM sequences WHERE id = :id;

COMMIT;
```

---

## Route 8: Liste des étapes d'une séquence

**Titre** : Étapes/scénarios d'une séquence

**Description** : Récupère uniquement la liste des étapes d'une séquence. Utilisée pour l'affichage et l'édition des étapes.

**Endpoint** : `GET /api/sequences/:id/steps`

**Paramètres d'entrée** :
| Paramètre | Type | Requis | Description |
|-----------|------|--------|-------------|
| id | string | Oui | Identifiant de la séquence |
| active_only | boolean | Non | Ne retourner que les étapes actives |

**Réponse JSON (200 OK)** :
```json
{
  "success": true,
  "data": {
    "sequence_id": "seq_001",
    "etapes": [
      {
        "id": "step_001",
        "email_index": 1,
        "format": "email",
        "active": 1,
        "smtp": null,
        "cc": null,
        "objet": "Rappel amical",
        "corps": "Bonjour...",
        "delai_jours": 15,
        "frequence": null,
        "created_at": "2024-01-15T10:30:00Z"
      }
    ],
    "total": 24
  }
}
```

**Requête SQL** :
```sql
SELECT 
    ss.id,
    ss.email_index,
    ss.format,
    ss.active,
    ss.smtp,
    ss.cc,
    ss.objet,
    ss.corps,
    ss.frequence,
    COALESCE(
        CAST(JSON_EXTRACT(s.scenario, '$.etapes.' || ss.email_index || '.delai') AS INTEGER),
        ss.email_index * 5 + 10
    ) as delai_jours,
    ss.created_at,
    ss.updated_at
FROM sequences_scenarios ss
JOIN sequences s ON s.id = ss.sequence_id
WHERE ss.sequence_id = :id
  AND (:active_only IS NULL OR ss.active = CASE WHEN :active_only THEN 1 ELSE ss.active END)
ORDER BY ss.email_index ASC;
```

---

## Route 9: Rechercher des séquences

**Titre** : Recherche de séquences

**Description** : Recherche rapide de séquences par nom/description pour l'autocomplete.

**Endpoint** : `GET /api/sequences/search`

**Paramètres d'entrée** (Query) :
| Paramètre | Type | Requis | Description |
|-----------|------|--------|-------------|
| q | string | Oui | Terme de recherche (min 2 caractères) |
| type | string | Non | Filtrer par type |
| limit | integer | Non | Nombre max de résultats (défaut: 10) |

**Réponse JSON (200 OK)** :
```json
{
  "success": true,
  "data": [
    {
      "id": "seq_001",
      "nom": "Relance Standard",
      "type_sequence": "relance",
      "description": "Scénario complet..."
    }
  ]
}
```

**Requête SQL** :
```sql
SELECT 
    id,
    nom,
    type_sequence,
    description,
    actif
FROM sequences
WHERE (nom LIKE '%' || :q || '%' OR description LIKE '%' || :q || '%')
  AND (:type IS NULL OR type_sequence = :type)
  AND actif = 1
ORDER BY 
    CASE WHEN nom LIKE :q || '%' THEN 0 ELSE 1 END,
    nom ASC
LIMIT :limit;
```

---

## Route 10: Basculer le statut actif/inactif

**Titre** : Activer/Désactiver une séquence

**Description** : Change rapidement le statut actif d'une séquence sans modifier les autres champs.

**Endpoint** : `PATCH /api/sequences/:id/toggle`

**Paramètres d'entrée** (URL) :
| Paramètre | Type | Requis | Description |
|-----------|------|--------|-------------|
| id | string | Oui | Identifiant de la séquence |

**Réponse JSON (200 OK)** :
```json
{
  "success": true,
  "data": {
    "id": "seq_001",
    "actif": 0,
    "message": "Séquence désactivée"
  }
}
```

**Requête SQL** :
```sql
UPDATE sequences 
SET 
    actif = CASE WHEN actif = 1 THEN 0 ELSE 1 END,
    updated_at = CURRENT_TIMESTAMP
WHERE id = :id
RETURNING id, nom, actif;
```

---

## Notes d'implémentation

### Génération des IDs
Les IDs sont générés au format `seq_` + hash aléatoire (16 bytes en hexadécimal minuscule).

### Validation
- `type_sequence` doit être soit `relance` soit `suivi`
- `nom` est obligatoire et unique (contrainte recommandée)
- Les suppressions sont logiques (soft delete) ou avec vérification des dépendances

### Relations importantes
- `sequences` → `sequences_scenarios` (1:N) : étapes de la séquence
- `sequences` → `impayes` (1:N) : factures associées
- `sequences` → `relances` (1:N) : relances créées
- `sequences` → `suivis` (1:N) : suivis créés

### Index recommandés
```sql
CREATE INDEX idx_sequences_type ON sequences(type_sequence);
CREATE INDEX idx_sequences_actif ON sequences(actif);
CREATE INDEX idx_sequences_nom ON sequences(nom);
CREATE INDEX idx_sequences_scenarios_sequence_id ON sequences_scenarios(sequence_id);
CREATE INDEX idx_impayes_sequence_id ON impayes(sequence_id);
```
