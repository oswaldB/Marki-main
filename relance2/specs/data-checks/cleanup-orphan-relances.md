# Data Check: cleanup-orphan-relances.md

## Résumé
- Workflow analysé: cleanup-orphan-relances.md
- Status: ✓ Cohérent
- Tables identifiées: 2

## Tables Utilisées
| Table | Colonnes utilisées | Existe dans schema | Validité |
|-------|-------------------|-------------------|----------|
| relances | id, contact_id | ✓ Oui | ✓ Valide |
| contacts | id | ✓ Oui | ✓ Valide |

## Requêtes SQL Analysées

### Requête 1: SELECT avec LEFT JOIN
```sql
SELECT r.id FROM relances r
LEFT JOIN contacts c ON r.contact_id = c.id
WHERE c.id IS NULL
```

| Type | Tables | Colonnes | Conformité |
|------|--------|----------|------------|
| SELECT | relances, contacts | r.id, r.contact_id, c.id | ✓ Conforme |

**Analyse détaillée:**
- Table `relances`: colonne `id` (TEXT PRIMARY KEY) ✓
- Table `relances`: colonne `contact_id` (TEXT NOT NULL) ✓
- Table `contacts`: colonne `id` (TEXT PRIMARY KEY) ✓
- JOIN condition: `r.contact_id = c.id` ✓ Types compatibles (TEXT = TEXT)
- WHERE clause: `c.id IS NULL` ✓ Pattern standard pour trouver les orphelins

### Requête 2: DELETE
```javascript
db.delete('relances', relance.id)
```

| Type | Table | Colonne clé | Conformité |
|------|-------|-------------|------------|
| DELETE | relances | id | ✓ Conforme |

**Contraintes à vérifier lors du DELETE:**
- Table `relance_impayes` a une FK `relance_id REFERENCES relances(id) ON DELETE CASCADE` ✓
- La suppression cascade sera gérée automatiquement

## Vérifications

- [x] **Tables existent dans schema.sql**
  - `relances`: ✓ Table définie ligne 46
  - `contacts`: ✓ Table définie ligne 157

- [x] **Colonnes existent**
  - `relances.id`: ✓ TEXT PRIMARY KEY
  - `relances.contact_id`: ✓ TEXT NOT NULL
  - `contacts.id`: ✓ TEXT PRIMARY KEY

- [x] **Types de données cohérents**
  - `relances.contact_id` (TEXT) = `contacts.id` (TEXT) ✓
  - Jointure possible sans conversion de type

- [x] **Foreign keys valides**
  - `relances.contact_id REFERENCES contacts(id)` ✓
  - Contrainte ON DELETE non spécifiée (NO ACTION par défaut)

- [x] **Contraintes respectées**
  - `contact_id` est NOT NULL dans la table relances
  - Le LEFT JOIN avec `WHERE c.id IS NULL` détecte correctement les orphelins
  - Clé primaire `id` utilisée pour le DELETE

## Problèmes Identifiés

*Aucun problème détecté*

Le workflow est entièrement cohérent avec le schéma de base de données.

## Recommandations

1. **Optionnel**: Ajouter un index sur `relances.contact_id` pour optimiser la jointure :
   ```sql
   CREATE INDEX idx_relances_contact_id ON relances(contact_id);
   ```

2. **Optionnel**: Le workflow pourrait être optimisé avec une requête DELETE en une seule passe :
   ```sql
   DELETE FROM relances
   WHERE contact_id NOT IN (SELECT id FROM contacts)
   ```
   Cela éviterait la boucle JavaScript et les appels DELETE individuels.

3. **Logging**: Considérer l'ajout d'un log dans la table `events` pour tracer les suppressions.
