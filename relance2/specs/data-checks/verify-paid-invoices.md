# Data Check: verify-paid-invoices.md

## Résumé
- Workflow analysé: verify-paid-invoices.md
- Status: ✓ Cohérent (avec note sur base externe)
- Tables identifiées: 2 (1 interne, 1 externe)

## Tables Utilisées
| Table | Colonnes utilisées | Existe dans schema | Validité |
|-------|-------------------|-------------------|----------|
| impayes | facture_soldee, nfacture, id, statut | ✓ Oui | ✓ Valide |
| _GCO__GcoPiece | facturesoldee, nfacture | ✗ Non (base externe) | ℹ️ Attendu |

## Requêtes SQL Analysées

### Requête 1: Sélection des impayés non soldés
```sql
SELECT * FROM impayes WHERE facture_soldee = 0
```
| Aspect | Détail |
|--------|--------|
| Type | SELECT |
| Tables | impayes |
| Colonnes | facture_soldee |
| Conformité | ✓ Colonne existe (INTEGER DEFAULT 0) |

### Requête 2: Vérification source externe
```sql
SELECT facturesoldee FROM _GCO__GcoPiece WHERE nfacture = ?
```
| Aspect | Détail |
|--------|--------|
| Type | SELECT |
| Tables | _GCO__GcoPiece (base externe) |
| Colonnes | facturesoldee, nfacture |
| Conformité | ℹ️ Table externe - non soumise au schema.sql |

### Requête 3: Mise à jour du statut
```sql
UPDATE impayes SET facture_soldee = 1, statut = 'paye' WHERE id = ?
```
| Aspect | Détail |
|--------|--------|
| Type | UPDATE |
| Tables | impayes |
| Colonnes | facture_soldee (INTEGER), statut (TEXT), id (PRIMARY KEY) |
| Conformité | ✓ Toutes les colonnes existent avec types compatibles |

## Détail des Colonnes dans schema.sql

### Table `impayes`
| Colonne | Type dans schema | Utilisation workflow | Compatible |
|---------|-----------------|---------------------|------------|
| id | TEXT PRIMARY KEY | Clé de mise à jour | ✓ |
| nfacture | TEXT NOT NULL | Référence facture | ✓ |
| facture_soldee | INTEGER DEFAULT 0 | WHERE + SET | ✓ |
| statut | TEXT DEFAULT 'impaye' | SET | ✓ |
| payer_id | TEXT REFERENCES contacts(id) | - | - |
| contact_relance_id | TEXT REFERENCES contacts(id) | - | - |
| montant_ttc | REAL DEFAULT 0 | - | - |
| reste_a_payer | REAL DEFAULT 0 | - | - |
| date_echeance | TEXT NOT NULL | - | - |
| created_at | TEXT NOT NULL | - | - |
| updated_at | TEXT NOT NULL | - | - |

## Vérifications

- [x] Tables existent dans schema.sql
  - `impayes`: ✓ Présente
  - `_GCO__GcoPiece`: ℹ️ Base externe (SYNC_DB_PATH)

- [x] Colonnes existent
  - `impayes.id`: ✓ TEXT PRIMARY KEY
  - `impayes.nfacture`: ✓ TEXT NOT NULL
  - `impayes.facture_soldee`: ✓ INTEGER DEFAULT 0
  - `impayes.statut`: ✓ TEXT DEFAULT 'impaye'

- [x] Types de données cohérents
  - `facture_soldee` INTEGER: utilisé comme booléen (0/1) ✓
  - `statut` TEXT: valeur 'paye' compatible ✓
  - `id` TEXT: clé primaire valide ✓

- [x] Foreign keys valides
  - Aucune FK utilisée directement dans les requêtes du workflow
  - `impayes` a des FK vers `contacts(id)` définies dans le schema

- [x] Contraintes respectées
  - `nfacture` NOT NULL: utilisé dans WHERE avec valeur existante ✓
  - `facture_soldee` DEFAULT 0: cohérent avec la requête WHERE = 0 ✓

## Problèmes Identifiés

*Aucun problème détecté*

### Notes importantes:
1. **Base externe**: La table `_GCO__GcoPiece` provient d'une base SQLite externe (`SYNC_DB_PATH`) et n'est pas censée être dans `schema.sql`. C'est un comportement attendu.

2. **Convention booléenne**: Le workflow utilise `facture_soldee` comme booléen (0/1) ce qui est cohérent avec le type INTEGER et la valeur DEFAULT 0 du schema.

3. **Statut 'paye'**: La valeur 'paye' est assignée à `statut`. Vérifier que cette valeur est dans l'énumération attendue par l'application (le schema utilise DEFAULT 'impaye', suggérant une énumération de statuts).

## Recommandations

1. **Validation optionnelle**: Vérifier que la valeur 'paye' est une valeur valide dans l'énumération des statuts d'impayés (à confirmer dans les specs métier ou le code applicatif).

2. **Index suggéré**: Pour optimiser la requête de sélection:
   ```sql
   CREATE INDEX idx_impayes_facture_soldee ON impayes(facture_soldee);
   ```

3. **Transaction**: Le workflow pourrait bénéficier d'une transaction pour garantir la cohérence si plusieurs mises à jour sont effectuées.

4. **Gestion des erreurs**: Ajouter une vérification que `SYNC_DB_PATH` est défini avant d'ouvrir la connexion externe.

---
*Rapport généré le: 2025-01-XX*
*Workflow: verify-paid-invoices.md*
*Schema analysé: schema.sql*
