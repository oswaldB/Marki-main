# Data Check: generate-contact-token.md

## Résumé
- **Workflow analysé:** `workflows/backend/generate-contact-token.md`
- **Status:** ⚠️ Attention requise
- **Tables identifiées:** 1 (contacts)

## Tables Utilisées

| Table | Colonnes utilisées | Existe dans schema | Validité |
|-------|-------------------|-------------------|----------|
| contacts | id | ✓ Oui | ✓ Valide |

## Requêtes SQL Analysées

| Type | Tables | Colonnes | Conformité |
|------|--------|----------|------------|
| db.read() (abstraction) | contacts | id | ⚠️ Non-évaluable* |

> *Le workflow utilise une abstraction `db.read('contacts', contactId)` qui masque la requête SQL réelle. Impossible de valider la syntaxe SQL exacte.

## Schéma Détaillé - Table contacts

```sql
CREATE TABLE IF NOT EXISTS "contacts" (
    id TEXT PRIMARY KEY,
    nom TEXT,
    prenom TEXT,
    email TEXT,
    telephone TEXT,
    type TEXT,
    type_personne TEXT,
    statut TEXT,
    is_blacklisted INTEGER DEFAULT 0,
    blacklist_date TEXT,
    blacklist_motif TEXT,
    civilite TEXT,
    code TEXT,
    activite_societe TEXT,
    adresse_rue TEXT,
    adresse_ville TEXT,
    adresse_code_postal TEXT,
    adresse_pays TEXT,
    notes TEXT,
    created_at TEXT,
    updated_at TEXT,
    externe_id TEXT,
    email_force TEXT,
    lastSyncAt TEXT
);
```

## Vérifications

- [x] **Tables existent dans schema.sql**
  - La table `contacts` existe bien dans le schéma

- [x] **Colonnes existent**
  - La colonne `id` existe comme `TEXT PRIMARY KEY`

- [?] **Types de données cohérents**
  - Non évaluable: le workflow ne spécifie pas le type de `contactId`
  - Attendu: `TEXT` pour correspondre à la définition de `contacts.id`

- [?] **Foreign keys valides**
  - N/A: aucune FK utilisée dans ce workflow

- [?] **Contraintes respectées**
  - N/A: aucune contrainte spécifique à vérifier

## Problèmes Identifiés

### ⚠️ Problème 1: Abstraction SQL non standard
- **Localisation:** Ligne `const contact = db.read('contacts', contactId);`
- **Description:** Le workflow utilise une méthode d'abstraction `db.read()` qui masque la requête SQL réelle
- **Impact:** Impossible de valider:
  - La syntaxe SQL exacte
  - Les optimisations (index, requête préparée)
  - La gestion d'erreurs SQL
  - Les jointures éventuelles

### ⚠️ Problème 2: Aucune vérification de blacklist
- **Description:** Le workflow ne vérifie pas si le contact est blacklisté (`is_blacklisted`)
- **Impact:** Un contact blacklisté pourrait recevoir un token d'accès

### ⚠️ Problème 3: Aucune vérification de statut
- **Description:** Le workflow ne vérifie pas le champ `statut` du contact
- **Impact:** Un contact inactif/supprimé pourrait recevoir un token

### ⚠️ Problème 4: Gestion d'environnement manquante
- **Description:** Aucune vérification que `process.env.JWT_SECRET` et `process.env.FRONTEND_URL` sont définis
- **Impact:** Crash potentiel ou comportement imprévisible si variables manquantes

## Recommandations

### 1. Remplacer l'abstraction par du SQL explicite
```javascript
// Au lieu de:
const contact = db.read('contacts', contactId);

// Utiliser:
const contact = await db.prepare(
  'SELECT * FROM contacts WHERE id = ? AND is_blacklisted = 0'
).get(contactId);
```

### 2. Ajouter les validations manquantes
```javascript
async function generateContactToken(contactId) {
  // Validation des variables d'environnement
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET non configuré');
  }
  if (!process.env.FRONTEND_URL) {
    throw new Error('FRONTEND_URL non configuré');
  }
  
  // Requête avec vérifications
  const contact = await db.prepare(
    'SELECT id, nom, prenom, email, statut, is_blacklisted FROM contacts WHERE id = ?'
  ).get(contactId);
  
  if (!contact) throw new Error('Contact non trouvé');
  if (contact.is_blacklisted === 1) throw new Error('Contact blacklisté');
  if (contact.statut === 'inactif') throw new Error('Contact inactif');
  
  // Suite du process...
}
```

### 3. Considérer l'ajout d'un index
```sql
-- Si la table contacts est volumineuse
CREATE INDEX IF NOT EXISTS idx_contacts_id_active 
ON contacts(id) WHERE is_blacklisted = 0;
```

### 4. Documenter le mapping de l'abstraction
Si `db.read()` doit être conservé, documenter explicitement:
- Quelle table est interrogée
- Quels champs sont retournés
- Comment les erreurs sont gérées

---

**Date d'analyse:** 2026-01-23  
**Schéma de référence:** `specs/schema.sql` (version actuelle)
