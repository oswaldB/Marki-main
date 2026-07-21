# Routes API REST - Écran Contacts

Ce document définit les routes API REST nécessaires pour l'écran contacts de l'application Marki Relance.

---

## 1. Liste et Recherche de Contacts

### GET /api/contacts

**Description** : Récupère la liste des contacts avec filtres de recherche, pagination et tri. Retourne les contacts structurés avec leurs relations (entreprises avec personnes associées, personnes liées par tutelle).

**Paramètres d'entrée (Query)** :
| Paramètre | Type | Description | Défaut |
|-----------|------|-------------|--------|
| `search` | string | Recherche textuelle sur nom, prénom, email, entreprise | - |
| `type` | string | Filtre par type: 'M' (entreprise), 'P' (personne) | - |
| `limit` | integer | Nombre maximum de résultats | 1000 |
| `offset` | integer | Offset pour pagination | 0 |
| `sortBy` | string | Champ de tri: 'nom', 'impayes', 'dateImpaye' | 'nom' |
| `sortDirection` | string | Direction: 'asc', 'desc' | 'asc' |
| `includeBlacklisted` | boolean | Inclure les contacts blacklistés | true |

**Réponse JSON (200)** :
```json
{
  "contacts": [
    {
      "id": "M1",
      "nomComplet": "ACME Corporation",
      "typePersonne": "M",
      "email": "contact@acme.fr",
      "telephone": "01 23 45 67 89",
      "impayesCount": 3,
      "emailForce": null,
      "statut": "actif",
      "isBlacklisted": 0,
      "expanded": true,
      "personnes": [
        {
          "id": "P1",
          "nomComplet": "Jean Dupont",
          "typePersonne": "P",
          "entrepriseId": "M1",
          "societesLiees": "ACME Corporation",
          "email": "jean.dupont@acme.fr",
          "fonction": "Directeur Financier",
          "initials": "JD",
          "impayesCount": 2,
          "statut": "actif",
          "isBlacklisted": 0
        }
      ]
    },
    {
      "id": "P4",
      "nomComplet": "Sophie Bernard",
      "typePersonne": "P",
      "email": "",
      "telephone": "06 23 45 67 89",
      "fonction": "Freelance",
      "initials": "SB",
      "impayesCount": 1,
      "emailForce": null,
      "statut": "actif",
      "isBlacklisted": 0,
      "contactLie": null,
      "relationPersonne": null,
      "typeRelation": null
    },
    {
      "id": "P10",
      "nomComplet": "Marie Lefebvre",
      "typePersonne": "P",
      "email": "marie.lefebvre@email.com",
      "telephone": "06 98 76 54 32",
      "fonction": "Majeur protégé",
      "initials": "ML",
      "impayesCount": 1,
      "emailForce": null,
      "statut": "actif",
      "isBlacklisted": 0,
      "relationPersonne": "Lucas Petit",
      "typeRelation": "tutelle",
      "descriptionRelation": "Sous tutelle de",
      "contactLie": {
        "id": "P5",
        "nomComplet": "Lucas Petit",
        "initials": "LP",
        "impayesCount": 3,
        "emailForce": null,
        "isBlacklisted": 0
      }
    }
  ],
  "total": 156,
  "limit": 1000,
  "offset": 0
}
```

**Requêtes SQL** :

```sql
-- 1. Récupération des contacts avec comptage des impayés
SELECT 
    c.id,
    CASE 
        WHEN c.type_personne = 'M' THEN c.nom 
        ELSE COALESCE(c.prenom || ' ' || c.nom, c.nom) 
    END as nom_complet,
    c.type_personne as type_personne,
    c.email,
    c.telephone,
    c.email_force,
    c.statut,
    c.is_blacklisted,
    c.civilite,
    c.activite_societe as fonction,
    CASE 
        WHEN c.type_personne = 'P' THEN UPPER(SUBSTR(c.prenom, 1, 1) || SUBSTR(c.nom, 1, 1))
        ELSE NULL 
    END as initials,
    COUNT(DISTINCT i.id) as impayes_count,
    MAX(i.date_echeance) as date_dernier_impaye
FROM contacts c
LEFT JOIN impayes i ON i.payer_id = c.id AND i.statut = 'impaye' AND i.facture_soldee = 0
WHERE 1=1
    AND (:search IS NULL OR (
        LOWER(c.nom) LIKE '%' || LOWER(:search) || '%' OR
        LOWER(c.prenom) LIKE '%' || LOWER(:search) || '%' OR
        LOWER(c.email) LIKE '%' || LOWER(:search) || '%' OR
        LOWER(c.activite_societe) LIKE '%' || LOWER(:search) || '%'
    ))
    AND (:type IS NULL OR c.type_personne = :type)
    AND (:includeBlacklisted = 1 OR c.is_blacklisted = 0)
GROUP BY c.id
ORDER BY 
    CASE WHEN :sortBy = 'nom' AND :sortDirection = 'asc' THEN LOWER(nom_complet) END ASC,
    CASE WHEN :sortBy = 'nom' AND :sortDirection = 'desc' THEN LOWER(nom_complet) END DESC,
    CASE WHEN :sortBy = 'impayes' AND :sortDirection = 'asc' THEN impayes_count END ASC,
    CASE WHEN :sortBy = 'impayes' AND :sortDirection = 'desc' THEN impayes_count END DESC,
    CASE WHEN :sortBy = 'dateImpaye' AND :sortDirection = 'asc' THEN date_dernier_impaye END ASC,
    CASE WHEN :sortBy = 'dateImpaye' AND :sortDirection = 'desc' THEN date_dernier_impaye END DESC
LIMIT :limit OFFSET :offset;

-- 2. Récupération des personnes associées aux entreprises (pour les entreprises du résultat)
SELECT 
    c.id,
    COALESCE(c.prenom || ' ' || c.nom, c.nom) as nom_complet,
    c.type_personne,
    c.email,
    c.email_force,
    c.activite_societe as fonction,
    UPPER(SUBSTR(c.prenom, 1, 1) || SUBSTR(c.nom, 1, 1)) as initials,
    c.statut,
    c.is_blacklisted,
    cr.contact_source_id as entreprise_id,
    cs.nom as entreprise_nom,
    COUNT(DISTINCT i.id) as impayes_count
FROM contacts c
INNER JOIN contact_relations cr ON cr.contact_cible_id = c.id AND cr.est_actif = 1
INNER JOIN contacts cs ON cs.id = cr.contact_source_id
LEFT JOIN impayes i ON i.payer_id = c.id AND i.statut = 'impaye' AND i.facture_soldee = 0
WHERE cr.contact_source_id IN (:entreprise_ids)
    AND c.type_personne = 'P'
GROUP BY c.id;

-- 3. Récupération des relations de tutelle/familiales entre personnes
SELECT 
    c.id as contact_id,
    cr.contact_cible_id as contact_lie_id,
    cr.type_relation,
    crt.nom as description_relation,
    cl.nom as contact_lie_nom,
    cl.prenom as contact_lie_prenom,
    UPPER(SUBSTR(cl.prenom, 1, 1) || SUBSTR(cl.nom, 1, 1)) as contact_lie_initials,
    cl.email_force as contact_lie_email_force,
    cl.is_blacklisted as contact_lie_is_blacklisted,
    COUNT(DISTINCT i.id) as contact_lie_impayes_count
FROM contacts c
INNER JOIN contact_relations cr ON cr.contact_source_id = c.id AND cr.est_actif = 1
INNER JOIN contact_relation_types crt ON crt.code = cr.type_relation
INNER JOIN contacts cl ON cl.id = cr.contact_cible_id
LEFT JOIN impayes i ON i.payer_id = cl.id AND i.statut = 'impaye' AND i.facture_soldee = 0
WHERE c.id IN (:personne_ids)
    AND crt.categorie = 'familial'
GROUP BY c.id, cr.contact_cible_id;
```

---

## 2. Statistiques des Contacts

### GET /api/contacts/stats

**Description** : Récupère les statistiques agrégées des contacts pour l'écran de dashboard.

**Paramètres d'entrée** : Aucun

**Réponse JSON (200)** :
```json
{
  "total": 156,
  "entreprises": 42,
  "personnes": 114,
  "avecImpayes": 38,
  "blacklist": 12,
  "sansEmail": 8
}
```

**Requête SQL** :

```sql
SELECT 
    COUNT(*) as total,
    COUNT(CASE WHEN type_personne = 'M' THEN 1 END) as entreprises,
    COUNT(CASE WHEN type_personne = 'P' THEN 1 END) as personnes,
    COUNT(DISTINCT CASE WHEN i.id IS NOT NULL THEN c.id END) as avec_impayes,
    COUNT(CASE WHEN c.is_blacklisted = 1 THEN 1 END) as blacklist,
    COUNT(CASE WHEN c.email IS NULL OR c.email = '' THEN 1 END) as sans_email
FROM contacts c
LEFT JOIN impayes i ON i.payer_id = c.id 
    AND i.statut = 'impaye' 
    AND i.facture_soldee = 0
WHERE c.statut IS NULL OR c.statut != 'archive';
```

---

## 3. Mise à jour d'un Contact (Email Forcé)

### PUT /api/contacts/:id

**Description** : Met à jour les informations d'un contact. Utilisé principalement pour définir/supprimer l'email forcé.

**Paramètres d'entrée (URL)** :
| Paramètre | Type | Description |
|-----------|------|-------------|
| `id` | string | ID du contact |

**Paramètres d'entrée (Body JSON)** :
```json
{
  "email_force": "finance@entreprise.fr"
}
```

Pour supprimer l'email forcé, envoyer `null` :
```json
{
  "email_force": null
}
```

**Réponse JSON (200)** :
```json
{
  "success": true,
  "contact": {
    "id": "M2",
    "nomComplet": "TechStart SARL",
    "typePersonne": "M",
    "email": "info@techstart.fr",
    "emailForce": "finance@techstart.fr",
    "telephone": "01 98 76 54 32",
    "statut": "actif",
    "isBlacklisted": 0,
    "updated_at": "2025-01-15T14:30:00Z"
  }
}
```

**Réponse JSON (404)** - Contact non trouvé :
```json
{
  "error": "Contact not found",
  "id": "M999"
}
```

**Requêtes SQL** :

```sql
-- Mise à jour de l'email forcé
UPDATE contacts 
SET 
    email_force = :email_force,
    updated_at = CURRENT_TIMESTAMP
WHERE id = :id;

-- Vérification et récupération du contact mis à jour
SELECT 
    c.id,
    CASE 
        WHEN c.type_personne = 'M' THEN c.nom 
        ELSE COALESCE(c.prenom || ' ' || c.nom, c.nom) 
    END as nom_complet,
    c.type_personne,
    c.email,
    c.email_force,
    c.telephone,
    c.statut,
    c.is_blacklisted,
    c.updated_at
FROM contacts c
WHERE c.id = :id;
```

---

## 4. Blacklist / Unblacklist d'un Contact

### POST /api/contacts/:id/blacklist

**Description** : Bascule le statut de blacklist d'un contact. Si le contact est déjà blacklisté, il est retiré de la blacklist. Sinon, il est ajouté à la blacklist.

**Paramètres d'entrée (URL)** :
| Paramètre | Type | Description |
|-----------|------|-------------|
| `id` | string | ID du contact |

**Paramètres d'entrée (Body JSON)** :
```json
{
  "motif": "Blacklist depuis interface contacts"
}
```

Pour retirer de la blacklist, envoyer `null` comme motif :
```json
{
  "motif": null
}
```

**Réponse JSON (200)** - Blacklist :
```json
{
  "success": true,
  "action": "blacklisted",
  "contact": {
    "id": "M3",
    "nomComplet": "Global Industries SA",
    "typePersonne": "M",
    "email": "contact@global-ind.com",
    "statut": "blacklist",
    "is_blacklisted": 1,
    "blacklist_date": "2025-01-15T14:30:00Z",
    "blacklist_motif": "Blacklist depuis interface contacts"
  },
  "relances_annulees": 3
}
```

**Réponse JSON (200)** - Unblacklist :
```json
{
  "success": true,
  "action": "unblacklisted",
  "contact": {
    "id": "M3",
    "nomComplet": "Global Industries SA",
    "typePersonne": "M",
    "email": "contact@global-ind.com",
    "statut": "actif",
    "is_blacklisted": 0,
    "blacklist_date": null,
    "blacklist_motif": null
  },
  "relances_annulees": 0
}
```

**Réponse JSON (404)** - Contact non trouvé :
```json
{
  "error": "Contact not found",
  "id": "M999"
}
```

**Requêtes SQL** :

```sql
-- 1. Vérifier le statut actuel du contact
SELECT 
    id, 
    is_blacklisted, 
    statut 
FROM contacts 
WHERE id = :id;

-- 2a. Si blacklistage (is_blacklisted = 0 ou NULL)
UPDATE contacts 
SET 
    is_blacklisted = 1,
    statut = 'blacklist',
    blacklist_date = CURRENT_TIMESTAMP,
    blacklist_motif = :motif,
    updated_at = CURRENT_TIMESTAMP
WHERE id = :id;

-- 2b. Si unblacklistage (is_blacklisted = 1)
UPDATE contacts 
SET 
    is_blacklisted = 0,
    statut = 'actif',
    blacklist_date = NULL,
    blacklist_motif = NULL,
    updated_at = CURRENT_TIMESTAMP
WHERE id = :id;

-- 3. Annuler les relances en cours pour ce contact lors du blacklistage
UPDATE relances 
SET 
    statut = 'annulee',
    updated_at = CURRENT_TIMESTAMP
WHERE contact_id = :id 
    AND statut IN ('brouillon', 'programmee', 'en_cours');

-- 4. Compter les relances annulées (retour API)
SELECT COUNT(*) as relances_annulees 
FROM relances 
WHERE contact_id = :id 
    AND statut = 'annulee';

-- 5. Récupérer le contact mis à jour
SELECT 
    c.id,
    CASE 
        WHEN c.type_personne = 'M' THEN c.nom 
        ELSE COALESCE(c.prenom || ' ' || c.nom, c.nom) 
    END as nom_complet,
    c.type_personne,
    c.email,
    c.statut,
    c.is_blacklisted,
    c.blacklist_date,
    c.blacklist_motif
FROM contacts c
WHERE c.id = :id;
```

---

## 5. Export des Contacts

### GET /api/contacts/export

**Description** : Exporte les contacts au format CSV ou Excel avec toutes leurs informations.

**Paramètres d'entrée (Query)** :
| Paramètre | Type | Description | Défaut |
|-----------|------|-------------|--------|
| `format` | string | Format d'export: 'csv', 'xlsx' | 'csv' |
| `search` | string | Filtre de recherche | - |
| `type` | string | Filtre par type | - |

**Réponse (200)** : Fichier binaire avec headers
```
Content-Type: text/csv ou application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename="contacts_2025-01-15.csv"
```

**Requête SQL** :

```sql
-- Récupération des données complètes pour export
SELECT 
    c.id,
    c.type_personne as type,
    c.civilite,
    c.nom,
    c.prenom,
    c.email,
    c.email_force as email_forcé,
    c.telephone,
    c.activite_societe as fonction,
    c.adresse_rue,
    c.adresse_code_postal,
    c.adresse_ville,
    c.statut,
    CASE WHEN c.is_blacklisted = 1 THEN 'Oui' ELSE 'Non' END as blacklisté,
    c.blacklist_date as date_blacklist,
    c.blacklist_motif as motif_blacklist,
    COUNT(DISTINCT i.id) as nb_impayes,
    COALESCE(SUM(i.reste_a_payer), 0) as montant_impayes,
    c.created_at as date_creation,
    c.updated_at as date_maj
FROM contacts c
LEFT JOIN impayes i ON i.payer_id = c.id AND i.statut = 'impaye' AND i.facture_soldee = 0
WHERE (:search IS NULL OR (
    LOWER(c.nom) LIKE '%' || LOWER(:search) || '%' OR
    LOWER(c.prenom) LIKE '%' || LOWER(:search) || '%' OR
    LOWER(c.email) LIKE '%' || LOWER(:search) || '%'
))
AND (:type IS NULL OR c.type_personne = :type)
GROUP BY c.id
ORDER BY c.type_personne DESC, LOWER(c.nom);
```

---

## 6. Détails d'un Contact

### GET /api/contacts/:id

**Description** : Récupère les détails complets d'un contact spécifique avec ses relations et historique.

**Paramètres d'entrée (URL)** :
| Paramètre | Type | Description |
|-----------|------|-------------|
| `id` | string | ID du contact |

**Réponse JSON (200)** :
```json
{
  "contact": {
    "id": "M1",
    "nomComplet": "ACME Corporation",
    "typePersonne": "M",
    "email": "contact@acme.fr",
    "emailForce": null,
    "telephone": "01 23 45 67 89",
    "statut": "actif",
    "isBlacklisted": 0,
    "adresse": {
      "rue": "123 Avenue des Champs-Élysées",
      "codePostal": "75008",
      "ville": "Paris",
      "pays": "France"
    },
    "notes": "Client depuis 2020",
    "impayesCount": 3,
    "montantImpayes": 12500.00,
    "personnes": [
      {
        "id": "P1",
        "nomComplet": "Jean Dupont",
        "email": "jean.dupont@acme.fr",
        "fonction": "Directeur Financier",
        "impayesCount": 2
      }
    ],
    "createdAt": "2020-03-15T10:30:00Z",
    "updatedAt": "2025-01-10T14:20:00Z"
  }
}
```

**Requêtes SQL** :

```sql
-- 1. Détails du contact
SELECT 
    c.*,
    CASE 
        WHEN c.type_personne = 'M' THEN c.nom 
        ELSE COALESCE(c.prenom || ' ' || c.nom, c.nom) 
    END as nom_complet,
    COUNT(DISTINCT i.id) as impayes_count,
    COALESCE(SUM(i.reste_a_payer), 0) as montant_impayes
FROM contacts c
LEFT JOIN impayes i ON i.payer_id = c.id AND i.statut = 'impaye' AND i.facture_soldee = 0
WHERE c.id = :id
GROUP BY c.id;

-- 2. Personnes associées (si entreprise)
SELECT 
    c.id,
    COALESCE(c.prenom || ' ' || c.nom, c.nom) as nom_complet,
    c.email,
    c.activite_societe as fonction,
    COUNT(DISTINCT i.id) as impayes_count
FROM contacts c
INNER JOIN contact_relations cr ON cr.contact_cible_id = c.id AND cr.est_actif = 1
LEFT JOIN impayes i ON i.payer_id = c.id AND i.statut = 'impaye' AND i.facture_soldee = 0
WHERE cr.contact_source_id = :id
GROUP BY c.id;

-- 3. Contact lié (relations familiales/tutelle)
SELECT 
    c.id,
    COALESCE(c.prenom || ' ' || c.nom, c.nom) as nom_complet,
    c.email,
    cr.type_relation,
    crt.nom as description_relation
FROM contacts c
INNER JOIN contact_relations cr ON cr.contact_cible_id = c.id AND cr.est_actif = 1
INNER JOIN contact_relation_types crt ON crt.code = cr.type_relation
WHERE cr.contact_source_id = :id
    AND crt.categorie = 'familial';
```

---

## Tableaux Récapitulatifs

### Routes API

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/api/contacts` | Liste/recherche des contacts |
| `GET` | `/api/contacts/stats` | Statistiques agrégées |
| `GET` | `/api/contacts/export` | Export CSV/Excel |
| `GET` | `/api/contacts/:id` | Détail d'un contact |
| `PUT` | `/api/contacts/:id` | Mise à jour (email forcé) |
| `POST` | `/api/contacts/:id/blacklist` | Toggle blacklist |

### Tables Utilisées

| Table | Description |
|-------|-------------|
| `contacts` | Données des contacts (clients, prospects) |
| `impayes` | Factures impayées liées aux contacts |
| `contact_relations` | Relations entre contacts (entreprise↔personne, tutelle) |
| `contact_relation_types` | Types de relations (tutelle, employé, etc.) |
| `relances` | Historique des relances envoyées |

### Champs Clés du Contact

| Champ | Description |
|-------|-------------|
| `id` | Identifiant unique |
| `type_personne` | 'M' (morale/entreprise) ou 'P' (physique/personne) |
| `nom` / `prenom` | Nom de famille et prénom |
| `email` | Email principal |
| `email_force` | Email forcé pour les relances |
| `is_blacklisted` | 1 = blacklisté, 0 = actif |
| `statut` | 'actif', 'blacklist', 'archive' |
| `telephone` | Numéro de téléphone |
