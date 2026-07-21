# Routes API REST - Écran Contact Blacklist

## Vue d'ensemble

Ces routes API supportent l'écran **Contacts blacklistés** qui affiche la liste des contacts ne recevant pas de relances automatiques.

---

## Route 1: Lister les contacts blacklistés

**Méthode HTTP:** `GET`  
**Endpoint:** `/api/contacts`  
**Description:** Récupère la liste des contacts avec filtre sur les blacklistés. Supporte la recherche textuelle.

### Paramètres d'entrée (Query Parameters)

| Paramètre | Type | Obligatoire | Description |
|-----------|------|-------------|-------------|
| `is_blacklisted` | string | Oui | Valeur `'1'` ou `'true'` pour filtrer les blacklistés |
| `search` | string | Non | Recherche sur nom, prénom, email ou entreprise |
| `limit` | integer | Non | Nombre max de résultats (défaut: 1000) |

### Réponse JSON (200 OK)

```json
{
  "contacts": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "nomComplet": "Lucas Petit",
      "typePersonne": "P",
      "email": "lucas@consultingpro.fr",
      "telephone": "01 45 67 89 01",
      "emailForce": null,
      "statut": "blacklist",
      "isBlacklisted": 1,
      "type": "Consulting Pro",
      "impayesCount": 3,
      "initials": "LP",
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

### Requête SQL exacte

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
    c.blacklist_date as dateBlacklist,
    (SELECT COUNT(*) FROM impayes i WHERE i.proprietaire_id = c.id AND i.statut = 'impaye') as impayesCount
FROM contacts c
WHERE (c.is_blacklisted = ? OR c.statut = 'blacklist')
  AND (
      c.nom LIKE ? 
      OR c.prenom LIKE ? 
      OR c.email LIKE ?
      OR c.type LIKE ?
  )
ORDER BY c.nom ASC, c.prenom ASC 
LIMIT ?;
```

**Paramètres bindés:** `[1, '%search%', '%search%', '%search%', '%search%', 1000]`

---

## Route 2: Récupérer un contact blacklisté (détail)

**Méthode HTTP:** `GET`  
**Endpoint:** `/api/contacts/:id`  
**Description:** Récupère les détails complets d'un contact spécifique, y compris ses infos de blacklist.

### Paramètres d'entrée (URL Parameters)

| Paramètre | Type | Description |
|-----------|------|-------------|
| `id` | string | UUID du contact |

### Réponse JSON (200 OK)

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "nomComplet": "Lucas Petit",
  "typePersonne": "P",
  "email": "lucas@consultingpro.fr",
  "telephone": "01 45 67 89 01",
  "statut": "blacklist",
  "isBlacklisted": 1,
  "blacklistDate": "2024-01-15T10:30:00",
  "blacklistMotif": null,
  "entreprise": "Consulting Pro",
  "impayesCount": 3
}
```

### Requête SQL exacte

```sql
SELECT 
    c.id,
    COALESCE(c.nom || ' ' || c.prenom, c.nom) as nomComplet,
    c.type_personne as typePersonne,
    c.email,
    c.telephone,
    c.statut,
    c.is_blacklisted as isBlacklisted,
    c.blacklist_date as blacklistDate,
    c.blacklist_motif as blacklistMotif,
    c.type as entreprise,
    (SELECT COUNT(*) FROM impayes i 
     WHERE i.proprietaire_id = c.id 
       AND i.statut = 'impaye') as impayesCount
FROM contacts c
WHERE c.id = ?;
```

**Paramètres bindés:** `['550e8400-e29b-41d4-a716-446655440000']`

---

## Route 3: Retirer un contact de la blacklist

**Méthode HTTP:** `PUT`  
**Endpoint:** `/api/contacts/:id`  
**Description:** Met à jour un contact pour le retirer de la blacklist (is_blacklisted = 0, statut = 'actif').

### Paramètres d'entrée (URL + Body)

**URL Parameters:**
| Paramètre | Type | Description |
|-----------|------|-------------|
| `id` | string | UUID du contact |

**Body JSON:**
```json
{
  "isBlacklisted": 0,
  "statut": "actif"
}
```

### Réponse JSON (200 OK)

```json
{
  "success": true
}
```

### Requête SQL exacte

```sql
UPDATE contacts 
SET is_blacklisted = 0,
    statut = 'actif',
    blacklist_date = NULL,
    updated_at = CURRENT_TIMESTAMP
WHERE id = ?;
```

**Paramètres bindés:** `['550e8400-e29b-41d4-a716-446655440000']`

---

## Route 4: Retirer plusieurs contacts de la blacklist (Bulk)

**Méthode HTTP:** `POST`  
**Endpoint:** `/api/contacts/bulk-unblacklist`  
**Description:** Retire plusieurs contacts de la blacklist en une seule requête (action "Retirer tout").

### Paramètres d'entrée (Body JSON)

```json
{
  "contact_ids": [
    "550e8400-e29b-41d4-a716-446655440000",
    "550e8400-e29b-41d4-a716-446655440001",
    "550e8400-e29b-41d4-a716-446655440002"
  ]
}
```

| Champ | Type | Description |
|-------|------|-------------|
| `contact_ids` | array[string] | Liste des UUID des contacts à retirer |

### Réponse JSON (200 OK)

```json
{
  "success": true,
  "updated": 3,
  "errors": []
}
```

### Requête SQL exacte (par contact, dans une transaction)

```sql
-- Pour chaque contact_id dans la liste:
UPDATE contacts 
SET statut = 'actif', 
    is_blacklisted = 0,
    blacklist_date = NULL,
    updated_at = CURRENT_TIMESTAMP
WHERE id = ?;
```

**Paramètres bindés par itération:** `['contact_id']`

---

## Route 5: Blacklister un contact

**Méthode HTTP:** `PUT` ou `POST`  
**Endpoint:** `/api/contacts/:id/blacklist`  
**Description:** Ajoute un contact à la blacklist (appelée depuis d'autres écrans).

### Paramètres d'entrée (URL Parameters)

| Paramètre | Type | Description |
|-----------|------|-------------|
| `id` | string | UUID du contact |

### Réponse JSON (200 OK)

```json
{
  "success": true
}
```

### Requête SQL exacte

```sql
UPDATE contacts 
SET statut = 'blacklist', 
    is_blacklisted = 1,
    blacklist_date = CURRENT_TIMESTAMP,
    updated_at = CURRENT_TIMESTAMP
WHERE id = ?;
```

**Paramètres bindés:** `['550e8400-e29b-41d4-a716-446655440000']`

---

## Route 6: Compter les contacts blacklistés (Stats)

**Méthode HTTP:** `GET`  
**Endpoint:** `/api/contacts/stats`  
**Description:** Récupère les statistiques globales dont le nombre de contacts blacklistés.

### Paramètres d'entrée

Aucun.

### Réponse JSON (200 OK)

```json
{
  "total": 1250,
  "entreprises": 450,
  "personnes": 800,
  "avecImpayes": 320,
  "blacklist": 15,
  "sansEmail": 45
}
```

### Requête SQL exacte (pour blacklist)

```sql
SELECT COUNT(*) as blacklist
FROM contacts 
WHERE statut = 'blacklist' 
   OR is_blacklisted = 1;
```

---

## Schéma SQL Référence

### Table `contacts` (champs pertinents)

```sql
CREATE TABLE contacts (
    id TEXT PRIMARY KEY,
    nom TEXT,
    prenom TEXT,
    email TEXT,
    telephone TEXT,
    type TEXT,                    -- Nom de l'entreprise si type_personne = 'M'
    type_personne TEXT,           -- 'M' = Morale (entreprise), 'P' = Physique
    statut TEXT,                  -- 'actif', 'blacklist', etc.
    is_blacklisted INTEGER DEFAULT 0,
    blacklist_date TEXT,          -- ISO 8601 datetime
    blacklist_motif TEXT,
    created_at TEXT,
    updated_at TEXT
);
```

### Table `impayes` (pour le comptage)

```sql
CREATE TABLE impayes (
    id TEXT PRIMARY KEY,
    proprietaire_id TEXT REFERENCES contacts(id),
    statut TEXT DEFAULT 'impaye', -- 'impaye', 'paye', etc.
    -- ... autres champs
);
```

---

## Flux de données Frontend ↔ Backend

```
┌─────────────────────────────────────────────────────────────┐
│  contacts-blacklist.html (Alpine.js)                        │
│                                                             │
│  ┌─────────────────┐  ┌────────────────────┐               │
│  │ loadContacts()  │  │ filterContacts()   │               │
│  │ ─────────────── │  │ ────────────────── │               │
│  │ GET /contacts   │  │ GET /contacts      │               │
│  │ ?is_blacklisted │  │ ?is_blacklisted=1  │               │
│  │ =1&limit=1000   │  │ &search={query}    │               │
│  └─────────────────┘  └────────────────────┘               │
│                                                             │
│  ┌─────────────────┐  ┌────────────────────┐               │
│  │ removeFrom      │  │ removeAllFrom      │               │
│  │ Blacklist()     │  │ Blacklist()        │               │
│  │ ─────────────── │  │ ────────────────── │               │
│  │ PUT /contacts   │  │ POST /contacts/    │               │
│  │ /{id}           │  │ bulk-unblacklist   │               │
│  │ {isBlacklisted  │  │ {contact_ids:[]}   │               │
│  │ :0}             │  │                    │               │
│  └─────────────────┘  └────────────────────┘               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Backend Flask (contacts.py)                               │
│                                                             │
│  • list_contacts()    → GET /api/contacts                   │
│  • update_contact()   → PUT /api/contacts/<id>               │
│  • bulk_unblacklist   → POST /api/contacts/bulk-unblacklist  │
│  • blacklist_contact  → PUT /api/contacts/<id>/blacklist     │
│  • get_stats()        → GET /api/contacts/stats             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  SQLite Database                                           │
│                                                             │
│  • contacts (is_blacklisted, blacklist_date)                 │
│  • impayes (proprietaire_id, statut)                       │
└─────────────────────────────────────────────────────────────┘
```

---

## Codes d'erreur

| Code HTTP | Description | Scénario |
|-----------|-------------|----------|
| 200 | OK | Opération réussie |
| 400 | Bad Request | Paramètres manquants ou invalides |
| 404 | Not Found | Contact non trouvé |
| 500 | Internal Server Error | Erreur serveur / DB |

---

## Notes d'implémentation

1. **Dual field blacklist**: Le système utilise à la fois `is_blacklisted` (integer) et `statut` (string) pour la rétrocompatibilité. Les deux doivent être mis à jour ensemble.

2. **Date de blacklist**: `blacklist_date` est automatiquement remplie à CURRENT_TIMESTAMP lors du blacklisting, et mise à NULL lors du dé-blacklisting.

3. **Comptage des impayés**: Le champ `impayesCount` est calculé dynamiquement via une sous-requête COUNT sur la table `impayes` filtrée par `proprietaire_id` et `statut = 'impaye'`.

4. **Recherche**: La recherche textuelle porte sur `nom`, `prenom`, `email` et `type` (nom d'entreprise).

5. **Pagination**: La pagination est gérée côté frontend (Alpine.js) pour permettre un filtrage instantané sans nouvel appel API.
