# Routes API REST - Écran Impayés Detail

Document de spécification des routes API backend pour l'écran de détail d'un impayé.

---

## 1. Chargement du détail d'un impayé

**Description** : Récupère toutes les données d'un impayé spécifique avec ses relations (payeur, propriétaire, apporteur, bien, etc.)

- **Méthode HTTP** : `GET`
- **Endpoint** : `/api/impayes/{id}`

### Paramètres d'entrée

| Nom | Type | Obligatoire | Description |
|-----|------|-------------|-------------|
| id | string | Oui | ID unique de l'impayé (UUID) |

### Headers

```
Authorization: Bearer {token}
Content-Type: application/json
```

### Réponse JSON (200 OK)

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "nfacture": "FAC-2024-001",
    "numero_dossier": "D-2024-045",
    "date_facture": "2024-01-15",
    "date_echeance": "2024-02-15",
    "montant_ttc": 12500.00,
    "reste_a_payer": 8500.00,
    "statut": "impaye",
    "is_blacklisted": 0,
    "blacklist_motif": null,
    "blacklist_date": null,
    "sequence_id": "uuid-sequence",
    "sequence_nom": "R2 - Deuxième relance",
    "email_index": 2,
    "url_pdf": "/storage/factures/uuid.pdf",
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-03-15T14:20:00Z",
    "payeur": {
      "id": "uuid-contact",
      "nom": "Dupont",
      "prenom": "Jean",
      "email": "contact@acme.fr",
      "email_force": "finance@acme.fr",
      "telephone": "01 23 45 67 89",
      "civilite": "M.",
      "type_personne": "physique"
    },
    "proprietaire": {
      "id": "uuid-proprio",
      "nom": "Martin",
      "prenom": "Paul",
      "email": "m.dupont@email.fr",
      "telephone": "01 98 76 54 32"
    },
    "apporteur": {
      "id": "uuid-apporteur",
      "nom": "Agence Immo Plus",
      "email": "contact@agenceplus.fr",
      "telephone": "01 98 76 54 32"
    },
    "bien": {
      "id": "uuid-bien",
      "adresse": "12 Rue de la Paix, 75002 Paris",
      "type": "Bureaux",
      "surface": "250 m²",
      "code_postal": "75002",
      "ville": "Paris"
    },
    "interventions": [
      {
        "id": "uuid-interv",
        "type": "Maintenance",
        "date": "2024-02-10",
        "agent": "Pierre Martin",
        "description": "Révision annuelle climatisation",
        "bien": "Bureaux étage 2"
      }
    ],
    "missions": [
      {
        "id": "uuid-mission",
        "type": "Diagnostic amiante",
        "date_intervention": "2024-01-10",
        "description": "Diagnostic réglementaire avant travaux"
      }
    ],
    "metadonnees": {
      "date_creation": "2024-01-15T10:30:00Z",
      "date_import": "2024-01-16T08:15:00Z",
      "source": "ADTI",
      "jours_retard": 45,
      "taux_paye": 32
    }
  }
}
```

### Requête SQL

```sql
SELECT 
    i.*,
    s.nom as sequence_nom,
    p.id as payeur_id,
    p.nom as payeur_nom,
    p.prenom as payeur_prenom,
    p.email as payeur_email,
    p.email_force as payeur_email_force,
    p.telephone as payeur_telephone,
    p.civilite as payeur_civilite,
    p.type_personne as payeur_type_personne,
    pr.id as proprietaire_id,
    pr.nom as proprietaire_nom,
    pr.prenom as proprietaire_prenom,
    pr.email as proprietaire_email,
    pr.telephone as proprietaire_telephone,
    a.id as apporteur_id,
    a.nom as apporteur_nom,
    a.prenom as apporteur_prenom,
    a.email as apporteur_email,
    a.telephone as apporteur_telephone,
    CAST((julianday('now') - julianday(i.date_echeance)) AS INTEGER) as jours_retard,
    CAST(((i.montant_ttc - i.reste_a_payer) / i.montant_ttc * 100) AS INTEGER) as taux_paye
FROM impayes i
LEFT JOIN sequences s ON i.sequence_id = s.id
LEFT JOIN contacts p ON i.payer_id = p.id
LEFT JOIN contacts pr ON i.proprietaire_id = pr.id
LEFT JOIN contacts a ON i.apporteur_id = a.id
WHERE i.id = ?
```

---

## 2. Récupération des notes d'un impayé

**Description** : Récupère la liste des notes JSON associées à un impayé

- **Méthode HTTP** : `GET`
- **Endpoint** : `/api/impayes/{id}/notes`

### Paramètres d'entrée

| Nom | Type | Obligatoire | Description |
|-----|------|-------------|-------------|
| id | string | Oui | ID de l'impayé |

### Réponse JSON (200 OK)

```json
{
  "success": true,
  "data": {
    "notes": [
      {
        "id": "uuid-note",
        "content": "Client contacté par téléphone, promesse de paiement pour la semaine prochaine",
        "author": "Marie Dubois",
        "created_at": "2024-03-15T10:30:00Z"
      }
    ]
  }
}
```

### Requête SQL

```sql
SELECT 
    n.id,
    n.content,
    n.author,
    n.created_at
FROM impaye_notes n
WHERE n.impaye_id = ?
ORDER BY n.created_at DESC
```

---

## 3. Création d'une note sur un impayé

**Description** : Ajoute une nouvelle note à un impayé

- **Méthode HTTP** : `POST`
- **Endpoint** : `/api/impayes/{id}/notes`

### Paramètres d'entrée

| Nom | Type | Obligatoire | Description |
|-----|------|-------------|-------------|
| id | string | Oui | ID de l'impayé (path param) |
| content | string | Oui | Contenu de la note |
| author | string | Oui | Nom de l'auteur |

### Body JSON

```json
{
  "content": "Client contacté par téléphone, promesse de paiement",
  "author": "Marie Dubois"
}
```

### Réponse JSON (201 Created)

```json
{
  "success": true,
  "data": {
    "note": {
      "id": "uuid-note",
      "content": "Client contacté par téléphone, promesse de paiement",
      "author": "Marie Dubois",
      "created_at": "2024-03-20T14:30:00Z"
    }
  }
}
```

### Requête SQL

```sql
-- Insertion de la note
INSERT INTO impaye_notes (id, impaye_id, content, author, created_at)
VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP);

-- Création d'un événement lié
INSERT INTO events (id, type, titre, description, entity_type, entity_id, created_at)
VALUES (?, 'note', 'Note ajoutée', ?, 'impaye', ?, CURRENT_TIMESTAMP);
```

---

## 4. Suppression d'une note

**Description** : Supprime une note spécifique d'un impayé

- **Méthode HTTP** : `DELETE`
- **Endpoint** : `/api/impayes/{id}/notes/{noteId}`

### Paramètres d'entrée

| Nom | Type | Obligatoire | Description |
|-----|------|-------------|-------------|
| id | string | Oui | ID de l'impayé |
| noteId | string | Oui | ID de la note à supprimer |

### Réponse JSON (200 OK)

```json
{
  "success": true,
  "message": "Note supprimée avec succès"
}
```

### Requête SQL

```sql
DELETE FROM impaye_notes 
WHERE id = ? AND impaye_id = ?;
```

---

## 5. Récupération des notes d'un contact (payeur)

**Description** : Récupère les notes associées au contact payeur

- **Méthode HTTP** : `GET`
- **Endpoint** : `/api/contacts/{id}/notes`

### Paramètres d'entrée

| Nom | Type | Obligatoire | Description |
|-----|------|-------------|-------------|
| id | string | Oui | ID du contact |

### Réponse JSON (200 OK)

```json
{
  "success": true,
  "data": {
    "notes": [
      {
        "id": "uuid-note",
        "content": "Contact difficile, préfère le mail",
        "author": "Pierre Martin",
        "created_at": "2024-02-10T09:15:00Z"
      }
    ]
  }
}
```

### Requête SQL

```sql
SELECT 
    n.id,
    n.content,
    n.author,
    n.created_at
FROM contact_notes n
WHERE n.contact_id = ?
ORDER BY n.created_at DESC
```

---

## 6. Création d'une note sur un contact

**Description** : Ajoute une note au contact payeur

- **Méthode HTTP** : `POST`
- **Endpoint** : `/api/contacts/{id}/notes`

### Paramètres d'entrée

| Nom | Type | Obligatoire | Description |
|-----|------|-------------|-------------|
| id | string | Oui | ID du contact |
| content | string | Oui | Contenu de la note |
| author | string | Oui | Nom de l'auteur |

### Réponse JSON (201 Created)

```json
{
  "success": true,
  "data": {
    "note": {
      "id": "uuid-note",
      "content": "Contact difficile, préfère le mail",
      "author": "Pierre Martin",
      "created_at": "2024-03-20T14:30:00Z"
    }
  }
}
```

### Requête SQL

```sql
INSERT INTO contact_notes (id, contact_id, content, author, created_at)
VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP);
```

---

## 7. Récupération des événements liés à un impayé

**Description** : Récupère l'historique des événements (relances, paiements, suspensions) liés à un impayé

- **Méthode HTTP** : `GET`
- **Endpoint** : `/api/events/by-entity`

### Paramètres d'entrée (Query)

| Nom | Type | Obligatoire | Description |
|-----|------|-------------|-------------|
| entity_type | string | Oui | Type d'entité ('impaye') |
| entity_id | string | Oui | ID de l'impayé |

### Réponse JSON (200 OK)

```json
{
  "success": true,
  "data": {
    "events": [
      {
        "id": "uuid-event",
        "type": "relance",
        "titre": "Relance R2 envoyée",
        "description": "Email envoyé à contact@acme.fr",
        "icon": "fa-paper-plane",
        "created_at": "2024-03-15T10:00:00Z",
        "emails": [
          {
            "id": "uuid-email",
            "sujet": "Relance - Facture impayée",
            "destinataire": "contact@acme.fr",
            "statut": "ouvert",
            "date_ouverture": "2024-03-15T10:23:00Z"
          }
        ]
      },
      {
        "id": "uuid-event2",
        "type": "paiement",
        "titre": "Paiement partiel reçu",
        "description": "4 000,00 € reçus par virement",
        "icon": "fa-euro-sign",
        "created_at": "2024-03-10T14:30:00Z"
      }
    ]
  }
}
```

### Requête SQL

```sql
SELECT 
    e.*,
    GROUP_CONCAT(
        json_object(
            'id', em.id,
            'sujet', em.sujet,
            'destinataire', em.destinataire,
            'statut', em.statut,
            'date_ouverture', em.date_ouverture
        )
    ) as emails_json
FROM events e
LEFT JOIN event_emails em ON e.id = em.event_id
WHERE e.entity_type = 'impaye' 
  AND e.entity_id = ?
GROUP BY e.id
ORDER BY e.created_at DESC
```

---

## 8. Récupération des relances d'un contact

**Description** : Récupère toutes les relances associées au contact payeur

- **Méthode HTTP** : `GET`
- **Endpoint** : `/api/relances`

### Paramètres d'entrée (Query)

| Nom | Type | Obligatoire | Description |
|-----|------|-------------|-------------|
| contact_id | string | Oui | ID du contact payeur |

### Réponse JSON (200 OK)

```json
{
  "success": true,
  "data": {
    "relances": [
      {
        "id": "uuid-relance",
        "sequence_nom": "R2 - Deuxième relance",
        "statut": "envoyee",
        "date_envoi": "2024-03-15T10:00:00Z",
        "sujet": "Relance - Facture FAC-2024-001 impayée",
        "contact_email": "contact@acme.fr",
        "email_sent": 1,
        "created_at": "2024-03-15T10:00:00Z"
      },
      {
        "id": "uuid-relance2",
        "sequence_nom": "R1 - Première relance",
        "statut": "envoyee",
        "date_envoi": "2024-03-01T09:00:00Z",
        "sujet": "Rappel - Votre facture est arrivée à échéance",
        "contact_email": "contact@acme.fr",
        "email_sent": 1,
        "created_at": "2024-03-01T09:00:00Z"
      }
    ]
  }
}
```

### Requête SQL

```sql
SELECT 
    r.*,
    s.nom as sequence_nom,
    c.email as contact_email
FROM relances r
JOIN sequences s ON r.sequence_id = s.id
JOIN contacts c ON r.contact_id = c.id
WHERE r.contact_id = ?
ORDER BY r.date_envoi DESC
```

---

## 9. Récupération des séquences disponibles

**Description** : Récupère la liste des séquences de relance actives pour le sélecteur

- **Méthode HTTP** : `GET`
- **Endpoint** : `/api/impayes/sequences`

### Réponse JSON (200 OK)

```json
{
  "success": true,
  "data": {
    "sequences": [
      {
        "id": "uuid-seq1",
        "nom": "R1 - Première relance (J+15)",
        "type_sequence": "standard",
        "niveau": 1,
        "actif": 1
      },
      {
        "id": "uuid-seq2",
        "nom": "R2 - Deuxième relance (J+30)",
        "type_sequence": "standard",
        "niveau": 2,
        "actif": 1
      },
      {
        "id": "uuid-seq3",
        "nom": "R3 - Troisième relance (J+45)",
        "type_sequence": "avance",
        "niveau": 3,
        "actif": 1
      }
    ]
  }
}
```

### Requête SQL

```sql
SELECT 
    id,
    nom,
    type_sequence,
    niveau,
    actif
FROM sequences
WHERE actif = 1
ORDER BY niveau ASC
```

---

## 10. Changement de séquence d'un impayé

**Description** : Change la séquence de relance d'un impayé avec option restart/continue

- **Méthode HTTP** : `POST`
- **Endpoint** : `/api/impayes/{id}/change-sequence`

### Paramètres d'entrée

| Nom | Type | Obligatoire | Description |
|-----|------|-------------|-------------|
| id | string | Oui | ID de l'impayé |
| sequence_id | string | Non* | Nouvelle séquence (*requis sauf si remove_all) |
| mode | string | Non | 'restart' ou 'continue' (défaut: 'continue') |
| remove_all | boolean | Non | Si true, retire de toutes les séquences |

### Body JSON

```json
{
  "sequence_id": "uuid-nouvelle-sequence",
  "mode": "restart"
}
```

### Réponse JSON (200 OK)

```json
{
  "success": true,
  "data": {
    "sequence": {
      "id": "uuid-nouvelle-sequence",
      "nom": "R3 - Troisième relance"
    },
    "relances_created": 1,
    "relances_deleted": 1,
    "mode": "restart"
  }
}
```

### Requête SQL

```sql
-- Transaction begin

-- 1. Mettre à jour l'impayé
UPDATE impayes 
SET sequence_id = ?, 
    updated_at = CURRENT_TIMESTAMP
WHERE id = ?;

-- 2. Si mode 'restart', supprimer les relances futures
DELETE FROM relances 
WHERE contact_id = (
    SELECT payer_id FROM impayes WHERE id = ?
)
AND statut IN ('brouillon', 'planifiee')
AND date_envoi > CURRENT_TIMESTAMP;

-- 3. Créer les nouvelles relances selon la séquence
INSERT INTO relances (id, contact_id, sequence_id, statut, sujet, corps, date_programmation, created_at, updated_at)
SELECT 
    lower(hex(randomblob(16))),
    i.payer_id,
    ?,
    'planifiee',
    se.objet,
    se.corps,
    datetime('now', '+' || se.delai || ' days'),
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM impayes i
JOIN sequences_emails se ON se.sequence_id = ?
WHERE i.id = ?;

-- 4. Créer un événement
INSERT INTO events (id, type, titre, description, entity_type, entity_id, created_at)
VALUES (?, 'systeme', 'Séquence modifiée', ?, 'impaye', ?, CURRENT_TIMESTAMP);

-- Transaction commit
```

---

## 11. Suspension d'un impayé

**Description** : Suspend les relances pour un impayé avec motif

- **Méthode HTTP** : `POST`
- **Endpoint** : `/api/impayes/{id}/suspend`

### Paramètres d'entrée

| Nom | Type | Obligatoire | Description |
|-----|------|-------------|-------------|
| id | string | Oui | ID de l'impayé |
| motif | string | Oui | Motif de suspension |
| detail | string | Non | Détails additionnels |

### Body JSON

```json
{
  "motif": "litige",
  "detail": "Litige commercial en cours de résolution"
}
```

### Réponse JSON (200 OK)

```json
{
  "success": true,
  "data": {
    "id": "uuid-impaye",
    "statut": "suspendue",
    "is_blacklisted": 1,
    "blacklist_motif": "litige",
    "blacklist_date": "2024-03-20T14:30:00Z"
  }
}
```

### Requête SQL

```sql
-- Transaction begin

-- 1. Mettre à jour l'impayé
UPDATE impayes 
SET statut = 'suspendue',
    is_blacklisted = 1,
    blacklist_motif = ?,
    blacklist_date = CURRENT_TIMESTAMP,
    updated_at = CURRENT_TIMESTAMP
WHERE id = ?;

-- 2. Annuler les relances planifiées
UPDATE relances 
SET statut = 'annulee',
    updated_at = CURRENT_TIMESTAMP
WHERE contact_id = (
    SELECT payer_id FROM impayes WHERE id = ?
)
AND statut IN ('brouillon', 'planifiee');

-- 3. Créer un événement
INSERT INTO events (id, type, titre, description, entity_type, entity_id, created_at)
VALUES (?, 'suspension', 'Facture suspendue', ?, 'impaye', ?, CURRENT_TIMESTAMP);

-- Transaction commit
```

---

## 12. Réactivation d'un impayé

**Description** : Réactive les relances pour un impayé suspendu

- **Méthode HTTP** : `POST`
- **Endpoint** : `/api/impayes/{id}/unsuspend`

### Paramètres d'entrée

| Nom | Type | Obligatoire | Description |
|-----|------|-------------|-------------|
| id | string | Oui | ID de l'impayé |

### Réponse JSON (200 OK)

```json
{
  "success": true,
  "data": {
    "id": "uuid-impaye",
    "statut": "impaye",
    "is_blacklisted": 0,
    "blacklist_motif": null,
    "blacklist_date": null
  }
}
```

### Requête SQL

```sql
-- Transaction begin

-- 1. Mettre à jour l'impayé
UPDATE impayes 
SET statut = 'impaye',
    is_blacklisted = 0,
    blacklist_motif = NULL,
    blacklist_date = NULL,
    updated_at = CURRENT_TIMESTAMP
WHERE id = ?;

-- 2. Recréer les relances selon la séquence active
INSERT INTO relances (id, contact_id, sequence_id, statut, sujet, corps, date_programmation, created_at, updated_at)
SELECT 
    lower(hex(randomblob(16))),
    i.payer_id,
    i.sequence_id,
    'planifiee',
    se.objet,
    se.corps,
    datetime('now', '+' || se.delai || ' days'),
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM impayes i
JOIN sequences_emails se ON se.sequence_id = i.sequence_id
WHERE i.id = ?
AND se.email_index > i.email_index;

-- 3. Créer un événement
INSERT INTO events (id, type, titre, description, entity_type, entity_id, created_at)
VALUES (?, 'systeme', 'Facture réactivée', 'Les relances sont à nouveau actives', 'impaye', ?, CURRENT_TIMESTAMP);

-- Transaction commit
```

---

## 13. Blacklist d'un contact

**Description** : Blackliste définitivement un contact (et toutes ses factures)

- **Méthode HTTP** : `POST`
- **Endpoint** : `/api/contacts/{id}/blacklist`

### Paramètres d'entrée

| Nom | Type | Obligatoire | Description |
|-----|------|-------------|-------------|
| id | string | Oui | ID du contact |
| motif | string | Oui | Motif du blacklist |

### Body JSON

```json
{
  "motif": "Blacklist manuel - Client injoignable"
}
```

### Réponse JSON (200 OK)

```json
{
  "success": true,
  "data": {
    "contact": {
      "id": "uuid-contact",
      "is_blacklisted": 1,
      "blacklist_motif": "Blacklist manuel - Client injoignable",
      "blacklist_date": "2024-03-20T14:30:00Z"
    },
    "action": "blacklisté",
    "relances_annulees": 3
  }
}
```

### Requête SQL

```sql
-- Transaction begin

-- 1. Mettre à jour le contact
UPDATE contacts 
SET is_blacklisted = 1,
    blacklist_motif = ?,
    blacklist_date = CURRENT_TIMESTAMP,
    updated_at = CURRENT_TIMESTAMP
WHERE id = ?;

-- 2. Mettre à jour tous les impayés du contact
UPDATE impayes 
SET is_blacklisted = 1,
    statut = 'suspendue',
    updated_at = CURRENT_TIMESTAMP
WHERE payer_id = ?;

-- 3. Compter et annuler les relances
UPDATE relances 
SET statut = 'annulee',
    updated_at = CURRENT_TIMESTAMP
WHERE contact_id = ?
AND statut IN ('brouillon', 'planifiee');

-- 4. Créer un événement
INSERT INTO events (id, type, titre, description, entity_type, entity_id, who_id, created_at)
VALUES (?, 'systeme', 'Contact blacklisted', ?, 'contact', ?, ?, CURRENT_TIMESTAMP);

-- Transaction commit
```

---

## 14. Génération de token pour accès PDF

**Description** : Génère un token sécurisé pour l'affichage du PDF facture

- **Méthode HTTP** : `POST`
- **Endpoint** : `/api/tokens/pdf`

### Paramètres d'entrée

| Nom | Type | Obligatoire | Description |
|-----|------|-------------|-------------|
| impaye_id | string | Oui | ID de l'impayé |

### Body JSON

```json
{
  "impaye_id": "uuid-impaye"
}
```

### Réponse JSON (200 OK)

```json
{
  "success": true,
  "data": {
    "pdfUrl": "https://api.marki.fr/api/pdf/uuid-token-123",
    "token": "uuid-token-123",
    "expires_at": "2024-03-20T15:30:00Z"
  }
}
```

### Requête SQL

```sql
-- 1. Vérifier que l'impayé existe et récupérer l'URL PDF
SELECT url_pdf FROM impayes WHERE id = ?;

-- 2. Créer un token temporaire
INSERT INTO pdf_tokens (id, impaye_id, token, expires_at, created_at)
VALUES (?, ?, ?, datetime('now', '+1 hour'), CURRENT_TIMESTAMP);

-- 3. Mettre à jour l'impayé avec le token
UPDATE impayes 
SET url_pdf_token = ?,
    url_pdf_token_expires = datetime('now', '+1 hour')
WHERE id = ?;
```

---

## 15. Récupération des missions d'un impayé

**Description** : Récupère la liste des missions synchronisées depuis ADTI pour un impayé

- **Méthode HTTP** : `GET`
- **Endpoint** : `/api/impayes/{id}/missions`

### Paramètres d'entrée

| Nom | Type | Obligatoire | Description |
|-----|------|-------------|-------------|
| id | string | Oui | ID de l'impayé |

### Réponse JSON (200 OK)

```json
{
  "success": true,
  "data": {
    "missions": [
      {
        "id": "mission_uuid",
        "type_mission": "vente",
        "libelle": "Diagnostic amiante",
        "date_intervention": "2024-01-10",
        "description": "Diagnostic réglementaire avant travaux",
        "statut": "realisee"
      },
      {
        "id": "mission_uuid_2",
        "type_mission": "reperage amiante",
        "libelle": "DPE",
        "date_intervention": "2024-01-12",
        "description": "Diagnostic de performance énergétique",
        "statut": "planifiee"
      }
    ],
    "lastSyncDate": "2024-03-20T14:30:00Z"
  }
}
```

### Requête SQL

```sql
SELECT 
    id,
    type_mission,
    libelle,
    date_intervention,
    description,
    statut,
    updated_at as last_sync_date
FROM missions
WHERE impaye_id = ?
  AND statut != 'obsolete'
ORDER BY date_intervention DESC;
```

---

## 16. Synchronisation des missions depuis ADTI

**Description** : Déclenche la synchronisation des missions depuis la base ADTI

- **Méthode HTTP** : `POST`
- **Endpoint** : `/api/impayes/{id}/sync-missions`

### Paramètres d'entrée

| Nom | Type | Obligatoire | Description |
|-----|------|-------------|-------------|
| id | string | Oui | ID de l'impayé (path param) |
| numero_dossier | string | Oui | Numéro du dossier à synchroniser |

### Body JSON

```json
{
  "numero_dossier": "D-2024-045"
}
```

### Réponse JSON (200 OK)

```json
{
  "success": true,
  "data": {
    "missionsSynced": 3,
    "missions": [
      {
        "id": "mission_uuid",
        "typeMission": "vente",
        "type": "Diagnostic amiante",
        "dateIntervention": "2024-01-10",
        "description": "Diagnostic réglementaire avant travaux",
        "statut": "realisee"
      }
    ]
  }
}
```

### Requête SQL

```sql
-- Voir workflow backend sync-missions-adti.md pour le process complet
```

---

## 17. Mise à jour du schéma - Table missions

**Description** : Création de la table missions dans marki.db

```sql
CREATE TABLE IF NOT EXISTS missions (
    id TEXT PRIMARY KEY,
    impaye_id TEXT NOT NULL REFERENCES impayes(id) ON DELETE CASCADE,
    numero_dossier TEXT NOT NULL,
    type_mission TEXT NOT NULL,
    libelle TEXT NOT NULL,
    date_intervention TEXT,
    description TEXT,
    statut TEXT DEFAULT 'planifiee',
    source TEXT DEFAULT 'ADTI',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_missions_impaye_id ON missions(impaye_id);
CREATE INDEX IF NOT EXISTS idx_missions_dossier ON missions(numero_dossier);
```

---

## Tableaux récapitulatifs

### Routes par catégorie

| Catégorie | Routes | Méthodes |
|-----------|--------|----------|
| **Lecture données** | /api/impayes/{id} | GET |
| | /api/impayes/{id}/notes | GET |
| | /api/impayes/{id}/missions | GET |
| | /api/contacts/{id}/notes | GET |
| | /api/events/by-entity | GET |
| | /api/relances | GET |
| | /api/impayes/sequences | GET |
| **Écriture notes** | /api/impayes/{id}/notes | POST, DELETE |
| | /api/contacts/{id}/notes | POST, DELETE |
| **Actions impayé** | /api/impayes/{id}/change-sequence | POST |
| | /api/impayes/{id}/suspend | POST |
| | /api/impayes/{id}/unsuspend | POST |
| | /api/impayes/{id}/sync-missions | POST |
| **Actions contact** | /api/contacts/{id}/blacklist | POST |
| **Fichiers** | /api/tokens/pdf | POST |

### Codes HTTP utilisés

| Code | Signification | Utilisation |
|------|---------------|-------------|
| 200 | OK | Requête réussie (GET, DELETE) |
| 201 | Created | Ressource créée (POST) |
| 400 | Bad Request | Données invalides |
| 401 | Unauthorized | Token manquant ou expiré |
| 404 | Not Found | Ressource non trouvée |
| 500 | Internal Server Error | Erreur serveur |

### Tables impactées

| Route | Tables principales | Tables liées |
|-------|-------------------|--------------|
| GET /api/impayes/{id} | impayes | contacts, sequences |
| GET /api/impayes/{id}/notes | impaye_notes | - |
| POST /api/impayes/{id}/notes | impaye_notes | events |
| GET /api/impayes/{id}/missions | missions | - |
| POST /api/impayes/{id}/sync-missions | missions | events |
| GET /api/contacts/{id}/notes | contact_notes | - |
| GET /api/events/by-entity | events | event_emails |
| GET /api/relances | relances | sequences, contacts |
| POST /api/impayes/{id}/change-sequence | impayes | relances, events |
| POST /api/impayes/{id}/suspend | impayes | relances, events |
| POST /api/impayes/{id}/unsuspend | impayes | relances, events |
| POST /api/contacts/{id}/blacklist | contacts | impayes, relances, events |
| POST /api/tokens/pdf | pdf_tokens | impayes |
