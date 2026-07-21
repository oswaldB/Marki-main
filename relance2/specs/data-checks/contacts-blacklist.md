# Data Check: contacts-blacklist.md

## Résumé
- Workflow analysé: contacts-blacklist.md
- Status: ✗ Problèmes trouvés
- Tables identifiées: 2 (contacts, relances)

## Tables Utilisées
| Table | Colonnes utilisées | Existe dans schema | Validité |
|-------|-------------------|-------------------|----------|
| contacts | id, is_blacklisted, blacklist_date, blacklist_motif | ✓ Oui | ✓ Valide |
| relances | id, contact_id, statut, **updated_at** | ✓ Oui | ✗ Colonne manquante |

## Requêtes SQL Analysées
| Type | Tables | Colonnes | Conformité |
|------|--------|----------|------------|
| SELECT | contacts | id, is_blacklisted | ✓ Conforme |
| UPDATE | contacts | is_blacklisted, blacklist_date, blacklist_motif | ✓ Conforme |
| UPDATE | relances | statut, **updated_at** | ✗ Colonne inexistante |

## Vérifications
- [x] Tables existent dans schema.sql
  - ✓ Table `contacts` trouvée
  - ✓ Table `relances` trouvée
- [x] Colonnes existent (contacts)
  - ✓ `id` TEXT PRIMARY KEY
  - ✓ `is_blacklisted` INTEGER DEFAULT 0
  - ✓ `blacklist_date` TEXT
  - ✓ `blacklist_motif` TEXT
- [x] Colonnes existent (relances - partiel)
  - ✓ `contact_id` TEXT NOT NULL REFERENCES contacts(id)
  - ✓ `statut` TEXT DEFAULT 'brouillon'
  - ✗ **`updated_at` n'existe PAS dans relances**
- [x] Types de données cohérents
  - ✓ is_blacklisted: INTEGER (0/1) cohérent
  - ✓ blacklist_date: TEXT ISO 8601 cohérent
  - ✓ statut: TEXT cohérent
- [x] Foreign keys valides
  - ✓ relances.contact_id → contacts.id
- [ ] Contraintes respectées
  - ⚠ Valeurs de statut dans IN clause non documentées dans le schéma

## Problèmes Identifiés

### 1. Colonne inexistante - CRITIQUE
**Table:** `relances`  
**Colonne:** `updated_at`  
**Impact:** La requête SQL échouera avec une erreur "no such column"

```sql
-- Requête problématique:
UPDATE relances 
SET statut = 'annulee', updated_at = CURRENT_TIMESTAMP  -- ← ERREUR ICI
WHERE contact_id = ? 
  AND statut IN ('brouillon', 'pret pour envoi', 'planifiee')
```

**Schema actuel de relances:**
```sql
CREATE TABLE relances (
  id TEXT PRIMARY KEY,
  contact_id TEXT NOT NULL REFERENCES contacts(id),
  sequence_id TEXT NOT NULL REFERENCES sequences(id),
  statut TEXT DEFAULT 'brouillon',
  date_envoi TEXT,
  date_programmation TEXT,
  sujet TEXT NOT NULL,
  corps TEXT NOT NULL,
  email_envoye_a TEXT,
  valide INTEGER DEFAULT 0,
  manuelle INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  -- updated_at MANQUANT!
  ...
);
```

### 2. Valeurs de statut non documentées - MINEUR
Les valeurs `'pret pour envoi'` et `'planifiee'` utilisées dans la clause IN ne sont pas explicitement définies dans le schéma. Le schéma ne montre que DEFAULT 'brouillon'.

## Recommandations

### Pour corriger le problème critique:

**Option A - Modifier la requête SQL (recommandée):**
Retirer `updated_at = CURRENT_TIMESTAMP` de la requête UPDATE sur relances:

```javascript
// Avant (erreur):
db.run(`
  UPDATE relances 
  SET statut = 'annulee', updated_at = CURRENT_TIMESTAMP
  WHERE contact_id = ? 
    AND statut IN ('brouillon', 'pret pour envoi', 'planifiee')
`, [contactId]);

// Après (corrigé):
db.run(`
  UPDATE relances 
  SET statut = 'annulee'
  WHERE contact_id = ? 
    AND statut IN ('brouillon', 'pret pour envoi', 'planifiee')
`, [contactId]);
```

**Option B - Ajouter la colonne (modification schema requise):**
Si le suivi de la date de mise à jour est nécessaire, demander l'ajout de:
```sql
ALTER TABLE relances ADD COLUMN updated_at TEXT;
```

### Pour la documentation des statuts:
Ajouter un commentaire ou une documentation listant toutes les valeurs possibles pour `relances.statut`.
