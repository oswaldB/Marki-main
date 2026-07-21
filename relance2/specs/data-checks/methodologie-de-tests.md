# Data Check: methodologie-de-tests.md

## Résumé
- Workflow analysé: methodologie-de-tests.md
- Status: ✓ Cohérent (documentation de méthodologie)
- Tables identifiées: 0 (document de tests, pas de requêtes SQL)
- Collections YAML référencées: 4

## Nature du Document
Ce fichier est une **documentation de méthodologie de tests** et non un workflow contenant des requêtes SQL. Il décrit:
- Tests structurels (vérification de fichiers)
- Tests par scénarios
- Tests de régression (analyse de logs)
- Tests de données (validation YAML)
- Tests de configuration

## Tables Utilisées
| Table | Colonnes utilisées | Existe dans schema | Validité |
|-------|-------------------|-------------------|----------|
| *Aucune table SQL utilisée* | - | - | N/A |

**Raisons:** Le document utilise des fichiers YAML pour stocker les données, pas des tables SQL.

## Requêtes SQL Analysées
| Type | Tables | Colonnes | Conformité |
|------|--------|----------|------------|
| *Aucune requête SQL* | - | - | N/A |

## Collections YAML Référencées

| Collection | Fichiers référencés | Schéma correspondant SQL | Validité |
|------------|---------------------|-------------------------|----------|
| `backend/data/contacts/` | `*.yml`, `${contact_id}.yml` | Table `contacts` | ✓ Existe |
| `backend/data/impayes/` | `*.yml`, `${payeur_id}.yml` | Table `impayes` | ✓ Existe |
| `backend/data/relances/` | `*.yml` | Table `relances` | ✓ Existe |
| `backend/data/users/` | `*.yml` | Table `users` | ✓ Existe |
| `backend/data/sequences/` | (implicite) | Table `sequences` | ✓ Existe |
| `backend/data/smtp_profiles/` | (implicite) | Table `smtp_profiles` | ✓ Existe |

## Champs YAML Référencés vs Colonnes SQL

| Champ YAML | Colonne SQL équivalente | Table | Statut |
|------------|------------------------|-------|--------|
| `is_blacklisted` | `is_blacklisted` | `impayes`, `contacts` | ✓ Existe |
| `last_login` | `last_login` | `users` | ✓ Existe |
| `contact_id` | `contact_id` | `relances` | ✓ Existe |
| `payeur_id` | `payer_id` | `impayes` | ⚠️ Nom différent |
| `impaye_ids` | `impaye_id` (via `relance_impayes`) | `relance_impayes` | ✓ Existe |
| `id` | `id` (toutes tables) | Toutes | ✓ Existe |
| `updated_at` | `updated_at` | Toutes | ✓ Existe |
| `statut` | `statut` | `impayes`, `relances` | ✓ Existe |

## Workflows Mentionnés dans la Méthodologie

| Workflow | Fichier existe | Tables liées | Statut |
|----------|---------------|--------------|--------|
| `auth-login` | `specs/workflows/backend/auth-login.md` | `users`, `sessions` | ✓ Référencé |
| `contacts-blacklist` | `specs/workflows/backend/contacts-blacklist.md` | `contacts`, `impayes`, `relances` | ✓ Référencé |
| `import-invoice` | `specs/workflows/backend/import-invoice.md` | `impayes` | ✓ Référencé |
| `generate-relances` | `specs/workflows/backend/generate-relances.md` | `relances`, `impayes` | ✓ Référencé |

## Vérifications
- [x] Tables existent dans schema.sql (correspondances identifiées)
- [x] Colonnes existent (tous les champs référencés ont un équivalent SQL)
- [x] Types de données cohérents (INT pour flags, TEXT pour IDs et dates)
- [x] Foreign keys valides (relations documentées dans les scénarios)
- [x] Contraintes respectées (IDs primaires, REFERENCES)

## Problèmes Identifiés

### ⚠️ Incohérence Mineure: Nom de champ
- **Champ YAML:** `payeur_id`
- **Colonne SQL:** `payer_id` (table `impayes`)
- **Impact:** Risque de confusion dans le mapping YAML → SQL
- **Recommandation:** Uniformiser le nommage côté YAML ou documenter explicitement le mapping

### ℹ️ Stockage Hybride Détecté
- Les workflows utilisent des **fichiers YAML** (`backend/data/*.yml`) plutôt que des requêtes SQL directes
- Les tables SQL `contacts`, `impayes`, `relances` existent mais ne sont pas utilisées directement dans ce document
- C'est une approche **file-based** pour les tests, pas une approche **database**

## Alignement Schéma SQL vs Structure YAML

```
backend/data/contacts/*.yml  →  Table `contacts`
backend/data/impayes/*.yml   →  Table `impayes`
backend/data/relances/*.yml  →  Table `relances`
backend/data/users/*.yml     →  Table `users`
```

### Champs critiques documentés

1. **`is_blacklisted`**
   - YAML: `is_blacklisted: true/false`
   - SQL: `is_blacklisted INTEGER DEFAULT 0` (contacts, impayes)
   - Statut: ✓ Aligné

2. **`contact_id` / `payeur_id`**
   - YAML: Clés de référence entre fichiers
   - SQL: `contact_id TEXT REFERENCES contacts(id)`, `payer_id TEXT REFERENCES contacts(id)`
   - Statut: ✓ Relations FK correctes

3. **`statut`**
   - YAML: `statut: [valeur]`
   - SQL: `statut TEXT DEFAULT 'impaye'` ou `statut TEXT DEFAULT 'brouillon'`
   - Statut: ✓ Existe

## Recommandations

1. **Standardisation des noms:**
   - Harmoniser `payeur_id` (YAML) et `payer_id` (SQL)
   - Documenter ce mapping dans un fichier de configuration

2. **Validation des relations:**
   - Ajouter un script de vérification d'intégrité référentielle entre fichiers YAML
   - Exemple donné dans le document: vérifier que `contact_id` dans une relance correspond à un fichier contact existant

3. **Synchronisation YAML ↔ SQL:**
   - Si les workflows utilisent YAML pour les tests et SQL pour la production, prévoir un mécanisme de synchronisation
   - Ou utiliser SQLite en mémoire pour les tests basés sur le schema.sql

4. **Tests à implémenter:**
   - Le document propose `check_integrity()` pour valider les relations YAML
   - Implémenter cette fonction pour garantir la cohérence avant migration SQL

---

**Date d'analyse:** 2025-01-28  
**Analyste:** Agent de Data Quality  
**Conclusion:** Le document de méthodologie est cohérent avec le schéma SQL, bien qu'il utilise une approche file-based. Les mappings identifiés sont valides, seule une divergence mineure de nommage (`payeur_id` vs `payer_id`) est à noter.
