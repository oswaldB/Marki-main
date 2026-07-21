# API Routes - Écran Suivi (Séquences de Suivi)

Analyse du mockup `mockups/sequences-suivi-detail.html` et du schéma SQL pour définir les routes API backend nécessaires.

---

## 1. Récupérer une séquence de suivi

**Description** : Charge les détails complets d'une séquence de type "suivi" avec ses emails, scénarios et règles d'attribution.

**Endpoint** : `GET /api/sequences/{id}`

**Paramètres d'entrée** :
| Paramètre | Type | Obligatoire | Description |
|-----------|------|-------------|-------------|
| id | string | Oui | ID de la séquence (UUID) |

**Réponse JSON** :
```json
{
  "success": true,
  "sequence": {
    "id": "seq_xxx",
    "nom": "Suivi mensuel",
    "type_sequence": "suivi",
    "publiee": true,
    "validation_obligatoire": false,
    "attribution_automatique": true,
    "emails": [
      {
        "email_index": 1,
        "frequence": {
          "type": "hebdomadaire",
          "hour": "9",
          "dayOfWeek": "1",
          "dayOfMonth": null
        },
        "to": "{{payeur_email}}",
        "scenarios": [
          {
            "format": "single",
            "active": true,
            "smtp": "smtp_xxx",
            "cc": "",
            "objet": "Relance impayé",
            "corps": "<p>Bonjour...</p>"
          }
        ]
      }
    ],
    "groupes_regles": [
      {
        "regles": [
          {
            "champ": "montant_total",
            "operateur": "superieur",
            "valeur": "1000"
          }
        ]
      }
    ],
    "created_at": "2024-01-15T10:00:00Z",
    "updated_at": "2024-01-15T10:00:00Z"
  }
}
```

**Requête SQL** :
```sql
-- Récupération de la séquence
SELECT 
    s.id,
    s.nom,
    s.type_sequence,
    s.actif AS publiee,
    s.validation_obligatoire,
    s.attribution_automatique,
    s.emails_json,
    s.regles_json,
    s.groupes_regles_json,
    s.created_at,
    s.updated_at
FROM sequences s
WHERE s.id = ? AND s.type_sequence = 'suivi';

-- Récupération des emails de suivi
SELECT 
    se.email_index,
    se.frequence,
    se.heure_envoi,
    se.jour_envoi,
    se.cc
FROM sequences_emails se
WHERE se.sequence_id = ?
ORDER BY se.email_index;

-- Récupération des scénarios
SELECT 
    ss.email_index,
    ss.format,
    ss.active,
    ss.smtp,
    ss.cc,
    ss.objet,
    ss.corps
FROM sequences_scenarios ss
WHERE ss.sequence_id = ?;
```

---

## 2. Créer une séquence de suivi

**Description** : Crée une nouvelle séquence de type "suivi" avec ses paramètres par défaut.

**Endpoint** : `POST /api/sequences`

**Paramètres d'entrée** (Body JSON) :
| Paramètre | Type | Obligatoire | Description |
|-----------|------|-------------|-------------|
| nom | string | Oui | Nom de la séquence |
| type_sequence | string | Oui | Type: "suivi" |
| validation_obligatoire | boolean | Non | Validation obligatoire (défaut: false) |
| attribution_automatique | boolean | Non | Attribution auto (défaut: false) |

**Réponse JSON** :
```json
{
  "success": true,
  "sequence": {
    "id": "seq_xxx",
    "nom": "Nouvelle séquence",
    "type_sequence": "suivi",
    "publiee": false,
    "validation_obligatoire": false,
    "attribution_automatique": false,
    "created_at": "2024-01-15T10:00:00Z"
  }
}
```

**Requête SQL** :
```sql
INSERT INTO sequences (
    id, nom, type_sequence, actif, validation_obligatoire, 
    attribution_automatique, created_at, updated_at
) VALUES (
    lower(hex(randomblob(16))),
    ?, 
    'suivi',
    0,
    ?,
    ?,
    datetime('now'),
    datetime('now')
)
RETURNING id;
```

---

## 3. Mettre à jour une séquence

**Description** : Met à jour les propriétés générales d'une séquence (nom, validation, attribution).

**Endpoint** : `PUT /api/sequences/{id}`

**Paramètres d'entrée** (Body JSON) :
| Paramètre | Type | Obligatoire | Description |
|-----------|------|-------------|-------------|
| nom | string | Non | Nouveau nom |
| validation_obligatoire | boolean | Non | Toggle validation |
| attribution_automatique | boolean | Non | Toggle attribution auto |
| groupes_regles | array | Non | Règles d'attribution |

**Réponse JSON** :
```json
{
  "success": true,
  "sequence": {
    "id": "seq_xxx",
    "nom": "Nom mis à jour",
    "validation_obligatoire": true,
    "attribution_automatique": true,
    "updated_at": "2024-01-15T11:00:00Z"
  }
}
```

**Requête SQL** :
```sql
UPDATE sequences
SET 
    nom = COALESCE(?, nom),
    validation_obligatoire = COALESCE(?, validation_obligatoire),
    attribution_automatique = COALESCE(?, attribution_automatique),
    groupes_regles_json = COALESCE(?, groupes_regles_json),
    updated_at = datetime('now')
WHERE id = ? AND type_sequence = 'suivi';
```

---

## 4. Basculer publication (Publier/Dépublier)

**Description** : Publie ou dépublie une séquence de suivi.

**Endpoint** : `POST /api/sequences/{id}/toggle-publish`

**Paramètres d'entrée** :
| Paramètre | Type | Obligatoire | Description |
|-----------|------|-------------|-------------|
| id | string (path) | Oui | ID de la séquence |
| publier | boolean | Oui | true=publier, false=dépublier |

**Réponse JSON** :
```json
{
  "success": true,
  "sequence": {
    "id": "seq_xxx",
    "publiee": true,
    "updated_at": "2024-01-15T11:00:00Z"
  }
}
```

**Requête SQL** :
```sql
UPDATE sequences
SET 
    actif = ?,
    updated_at = datetime('now')
WHERE id = ? AND type_sequence = 'suivi'
RETURNING id, actif AS publiee, updated_at;
```

---

## 5. Ajouter un email de suivi

**Description** : Ajoute un nouvel email à une séquence de suivi.

**Endpoint** : `POST /api/sequences/{id}/emails`

**Paramètres d'entrée** (Body JSON) :
| Paramètre | Type | Obligatoire | Description |
|-----------|------|-------------|-------------|
| frequence.type | string | Oui | "quotidien", "hebdomadaire", "mensuel" |
| frequence.hour | string | Non | Heure d'envoi (HH:MM) |
| frequence.dayOfWeek | string | Non | Jour semaine (0-6) |
| frequence.dayOfMonth | string | Non | Jour du mois |
| to | string | Non | Destinataire (défaut: {{payeur_email}}) |

**Réponse JSON** :
```json
{
  "success": true,
  "email": {
    "email_index": 2,
    "frequence": {
      "type": "hebdomadaire",
      "hour": "9",
      "dayOfWeek": "1"
    },
    "to": "{{payeur_email}}",
    "created_at": "2024-01-15T11:00:00Z"
  }
}
```

**Requête SQL** :
```sql
-- Récupérer le prochain email_index
SELECT COALESCE(MAX(email_index), 0) + 1 as next_index
FROM sequences_emails
WHERE sequence_id = ?;

-- Insérer l'email
INSERT INTO sequences_emails (
    id, sequence_id, email_index, frequence, 
    heure_envoi, jour_envoi, cc, created_at, updated_at
) VALUES (
    lower(hex(randomblob(16))),
    ?,
    ?,
    ?,
    ?,
    ?,
    ?,
    datetime('now'),
    datetime('now')
)
RETURNING email_index;

-- Créer les 4 scénarios par défaut
INSERT INTO sequences_scenarios (
    id, sequence_id, email_index, format, active, smtp, cc, objet, corps, created_at, updated_at
)
SELECT 
    lower(hex(randomblob(16))),
    ?,
    ?,
    format_code,
    1,
    NULL,
    '',
    '',
    '',
    datetime('now'),
    datetime('now')
FROM (SELECT 'single' AS format_code UNION ALL 
      SELECT 'multiple' UNION ALL 
      SELECT 'both' UNION ALL 
      SELECT 'broker');
```

---

## 6. Mettre à jour un email de suivi

**Description** : Modifie les paramètres d'un email (fréquence, destinataire).

**Endpoint** : `PUT /api/sequences/{id}/emails/{email_index}`

**Paramètres d'entrée** (Body JSON) :
| Paramètre | Type | Obligatoire | Description |
|-----------|------|-------------|-------------|
| frequence | object | Non | Configuration fréquence |
| to | string | Non | Destinataire |

**Réponse JSON** :
```json
{
  "success": true,
  "email": {
    "email_index": 1,
    "frequence": {
      "type": "mensuel",
      "dayOfMonth": "15"
    },
    "to": "{{payeur_email}}",
    "updated_at": "2024-01-15T11:00:00Z"
  }
}
```

**Requête SQL** :
```sql
UPDATE sequences_emails
SET 
    frequence = COALESCE(?, frequence),
    heure_envoi = COALESCE(?, heure_envoi),
    jour_envoi = COALESCE(?, jour_envoi),
    cc = COALESCE(?, cc),
    updated_at = datetime('now')
WHERE sequence_id = ? AND email_index = ?
RETURNING *;
```

---

## 7. Supprimer un email de suivi

**Description** : Supprime un email et ses scénarios associés.

**Endpoint** : `DELETE /api/sequences/{id}/emails/{email_index}`

**Paramètres d'entrée** :
| Paramètre | Type | Obligatoire | Description |
|-----------|------|-------------|-------------|
| id | string (path) | Oui | ID séquence |
| email_index | integer (path) | Oui | Index email |

**Réponse JSON** :
```json
{
  "success": true,
  "deleted": true
}
```

**Requête SQL** :
```sql
-- Supprimer les scénarios associés
DELETE FROM sequences_scenarios
WHERE sequence_id = ? AND email_index = ?;

-- Supprimer l'email
DELETE FROM sequences_emails
WHERE sequence_id = ? AND email_index = ?;

-- Réordonner les index des emails suivants
UPDATE sequences_emails
SET email_index = email_index - 1,
    updated_at = datetime('now')
WHERE sequence_id = ? AND email_index > ?;

-- Réordonner les scénarios
UPDATE sequences_scenarios
SET email_index = email_index - 1,
    updated_at = datetime('now')
WHERE sequence_id = ? AND email_index > ?;
```

---

## 8. Récupérer les scénarios d'un email

**Description** : Liste les 4 scénarios (single, multiple, both, broker) d'un email.

**Endpoint** : `GET /api/sequences/{id}/emails/{email_index}/scenarios`

**Paramètres d'entrée** :
| Paramètre | Type | Obligatoire | Description |
|-----------|------|-------------|-------------|
| id | string (path) | Oui | ID séquence |
| email_index | integer (path) | Oui | Index email |

**Réponse JSON** :
```json
{
  "success": true,
  "scenarios": [
    {
      "id": "ss_xxx",
      "format": "single",
      "active": true,
      "smtp": "smtp_xxx",
      "cc": "manager@example.com",
      "objet": "Relance impayé",
      "corps": "<p>Bonjour {{payeur_nom}},</p>..."
    },
    {
      "format": "multiple",
      "active": true,
      "smtp": "smtp_xxx",
      "cc": "",
      "objet": "Relance impayés multiples",
      "corps": "<p>Bonjour...</p>"
    }
  ]
}
```

**Requête SQL** :
```sql
SELECT 
    ss.id,
    ss.format,
    ss.active,
    ss.smtp,
    ss.cc,
    ss.objet,
    ss.corps
FROM sequences_scenarios ss
WHERE ss.sequence_id = ? AND ss.email_index = ?
ORDER BY 
    CASE ss.format 
        WHEN 'single' THEN 1
        WHEN 'multiple' THEN 2
        WHEN 'both' THEN 3
        WHEN 'broker' THEN 4
    END;
```

---

## 9. Mettre à jour un scénario

**Description** : Modifie un scénario spécifique (contenu, activation, SMTP).

**Endpoint** : `PUT /api/sequences/{id}/emails/{email_index}/scenarios/{format}`

**Paramètres d'entrée** (Body JSON) :
| Paramètre | Type | Obligatoire | Description |
|-----------|------|-------------|-------------|
| active | boolean | Non | Activer/désactiver |
| smtp | string | Non | ID profil SMTP |
| cc | string | Non | Destinataires en copie |
| objet | string | Non | Objet email |
| corps | string | Non | Corps HTML |

**Réponse JSON** :
```json
{
  "success": true,
  "scenario": {
    "format": "single",
    "active": true,
    "smtp": "smtp_xxx",
    "cc": "",
    "objet": "Nouveau sujet",
    "corps": "<p>Contenu...</p>",
    "updated_at": "2024-01-15T11:00:00Z"
  }
}
```

**Requête SQL** :
```sql
UPDATE sequences_scenarios
SET 
    active = COALESCE(?, active),
    smtp = COALESCE(?, smtp),
    cc = COALESCE(?, cc),
    objet = COALESCE(?, objet),
    corps = COALESCE(?, corps),
    updated_at = datetime('now')
WHERE sequence_id = ? AND email_index = ? AND format = ?
RETURNING *;
```

---

## 10. Liste des profils SMTP

**Description** : Récupère tous les profils SMTP pour le sélecteur.

**Endpoint** : `GET /api/smtp-profiles`

**Paramètres d'entrée** : Aucun

**Réponse JSON** :
```json
{
  "success": true,
  "profils": [
    {
      "id": "smtp_xxx",
      "nom": "SMTP Principal",
      "email": "noreply@example.com",
      "actif": true
    }
  ]
}
```

**Requête SQL** :
```sql
SELECT 
    id,
    nom,
    from_email AS email,
    actif
FROM smtp_profiles
WHERE actif = 1
ORDER BY is_default DESC, nom ASC;
```

---

## 11. Liste des payeurs pour test

**Description** : Récupère les payeurs avec impayés pour tester les emails.

**Endpoint** : `GET /api/payeurs/test`

**Paramètres d'entrée** (Query) :
| Paramètre | Type | Obligatoire | Description |
|-----------|------|-------------|-------------|
| regles | string | Non | Filtre JSON des règles d'attribution |
| limit | integer | Non | Limite résultats (défaut: 50) |

**Réponse JSON** :
```json
{
  "success": true,
  "payeurs": [
    {
      "id": "contact_xxx",
      "nom": "SARL Dupont Construction",
      "email": "contact@dupont.fr",
      "impayesCount": 3,
      "impayesAmount": 12500.00
    }
  ]
}
```

**Requête SQL** :
```sql
SELECT 
    c.id,
    c.nom,
    c.email,
    COUNT(DISTINCT i.id) as impayesCount,
    COALESCE(SUM(i.reste_a_payer), 0) as impayesAmount
FROM contacts c
INNER JOIN impayes i ON i.payer_id = c.id
WHERE i.statut = 'impaye'
    AND i.facture_soldee = 0
    AND i.is_blacklisted = 0
GROUP BY c.id, c.nom, c.email
HAVING impayesCount > 0
ORDER BY impayesAmount DESC
LIMIT ?;
```

---

## 12. Envoyer un email de test

**Description** : Envoie un email de test avec les données d'un payeur.

**Endpoint** : `POST /api/sequences/{id}/test-email`

**Paramètres d'entrée** (Body JSON) :
| Paramètre | Type | Obligatoire | Description |
|-----------|------|-------------|-------------|
| email_index | integer | Oui | Index de l'email à tester |
| scenario | string | Oui | Format: "single", "multiple", "both", "broker" |
| test_email | string | Oui | Email destinataire du test |
| payeur_id | string | Oui | ID du payeur pour données |

**Réponse JSON** :
```json
{
  "success": true,
  "message": "Email de test envoyé",
  "preview": {
    "to": "test@example.com",
    "sujet": "Test - Relance impayé",
    "corps": "<p>Preview...</p>"
  }
}
```

**Requête SQL** :
```sql
-- Récupérer le scénario
SELECT ss.*, sp.from_email, sp.from_name, sp.signature_html
FROM sequences_scenarios ss
LEFT JOIN smtp_profiles sp ON ss.smtp = sp.id
WHERE ss.sequence_id = ? 
    AND ss.email_index = ? 
    AND ss.format = ?;

-- Récupérer les données du payeur et impayés
SELECT 
    c.*,
    json_group_array(json_object(
        'nfacture', i.nfacture,
        'montant', i.montant_ttc,
        'date_echeance', i.date_echeance
    )) as impayes
FROM contacts c
LEFT JOIN impayes i ON i.payer_id = c.id
WHERE c.id = ? AND i.statut = 'impaye'
GROUP BY c.id;
```

---

## 13. Générer contenu par IA

**Description** : Génère le contenu d'un email via IA.

**Endpoint** : `POST /api/ia/generate-email`

**Paramètres d'entrée** (Body JSON) :
| Paramètre | Type | Obligatoire | Description |
|-----------|------|-------------|-------------|
| prompt | string | Oui | Description du contenu souhaité |
| type | string | Non | "suivi" ou "relance" |
| contexte | object | Non | Contexte: montant, délai, etc. |

**Réponse JSON** :
```json
{
  "success": true,
  "content": {
    "objet": "Suivi de votre facture",
    "corps": "<p>Bonjour,</p><p>Je vous écris concernant...</p>"
  }
}
```

**Note** : Cette route fait appel à un service externe (OpenAI, Claude, etc.) avant de retourner le résultat.

---

## 14. Sauvegarder la séquence complète

**Description** : Sauvegarde atomique de toute la séquence avec ses emails et scénarios.

**Endpoint** : `POST /api/sequences/{id}/save`

**Paramètres d'entrée** (Body JSON) :
| Paramètre | Type | Obligatoire | Description |
|-----------|------|-------------|-------------|
| nom | string | Oui | Nom de la séquence |
| validation_obligatoire | boolean | Oui | Toggle validation |
| attribution_automatique | boolean | Oui | Toggle attribution |
| emails | array | Oui | Liste complète des emails |
| groupes_regles | array | Non | Règles d'attribution |

**Réponse JSON** :
```json
{
  "success": true,
  "saved": true,
  "sequence": {
    "id": "seq_xxx",
    "updated_at": "2024-01-15T11:00:00Z"
  }
}
```

**Requête SQL** (transaction) :
```sql
BEGIN TRANSACTION;

-- Mise à jour séquence
UPDATE sequences
SET 
    nom = ?,
    validation_obligatoire = ?,
    attribution_automatique = ?,
    groupes_regles_json = ?,
    updated_at = datetime('now')
WHERE id = ?;

-- Pour chaque email: UPSERT
INSERT INTO sequences_emails (
    id, sequence_id, email_index, frequence, 
    heure_envoi, jour_envoi, cc, created_at, updated_at
) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
ON CONFLICT(sequence_id, email_index) DO UPDATE SET
    frequence = excluded.frequence,
    heure_envoi = excluded.heure_envoi,
    jour_envoi = excluded.jour_envoi,
    cc = excluded.cc,
    updated_at = datetime('now');

-- Pour chaque scénario: UPSERT
INSERT INTO sequences_scenarios (
    id, sequence_id, email_index, format, active,
    smtp, cc, objet, corps, created_at, updated_at
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
ON CONFLICT(sequence_id, email_index, format) DO UPDATE SET
    active = excluded.active,
    smtp = excluded.smtp,
    cc = excluded.cc,
    objet = excluded.objet,
    corps = excluded.corps,
    updated_at = datetime('now');

COMMIT;
```

---

## 15. Générer les suivis (exécution)

**Description** : Génère les enregistrements de suivi basés sur les séquences de type 'suivi' actives et les impayés correspondants. Typiquement appelé par un job cron.

**Endpoint** : `POST /api/suivis/generate`

**Paramètres d'entrée** (Body JSON) :
| Paramètre | Type | Obligatoire | Description |
|-----------|------|-------------|-------------|
| sequence_id | string | Non | ID séquence spécifique (sinon toutes les actives) |
| date_reference | string | Non | Date de référence (défaut: now) |

**Réponse JSON** :
```json
{
  "success": true,
  "generated": 15,
  "sequences_processed": 2,
  "details": [
    {
      "sequence_id": "seq_xxx",
      "sequence_nom": "Suivi Mensuel",
      "suivis_crees": 8
    }
  ]
}
```

**Requête SQL** :
```sql
-- 1. Récupérer les séquences de suivi actives
SELECT * FROM sequences 
WHERE type_sequence = 'suivi' 
  AND actif = 1
  AND (:sequence_id IS NULL OR id = :sequence_id);

-- 2. Pour chaque séquence, récupérer les impayés avec apporteur
SELECT i.*, c.email, c.nom, c.id as contact_id
FROM impayes i
JOIN contacts c ON i.apporteur_id = c.id
WHERE i.sequence_id = ?
  AND i.facture_soldee = 0
  AND i.is_blacklisted = 0
  AND c.is_blacklisted = 0;

-- 3. Créer les enregistrements de suivi
INSERT INTO suivis (
    id,
    contact_id,
    sequence_id,
    statut,
    date_programmation,
    sujet,
    corps,
    format,
    email_index,
    valide,
    manuelle,
    email_sent,
    created_at,
    updated_at
) VALUES (
    lower(hex(randomblob(16))),
    ?, -- contact_id
    ?, -- sequence_id
    'brouillon',
    ?, -- date_programmée calculée selon fréquence
    ?, -- sujet du scénario
    ?, -- corps du scénario
    ?, -- format (single/multiple/both/broker)
    ?, -- email_index
    0,  -- valide
    0,  -- manuelle
    0,  -- email_sent
    datetime('now'),
    datetime('now')
);

-- 4. Lier aux impayés (table suivi_impayes)
INSERT INTO suivi_impayes (suivi_id, impaye_id)
VALUES (?, ?);
```

---

## 16. Envoyer les suivis programmés

**Description** : Envoie les emails de suivi dont la date de programmation est atteinte. Met à jour le statut et les compteurs d'erreur.

**Endpoint** : `POST /api/suivis/send`

**Paramètres d'entrée** (Body JSON) :
| Paramètre | Type | Obligatoire | Description |
|-----------|------|-------------|-------------|
| limit | integer | Non | Nombre max à envoyer (défaut: 100) |
| dry_run | boolean | Non | true = simulation sans envoi |

**Réponse JSON** :
```json
{
  "success": true,
  "sent": 12,
  "failed": 2,
  "details": [
    {
      "suivi_id": "suivi_xxx",
      "contact_email": "agence@example.com",
      "status": "sent",
      "sent_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

**Requête SQL** :
```sql
-- 1. Récupérer les suivis prêts à être envoyés
SELECT 
    s.id,
    s.contact_id,
    s.sequence_id,
    s.sujet,
    s.corps,
    s.format,
    s.scenario,
    s.cc,
    c.email as contact_email,
    c.nom as contact_nom,
    sp.id as smtp_profile_id,
    sp.host,
    sp.port,
    sp.username,
    sp.password,
    sp.from_email,
    sp.from_name,
    sp.signature_html
FROM suivis s
JOIN contacts c ON s.contact_id = c.id
JOIN sequences seq ON s.sequence_id = seq.id
LEFT JOIN smtp_profiles sp ON s.smtp_profile_id = sp.id
WHERE s.statut IN ('pret pour envoi', 'planifiee', 'brouillon')
  AND (s.date_programmation IS NULL OR s.date_programmation <= datetime('now'))
  AND s.email_sent = 0
  AND s.erreur_count < 3
  AND c.is_blacklisted = 0
ORDER BY s.date_programmation ASC
LIMIT ?;

-- 2. Récupérer les impayés liés pour le template
SELECT i.* 
FROM impayes i
JOIN suivi_impayes si ON i.id = si.impaye_id
WHERE si.suivi_id = ?;

-- 3. Mettre à jour après envoi réussi
UPDATE suivis
SET 
    statut = 'envoyee',
    date_envoi = datetime('now'),
    email_sent = 1,
    updated_at = datetime('now')
WHERE id = ?;

-- 4. Mettre à jour en cas d'échec
UPDATE suivis
SET 
    erreur_count = erreur_count + 1,
    last_error = ?,
    statut = CASE WHEN erreur_count + 1 >= 3 THEN 'erreur' ELSE statut END,
    updated_at = datetime('now')
WHERE id = ?;

-- 5. Créer un événement pour suivi
INSERT INTO events (
    id,
    type,
    titre,
    description,
    entity_type,
    entity_id,
    created_at
) VALUES (
    lower(hex(randomblob(16))),
    'suivi_envoye',
    'Email de suivi envoyé',
    ?,
    'suivi',
    ?,
    datetime('now')
);
```

---

## 17. Lister les suivis

**Description** : Récupère la liste des suivis avec filtres et pagination.

**Endpoint** : `GET /api/suivis`

**Paramètres d'entrée** (Query) :
| Paramètre | Type | Obligatoire | Description |
|-----------|------|-------------|-------------|
| statut | string | Non | Filtrer par statut |
| sequence_id | string | Non | Filtrer par séquence |
| contact_id | string | Non | Filtrer par contact |
| date_from | string | Non | Date début (ISO) |
| date_to | string | Non | Date fin (ISO) |
| page | integer | Non | Page (défaut: 1) |
| limit | integer | Non | Limite (défaut: 20) |

**Réponse JSON** :
```json
{
  "success": true,
  "suivis": [
    {
      "id": "suivi_xxx",
      "contact": { "id": "c_xxx", "nom": "Agence ABC", "email": "a@abc.fr" },
      "sequence": { "id": "seq_xxx", "nom": "Suivi Mensuel" },
      "statut": "envoyee",
      "sujet": "Suivi de vos impayés",
      "date_programmation": "2024-01-15T09:00:00Z",
      "date_envoi": "2024-01-15T09:00:05Z",
      "email_sent": 1,
      "impayes_count": 3,
      "impayes_total": 12500.00
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "total_pages": 8
  }
}
```

**Requête SQL** :
```sql
SELECT 
    s.id,
    s.contact_id,
    s.sequence_id,
    s.statut,
    s.sujet,
    s.date_programmation,
    s.date_envoi,
    s.email_sent,
    s.erreur_count,
    s.last_error,
    c.nom as contact_nom,
    c.email as contact_email,
    seq.nom as sequence_nom,
    COUNT(DISTINCT si.impaye_id) as impayes_count,
    COALESCE(SUM(i.reste_a_payer), 0) as impayes_total
FROM suivis s
JOIN contacts c ON s.contact_id = c.id
JOIN sequences seq ON s.sequence_id = seq.id
LEFT JOIN suivi_impayes si ON s.id = si.suivi_id
LEFT JOIN impayes i ON si.impaye_id = i.id
WHERE (:statut IS NULL OR s.statut = :statut)
  AND (:sequence_id IS NULL OR s.sequence_id = :sequence_id)
  AND (:contact_id IS NULL OR s.contact_id = :contact_id)
  AND (:date_from IS NULL OR s.date_programmation >= :date_from)
  AND (:date_to IS NULL OR s.date_programmation <= :date_to)
GROUP BY s.id
ORDER BY s.date_programmation DESC
LIMIT :limit OFFSET :offset;

-- Count total
SELECT COUNT(*) as total FROM suivis s
WHERE (:statut IS NULL OR s.statut = :statut)
  AND (:sequence_id IS NULL OR s.sequence_id = :sequence_id)
  AND (:contact_id IS NULL OR s.contact_id = :contact_id);
```

---

## Résumé des endpoints

### Configuration (Séquences)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/sequences/{id}` | Détails séquence |
| POST | `/api/sequences` | Créer séquence |
| PUT | `/api/sequences/{id}` | Mettre à jour |
| POST | `/api/sequences/{id}/toggle-publish` | Publier/Dépublier |
| POST | `/api/sequences/{id}/save` | Sauvegarde complète |
| POST | `/api/sequences/{id}/emails` | Ajouter email |
| PUT | `/api/sequences/{id}/emails/{email_index}` | Modifier email |
| DELETE | `/api/sequences/{id}/emails/{email_index}` | Supprimer email |
| GET | `/api/sequences/{id}/emails/{email_index}/scenarios` | Liste scénarios |
| PUT | `/api/sequences/{id}/emails/{email_index}/scenarios/{format}` | Modifier scénario |

### Exécution (Suivis)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/suivis` | Lister les suivis |
| POST | `/api/suivis/generate` | Générer suivis agences |
| POST | `/api/suivis/send` | Envoyer suivis programmés |

### Utilitaires

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/smtp-profiles` | Liste SMTP |
| GET | `/api/payeurs/test` | Payeurs pour test |
| POST | `/api/sequences/{id}/test-email` | Envoyer test |
| POST | `/api/ia/generate-email` | Générer par IA |
