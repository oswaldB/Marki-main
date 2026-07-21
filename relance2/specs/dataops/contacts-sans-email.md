# Routes API - Écran Contacts sans email

Ce document définit les routes API REST nécessaires pour l'écran **Contacts sans email**.

---

## Route 1: Liste des contacts sans email

**Titre :** Récupérer la liste des contacts sans email

**Description :** Retourne tous les contacts n'ayant pas d'email défini (champ `email` NULL ou vide), avec leur nombre d'impayés associés. Supporte la pagination et la recherche textuelle.

**Endpoint :** `GET /api/contacts`

**Paramètres d'entrée :**

| Paramètre | Type | Requis | Description |
|-----------|------|--------|-------------|
| email | string | Oui | Valeur fixe `none` pour filtrer les contacts sans email |
| search | string | Non | Recherche textuelle sur nom, prénom, entreprise |
| limit | integer | Non | Nombre maximum de résultats (défaut: 1000) |

**Réponse JSON (200 OK) :**

```json
{
  "contacts": [
    {
      "id": "uuid-contact-1",
      "nomComplet": "Sophie Bernard",
      "typePersonne": "P",
      "email": null,
      "telephone": "06 12 34 56 78",
      "emailForce": null,
      "statut": "actif",
      "isBlacklisted": 0,
      "type": "Client",
      "impayesCount": 3,
      "initials": "SB",
      "personnes": [],
      "contactLie": null,
      "entrepriseId": null,
      "societesLiees": [],
      "relationPersonne": null,
      "typeRelation": null
    }
  ]
}
```

**Requête SQL exacte :**

```sql
SELECT 
    c.id,
    COALESCE(c.nom || ' ' || c.prenom, c.nom) as nomComplet,
    c.type_personne as typePersonne,
    c.email,
    c.telephone,
    c.email_force as emailForce,
    c.statut,
    c.is_blacklisted as isBlacklisted,
    c.type,
    (SELECT COUNT(*) FROM impayes i WHERE i.proprietaire_id = c.id AND i.statut = 'impaye') as impayesCount
FROM contacts c
WHERE (c.email IS NULL OR c.email = '') 
  AND (c.is_blacklisted = 0 OR c.statut != 'blacklist')
  AND (
      c.nom LIKE ? 
      OR c.prenom LIKE ? 
      OR c.type LIKE ?
  )
ORDER BY c.nom ASC, c.prenom ASC 
LIMIT ?;
```

---

## Route 2: Définir un email forcé

**Titre :** Mettre à jour l'email forcé d'un contact

**Description :** Définit ou met à jour le champ `email_force` pour un contact spécifique. Cet email sera utilisé pour les relances même si le contact n'a pas d'email principal.

**Endpoint :** `PATCH /api/contacts/{contact_id}/email-force`

**Paramètres d'entrée :**

| Paramètre | Type | Requis | Description |
|-----------|------|--------|-------------|
| contact_id | path | Oui | UUID du contact |
| email_force | body | Oui | Email forcé à définir (peut être null pour supprimer) |

**Body JSON :**

```json
{
  "email_force": "finance@entreprise.fr"
}
```

**Réponse JSON (200 OK) :**

```json
{
  "success": true,
  "email_force": "finance@entreprise.fr"
}
```

**Réponse JSON (400 Bad Request) :**

```json
{
  "error": "Invalid email format"
}
```

**Requête SQL exacte :**

```sql
UPDATE contacts 
SET email_force = ?,
    updated_at = CURRENT_TIMESTAMP
WHERE id = ?;
```

---

## Route 3: Recherche de contacts (pour modal email forcé)

**Titre :** Rechercher des contacts avec email pour copie

**Description :** Recherche des contacts ayant un email défini (pour permettre de copier leur email dans le champ email_force). Exclut les contacts sans email et la blacklist.

**Endpoint :** `GET /api/contacts`

**Paramètres d'entrée :**

| Paramètre | Type | Requis | Description |
|-----------|------|--------|-------------|
| search | string | Oui | Terme de recherche (min. 2 caractères) |
| limit | integer | Non | Nombre maximum de résultats (défaut: 20) |

**Réponse JSON (200 OK) :**

```json
{
  "contacts": [
    {
      "id": "uuid-contact-2",
      "nomComplet": "Marie Dupont",
      "typePersonne": "P",
      "email": "marie.dupont@email.com",
      "emailForce": null,
      "initials": "MD",
      "telephone": "01 23 45 67 89"
    }
  ]
}
```

**Requête SQL exacte :**

```sql
SELECT 
    c.id,
    COALESCE(c.nom || ' ' || c.prenom, c.nom) as nomComplet,
    c.type_personne as typePersonne,
    c.email,
    c.email_force as emailForce,
    c.telephone
FROM contacts c
WHERE (c.email IS NOT NULL AND c.email != '') 
  AND (c.is_blacklisted = 0 OR c.statut != 'blacklist')
  AND (
      c.nom LIKE ? 
      OR c.prenom LIKE ? 
      OR c.email LIKE ?
  )
ORDER BY c.nom ASC, c.prenom ASC 
LIMIT ?;
```

---

## Route 4: Récupérer les détails d'un contact

**Titre :** Afficher les détails complets d'un contact

**Description :** Récupère toutes les informations d'un contact spécifique, y compris ses relations et son historique.

**Endpoint :** `GET /api/contacts/{contact_id}`

**Paramètres d'entrée :**

| Paramètre | Type | Requis | Description |
|-----------|------|--------|-------------|
| contact_id | path | Oui | UUID du contact |

**Réponse JSON (200 OK) :**

```json
{
  "id": "uuid-contact-1",
  "nom": "Bernard",
  "prenom": "Sophie",
  "nomComplet": "Sophie Bernard",
  "email": null,
  "telephone": "06 12 34 56 78",
  "emailForce": null,
  "type": "Client",
  "typePersonne": "P",
  "statut": "actif",
  "isBlacklisted": 0,
  "civilite": "Mme",
  "adresseRue": "12 rue de Paris",
  "adresseVille": "Lyon",
  "adresseCodePostal": "69001",
  "notes": null,
  "impayesCount": 3,
  "relations": [],
  "createdAt": "2024-01-15T10:30:00",
  "updatedAt": "2024-06-20T14:22:00"
}
```

**Requête SQL exacte :**

```sql
SELECT 
    c.id,
    c.nom,
    c.prenom,
    COALESCE(c.nom || ' ' || c.prenom, c.nom) as nomComplet,
    c.email,
    c.telephone,
    c.email_force as emailForce,
    c.type,
    c.type_personne as typePersonne,
    c.statut,
    c.is_blacklisted as isBlacklisted,
    c.civilite,
    c.adresse_rue as adresseRue,
    c.adresse_ville as adresseVille,
    c.adresse_code_postal as adresseCodePostal,
    c.notes,
    c.created_at as createdAt,
    c.updated_at as updatedAt,
    (SELECT COUNT(*) FROM impayes i WHERE i.proprietaire_id = c.id AND i.statut = 'impaye') as impayesCount
FROM contacts c
WHERE c.id = ?;
```

---

## Route 5: Statistiques des contacts sans email

**Titre :** Obtenir le nombre de contacts sans email

**Description :** Retourne le nombre total de contacts n'ayant pas d'email défini. Utilisé pour l'affichage du badge dans la sidebar.

**Endpoint :** `GET /api/contacts/stats`

**Paramètres d'entrée :** Aucun

**Réponse JSON (200 OK) :**

```json
{
  "total": 150,
  "entreprises": 45,
  "personnes": 105,
  "avecImpayes": 23,
  "blacklist": 3,
  "sansEmail": 5
}
```

**Requête SQL exacte (pour le champ sansEmail) :**

```sql
SELECT COUNT(*) as sansEmail
FROM contacts 
WHERE (email IS NULL OR email = '') 
  AND (is_blacklisted = 0 OR statut != 'blacklist');
```

---

## Tableau récapitulatif

| Méthode | Endpoint | Usage dans le mockup |
|---------|----------|---------------------|
| GET | `/api/contacts?email=none` | Chargement de la liste principale |
| GET | `/api/contacts?search={query}` | Recherche dans la modal email forcé |
| PATCH | `/api/contacts/{id}/email-force` | Sauvegarde de l'email forcé |
| GET | `/api/contacts/{id}` | Vue détail du contact |
| GET | `/api/contacts/stats` | Badge "Sans email" dans la sidebar |

---

## Schéma utilisé

Les routes s'appuient sur la table `contacts` avec les champs suivants :

```sql
CREATE TABLE contacts (
    id TEXT PRIMARY KEY,
    nom TEXT,
    prenom TEXT,
    email TEXT,              -- Email principal (peut être NULL)
    telephone TEXT,
    type TEXT,
    type_personne TEXT,    -- 'M' (Morale/Entreprise) ou 'P' (Physique/Personne)
    statut TEXT,
    is_blacklisted INTEGER DEFAULT 0,
    email_force TEXT,        -- Email forcé pour les relances
    -- ... autres champs
);
```

Et la table `impayes` pour le comptage :

```sql
CREATE TABLE impayes (
    id TEXT PRIMARY KEY,
    proprietaire_id TEXT REFERENCES contacts(id),
    statut TEXT DEFAULT 'impaye',
    -- ... autres champs
);
```
