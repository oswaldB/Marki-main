# API REST Backend - Écran Sequence Details Relance

Analyse des interactions data du mockup `sequences-relance-detail.html` et des workflows frontend.

---

## 1. GET /api/sequences/:id

**Description** : Récupère le détail complet d'une séquence de relance avec ses emails et scénarios.

**Méthode HTTP** : `GET`

**Endpoint** : `/api/sequences/:id`

**Paramètres d'entrée** :
| Paramètre | Type | Description |
|-----------|------|-------------|
| `id` | string (path) | ID de la séquence |

**Réponse JSON (200)** :
```json
{
  "id": "seq_123",
  "nom": "Relance Standard 24 étapes",
  "type_sequence": "relance",
  "niveau": 1,
  "actif": 1,
  "publiee": 1,
  "validation_obligatoire": 1,
  "attribution_automatique": 1,
  "operateur_groupes": "ET",
  "scenario": "standard",
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z",
  "emails": [
    {
      "email_index": 1,
      "delai": 15,
      "scenarios": [
        {
          "format": "single",
          "active": 1,
          "smtp": "smtp_1",
          "cc": "",
          "objet": "Rappel - Votre facture",
          "corps": "<p>Bonjour [[payeur_nom]]...</p>"
        },
        {
          "format": "multiple",
          "active": 0,
          "smtp": "",
          "cc": "",
          "objet": "",
          "corps": ""
        },
        {
          "format": "broker_only",
          "active": 0,
          "smtp": "",
          "cc": "",
          "objet": "",
          "corps": ""
        },
        {
          "format": "impayes_broker",
          "active": 0,
          "smtp": "",
          "cc": "",
          "objet": "",
          "corps": ""
        }
      ]
    }
  ],
  "groupes_regles": [
    {
      "operateur_regles": "ET",
      "regles": [
        {
          "champ": "payeur_type",
          "operateur": "egal",
          "valeur": "Propriétaire"
        }
      ]
    }
  ]
}
```

**Requête SQL** :
```sql
-- Séquence principale
SELECT 
  s.id,
  s.nom,
  s.type_sequence,
  s.niveau,
  s.actif,
  s.validation_obligatoire,
  s.attribution_automatique,
  s.scenario,
  s.emails_json,
  s.regles_json,
  s.groupes_regles_json,
  s.lien_paiement,
  s.created_at,
  s.updated_at
FROM sequences s
WHERE s.id = :id;

-- Scénarios liés
SELECT 
  ss.id,
  ss.sequence_id,
  ss.email_index,
  ss.format,
  ss.active,
  ss.smtp,
  ss.cc,
  ss.objet,
  ss.corps
FROM sequences_scenarios ss
WHERE ss.sequence_id = :id
ORDER BY ss.email_index, ss.format;
```

---

## 2. PUT /api/sequences/:id

**Description** : Met à jour une séquence complète (nom, validation, emails, règles).

**Méthode HTTP** : `PUT`

**Endpoint** : `/api/sequences/:id`

**Paramètres d'entrée** :
| Paramètre | Type | Description |
|-----------|------|-------------|
| `id` | string (path) | ID de la séquence |
| `nom` | string (body) | Nom de la séquence |
| `validationObligatoire` | boolean (body) | Validation obligatoire |
| `attributionAuto` | boolean (body) | Attribution automatique |
| `publiee` | boolean (body) | Statut de publication |
| `emails` | array (body) | Liste des emails avec scénarios |
| `groupesRegles` | array (body) | Groupes de règles d'attribution |
| `operateurGroupes` | string (body) | Opérateur entre groupes (ET/OU) |

**Body JSON** :
```json
{
  "nom": "Relance Standard 24 étapes",
  "validationObligatoire": true,
  "attributionAuto": true,
  "publiee": true,
  "operateurGroupes": "ET",
  "emails": [
    {
      "email_index": 1,
      "delai": 15,
      "activeScenario": "single",
      "scenarios": {
        "single": {
          "active": true,
          "smtp": "smtp_1",
          "cc": "",
          "objet": "Rappel - Votre facture",
          "corps": "<p>Bonjour...</p>"
        },
        "multiple": { "active": false, "smtp": "", "cc": "", "objet": "", "corps": "" },
        "broker_only": { "active": false, "smtp": "", "cc": "", "objet": "", "corps": "" },
        "impayes_broker": { "active": false, "smtp": "", "cc": "", "objet": "", "corps": "" }
      }
    }
  ],
  "groupesRegles": [
    {
      "operateurRegles": "ET",
      "regles": [
        { "champ": "payeur_type", "operateur": "egal", "valeur": "Propriétaire" }
      ]
    }
  ]
}
```

**Réponse JSON (200)** :
```json
{
  "success": true,
  "sequence": { /* ... */ },
  "message": "Séquence mise à jour avec succès"
}
```

**Requête SQL** :
```sql
-- Transaction BEGIN
BEGIN TRANSACTION;

-- Update séquence principale
UPDATE sequences SET
  nom = :nom,
  validation_obligatoire = :validation_obligatoire,
  attribution_automatique = :attribution_auto,
  actif = :publiee,
  emails_json = :emails_json,
  groupes_regles_json = :groupes_regles_json,
  updated_at = CURRENT_TIMESTAMP
WHERE id = :id;

-- Supprimer anciens scénarios
DELETE FROM sequences_scenarios WHERE sequence_id = :id;

-- Insérer nouveaux scénarios (pour chaque email et chaque format actif)
INSERT INTO sequences_scenarios 
  (id, sequence_id, email_index, format, active, smtp, cc, objet, corps, created_at, updated_at)
VALUES 
  (:id, :sequence_id, :email_index, :format, :active, :smtp, :cc, :objet, :corps, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

COMMIT;
```

---

## 3. GET /api/liens-paiement

**Description** : Récupère la liste des liens de paiement configurés.

**Méthode HTTP** : `GET`

**Endpoint** : `/api/liens-paiement`

**Paramètres d'entrée** (query) :
| Paramètre | Type | Description |
|-----------|------|-------------|
| `statut` | string (optional) | Filtre par statut (`actif` ou `all`) |

**Réponse JSON (200)** :
```json
{
  "success": true,
  "liens": [
    {
      "id": "lien_1",
      "nom": "Paiement CB Stripe",
      "url": "https://pay.stripe.com/facture/[[nfacture]]?montant=[[reste_a_payer]]",
      "actif": 1,
      "created_at": "2024-01-10T08:00:00Z",
      "updated_at": "2024-01-10T08:00:00Z"
    },
    {
      "id": "lien_2",
      "nom": "Virement bancaire",
      "url": "https://marki.fr/paiement/virement?client=[[payeur_nom]]",
      "actif": 1,
      "created_at": "2024-01-11T09:00:00Z",
      "updated_at": "2024-01-11T09:00:00Z"
    }
  ]
}
```

**Requête SQL** :
```sql
SELECT 
  id,
  nom,
  url,
  created_at,
  updated_at
FROM lien_paiements
ORDER BY created_at DESC;
```

---

## 4. POST /api/liens-paiement

**Description** : Crée un nouveau lien de paiement.

**Méthode HTTP** : `POST`

**Endpoint** : `/api/liens-paiement`

**Paramètres d'entrée** (body) :
| Paramètre | Type | Description |
|-----------|------|-------------|
| `nom` | string | Nom du lien |
| `url` | string | URL avec variables |

**Body JSON** :
```json
{
  "nom": "Paiement PayPal",
  "url": "https://paypal.me/pay/[[nfacture]]?amount=[[reste_a_payer]]"
}
```

**Réponse JSON (201)** :
```json
{
  "success": true,
  "lien": {
    "id": "lien_3",
    "nom": "Paiement PayPal",
    "url": "https://paypal.me/pay/...",
    "created_at": "2024-01-20T14:30:00Z",
    "updated_at": "2024-01-20T14:30:00Z"
  }
}
```

**Requête SQL** :
```sql
INSERT INTO lien_paiements (id, nom, url, created_at, updated_at)
VALUES (:id, :nom, :url, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
```

---

## 5. PUT /api/liens-paiement/:id

**Description** : Met à jour un lien de paiement existant.

**Méthode HTTP** : `PUT`

**Endpoint** : `/api/liens-paiement/:id`

**Paramètres d'entrée** :
| Paramètre | Type | Description |
|-----------|------|-------------|
| `id` | string (path) | ID du lien |
| `nom` | string (body) | Nouveau nom |
| `url` | string (body) | Nouvelle URL |

**Body JSON** :
```json
{
  "nom": "Paiement CB Stripe (modifié)",
  "url": "https://pay.stripe.com/facture/[[nfacture]]?amount=[[reste_a_payer]]"
}
```

**Réponse JSON (200)** :
```json
{
  "success": true,
  "lien": { /* ... */ }
}
```

**Requête SQL** :
```sql
UPDATE lien_paiements SET
  nom = :nom,
  url = :url,
  updated_at = CURRENT_TIMESTAMP
WHERE id = :id;
```

---

## 6. DELETE /api/liens-paiement/:id

**Description** : Supprime un lien de paiement.

**Méthode HTTP** : `DELETE`

**Endpoint** : `/api/liens-paiement/:id`

**Paramètres d'entrée** :
| Paramètre | Type | Description |
|-----------|------|-------------|
| `id` | string (path) | ID du lien |

**Réponse JSON (200)** :
```json
{
  "success": true,
  "message": "Lien supprimé"
}
```

**Requête SQL** :
```sql
DELETE FROM lien_paiements WHERE id = :id;
```

---

## 7. GET /api/impayes/payeurs-avec-impayes

**Description** : Récupère la liste des payeurs ayant des impayés (pour tester les emails).

**Méthode HTTP** : `GET`

**Endpoint** : `/api/impayes/payeurs-avec-impayes`

**Paramètres d'entrée** (query) :
| Paramètre | Type | Description |
|-----------|------|-------------|
| `limit` | integer (optional) | Nombre max de résultats (défaut: 50) |

**Réponse JSON (200)** :
```json
{
  "success": true,
  "payeurs": [
    {
      "id": "contact_1",
      "nom": "Dupont",
      "prenom": "Jean",
      "email": "jean.dupont@email.com",
      "telephone": "06 12 34 56 78",
      "adresse": "123 Rue de Paris",
      "ville": "Paris",
      "code_postal": "75001",
      "impayes": [
        {
          "nfacture": "FA-2024-001",
          "montant": 1250.00,
          "reste_a_payer": 1250.00,
          "date_echeance": "2024-01-15",
          "date_piece": "2024-01-01",
          "ref_piece": "REF001",
          "numero_dossier": "DOS-001",
          "adresse_bien": "123 Rue de Paris",
          "code_postal": "75001",
          "ville": "Paris"
        }
      ]
    }
  ]
}
```

**Requête SQL** :
```sql
-- Payeurs avec impayés
SELECT DISTINCT 
  c.id,
  c.nom,
  c.prenom,
  c.email,
  c.telephone,
  c.adresse_rue,
  c.adresse_ville,
  c.adresse_code_postal
FROM contacts c
INNER JOIN impayes i ON i.payer_id = c.id
WHERE i.reste_a_payer > 0 
  AND i.facture_soldee = 0
  AND i.is_blacklisted = 0
LIMIT :limit;

-- Impayés par payeur (requête séparée ou JSON_GROUP_ARRAY)
SELECT 
  i.payer_id,
  i.nfacture,
  i.montant_ttc,
  i.reste_a_payer,
  i.date_echeance,
  i.date_piece,
  i.reference as ref_piece,
  i.numero_dossier,
  i.adresse_bien,
  i.code_postal,
  i.ville
FROM impayes i
WHERE i.payer_id IN (:payer_ids)
  AND i.reste_a_payer > 0
  AND i.facture_soldee = 0;
```

---

## 8. GET /api/smtp-profiles

**Description** : Récupère la liste des profils SMTP disponibles.

**Méthode HTTP** : `GET`

**Endpoint** : `/api/smtp-profiles`

**Paramètres d'entrée** : Aucun

**Réponse JSON (200)** :
```json
{
  "success": true,
  "profiles": [
    {
      "id": "smtp_1",
      "nom": "SMTP Principal",
      "host": "smtp.marki.fr",
      "port": 587,
      "from_email": "relance@marki.fr",
      "from_name": "Marki Relance",
      "actif": 1,
      "is_default": 1
    },
    {
      "id": "smtp_2",
      "nom": "SMTP Secondaire",
      "host": "smtp2.marki.fr",
      "port": 587,
      "from_email": "noreply@marki.fr",
      "from_name": "Marki",
      "actif": 1,
      "is_default": 0
    }
  ]
}
```

**Requête SQL** :
```sql
SELECT 
  id,
  nom,
  host,
  port,
  username,
  from_email,
  from_name,
  actif,
  is_default
FROM smtp_profiles
WHERE actif = 1
ORDER BY is_default DESC, nom ASC;
```

---

## 9. POST /api/workflows/test-single/execute

**Description** : Exécute le workflow d'envoi d'email de test.

**Méthode HTTP** : `POST`

**Endpoint** : `/api/workflows/test-single/execute`

**Paramètres d'entrée** (body) :
| Paramètre | Type | Description |
|-----------|------|-------------|
| `sequence_id` | string | ID de la séquence |
| `email_index` | integer | Index de l'email à tester |
| `scenario` | string | Format du scénario (`single`, `multiple`, `broker_only`, `impayes_broker`) |
| `destinataire` | string | Adresse email de test |
| `payeur_id` | string | ID du payeur pour les variables |

**Body JSON** :
```json
{
  "sequence_id": "seq_123",
  "email_index": 1,
  "scenario": "single",
  "destinataire": "test@example.com",
  "payeur_id": "contact_1"
}
```

**Réponse JSON (200)** :
```json
{
  "success": true,
  "sent": true,
  "preview": {
    "sujet": "Rappel - Votre facture FA-2024-001",
    "corps": "<p>Bonjour Monsieur Dupont...</p>",
    "variables_replaced": {
      "payeur_nom": "Dupont",
      "nfacture": "FA-2024-001",
      "montant_total": "1250.00"
    }
  }
}
```

**Requête SQL** :
```sql
-- Récupérer le scénario
SELECT * FROM sequences_scenarios 
WHERE sequence_id = :sequence_id 
  AND email_index = :email_index 
  AND format = :scenario;

-- Récupérer les données du payeur
SELECT 
  c.*,
  i.nfacture,
  i.montant_ttc as montant_total,
  i.reste_a_payer,
  i.date_echeance,
  i.date_piece,
  i.reference as ref_piece,
  i.numero_dossier,
  i.adresse_bien,
  i.code_postal as code_postal_bien,
  i.ville as ville_bien,
  i.etage,
  i.porte,
  i.numero_lot,
  i.proprietaire_nom,
  i.proprietaire_prenom,
  i.proprietaire_email,
  i.apporteur_nom,
  i.apporteur_prenom,
  i.apporteur_email,
  i.employe_intervention
FROM contacts c
LEFT JOIN impayes i ON i.payer_id = c.id
WHERE c.id = :payeur_id
  AND i.reste_a_payer > 0
LIMIT 1;

-- Insérer log d'envoi de test
INSERT INTO events (id, type, titre, description, entity_type, entity_id, created_at)
VALUES (:id, 'test_email', 'Email de test envoyé', :description, 'sequence', :sequence_id, CURRENT_TIMESTAMP);
```

---

## 10. POST /api/workflows/attribution-impayes/execute

**Description** : Lance l'attribution automatique des impayés à une séquence.

**Méthode HTTP** : `POST`

**Endpoint** : `/api/workflows/attribution-impayes/execute`

**Paramètres d'entrée** (body) :
| Paramètre | Type | Description |
|-----------|------|-------------|
| `sequence_id` | string | ID de la séquence |

**Body JSON** :
```json
{
  "sequence_id": "seq_123"
}
```

**Réponse JSON (200)** :
```json
{
  "success": true,
  "assigned_count": 15,
  "message": "15 impayés ont été attribués à cette séquence"
}
```

**Requête SQL** :
```sql
-- Récupérer les règles de la séquence
SELECT regles_json, groupes_regles_json 
FROM sequences 
WHERE id = :sequence_id;

-- Sélectionner les impayés correspondant aux règles (exemple avec règle sur payeur_type)
SELECT 
  i.id as impaye_id,
  i.payer_id,
  i.payeur_type,
  i.montant_ttc,
  i.reste_a_payer,
  i.date_echeance
FROM impayes i
WHERE i.reste_a_payer > 0
  AND i.facture_soldee = 0
  AND i.is_blacklisted = 0
  AND i.sequence_id IS NULL
  AND (
    -- Appliquer les règles dynamiques
    i.payeur_type = 'Propriétaire' -- exemple
  );

-- Attribuer les impayés trouvés
UPDATE impayes 
SET sequence_id = :sequence_id, updated_at = CURRENT_TIMESTAMP
WHERE id IN (:impaye_ids);

-- Créer les relances pour chaque impayé attribué
INSERT INTO relances (id, contact_id, sequence_id, statut, sujet, corps, created_at, updated_at)
SELECT 
  :relance_id,
  i.payer_id,
  :sequence_id,
  'brouillon',
  :sujet_template,
  :corps_template,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM impayes i
WHERE i.id = :impaye_id;
```

---

## 11. POST /api/workflows/regenerer-relances/execute

**Description** : Régénère les relances pour la séquence (reset des dates, etc.).

**Méthode HTTP** : `POST`

**Endpoint** : `/api/workflows/regenerer-relances/execute`

**Paramètres d'entrée** (body) :
| Paramètre | Type | Description |
|-----------|------|-------------|
| `sequence_id` | string | ID de la séquence |
| `reset_dates` | boolean | Réinitialiser les dates de relance |
| `include_sent` | boolean | Inclure les relances déjà envoyées |

**Body JSON** :
```json
{
  "sequence_id": "seq_123",
  "reset_dates": true,
  "include_sent": false
}
```

**Réponse JSON (200)** :
```json
{
  "success": true,
  "regenerated_count": 12,
  "message": "12 relances ont été régénérées"
}
```

**Requête SQL** :
```sql
-- Récupérer les relances à régénérer
SELECT 
  r.id,
  r.contact_id,
  r.email_index,
  r.scenario,
  r.sujet,
  r.corps
FROM relances r
WHERE r.sequence_id = :sequence_id
  AND (:include_sent = 1 OR r.email_sent = 0);

-- Mettre à jour les relances (recalculer les dates, etc.)
UPDATE relances 
SET 
  date_programmation = CASE 
    WHEN :reset_dates = 1 THEN date('now', '+' || :delai || ' days')
    ELSE date_programmation 
  END,
  statut = CASE 
    WHEN email_sent = 0 THEN 'brouillon'
    ELSE statut 
  END,
  updated_at = CURRENT_TIMESTAMP
WHERE sequence_id = :sequence_id
  AND (:include_sent = 1 OR email_sent = 0);

-- Log de l'action
INSERT INTO events (id, type, titre, entity_type, entity_id, created_at, metadata)
VALUES (:id, 'regeneration', 'Relances régénérées', 'sequence', :sequence_id, CURRENT_TIMESTAMP, :metadata);
```

---

## 12. POST /api/sequences/:id/duplicate

**Description** : Duplique une séquence existante (crée une copie en brouillon).

**Méthode HTTP** : `POST`

**Endpoint** : `/api/sequences/:id/duplicate`

**Paramètres d'entrée** :
| Paramètre | Type | Description |
|-----------|------|-------------|
| `id` | string (path) | ID de la séquence source |
| `nouveau_nom` | string (body, optional) | Nom pour la copie |

**Body JSON** :
```json
{
  "nouveau_nom": "Copie de Relance Standard"
}
```

**Réponse JSON (201)** :
```json
{
  "success": true,
  "sequence": {
    "id": "seq_124",
    "nom": "Copie de Relance Standard",
    "publiee": false,
    "emails": [ /* ...copie des emails... */ ]
  }
}
```

**Requête SQL** :
```sql
BEGIN TRANSACTION;

-- Créer la copie de la séquence
INSERT INTO sequences (
  id, nom, type_sequence, niveau, actif, validation_obligatoire,
  attribution_automatique, scenario, emails_json, regles_json,
  groupes_regles_json, operateur_groupes, created_at, updated_at
)
SELECT 
  :new_id,
  COALESCE(:nouveau_nom, nom || ' (copie)'),
  type_sequence,
  niveau,
  0, -- brouillon
  validation_obligatoire,
  attribution_automatique,
  scenario,
  emails_json,
  regles_json,
  groupes_regles_json,
  operateur_groupes,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM sequences
WHERE id = :id;

-- Copier les scénarios
INSERT INTO sequences_scenarios (
  id, sequence_id, email_index, format, active, smtp, cc, objet, corps, created_at, updated_at
)
SELECT 
  :new_scenario_id,
  :new_id,
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
```

---

## Résumé des Routes

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/api/sequences/:id` | Détails d'une séquence |
| `PUT` | `/api/sequences/:id` | Mise à jour complète |
| `POST` | `/api/sequences/:id/duplicate` | Dupliquer la séquence |
| `GET` | `/api/liens-paiement` | Liste des liens de paiement |
| `POST` | `/api/liens-paiement` | Créer un lien |
| `PUT` | `/api/liens-paiement/:id` | Modifier un lien |
| `DELETE` | `/api/liens-paiement/:id` | Supprimer un lien |
| `GET` | `/api/impayes/payeurs-avec-impayes` | Payeurs pour test |
| `GET` | `/api/smtp-profiles` | Profils SMTP |
| `POST` | `/api/workflows/test-single/execute` | Tester un email |
| `POST` | `/api/workflows/attribution-impayes/execute` | Attribution auto |
| `POST` | `/api/workflows/regenerer-relances/execute` | Régénérer relances |

---

## Tables Impactées

- `sequences` - Données principales des séquences
- `sequences_scenarios` - Scénarios d'emails par format
- `lien_paiements` - Liens de paiement configurables
- `smtp_profiles` - Profils SMTP
- `impayes` - Impayés et leur attribution
- `relances` - Relances générées
- `contacts` - Données des payeurs
- `events` - Logs d'actions
