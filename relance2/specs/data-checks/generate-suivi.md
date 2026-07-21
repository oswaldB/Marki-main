# Data Check: generate-suivi.md

## Résumé
- Workflow analysé: generate-suivi.md
- Status: ✓ Cohérent
- Tables identifiées: 3

## Tables Utilisées
| Table | Colonnes utilisées | Existe dans schema | Validité |
|-------|-------------------|-------------------|----------|
| sequences | id, type_sequence, actif | ✓ | ✓ Valide |
| impayes | id, sequence_id, apporteur_id, facture_soldee | ✓ | ✓ Valide |
| contacts | id, email, nom, is_blacklisted | ✓ | ✓ Valide |

## Requêtes SQL Analysées
| Type | Tables | Colonnes | Conformité |
|------|--------|----------|------------|
| SELECT | sequences | type_sequence, actif | ✓ Conforme |
| SELECT + JOIN | impayes, contacts | i.*, c.email, c.nom, sequence_id, apporteur_id, facture_soldee, is_blacklisted | ✓ Conforme |

### Détails des requêtes

**Requête 1: Récupération des séquences de type 'suivi'**
```sql
SELECT * FROM sequences 
WHERE type_sequence = 'suivi' AND actif = 1
```
- Table: `sequences` ✓
- Colonnes filtrées: `type_sequence`, `actif` ✓
- Contraintes respectées: `type_sequence` TEXT NOT NULL, `actif` INTEGER DEFAULT 1

**Requête 2: Récupération des impayés pour une séquence**
```sql
SELECT i.*, c.email, c.nom
FROM impayes i
JOIN contacts c ON i.apporteur_id = c.id
WHERE i.sequence_id = ?
  AND i.facture_soldee = 0
  AND c.is_blacklisted = 0
```
- Tables: `impayes`, `contacts` ✓
- JOIN sur `impayes.apporteur_id = contacts.id` ✓
- Clés étrangères valides:
  - `impayes.apporteur_id` → `contacts(id)` ✓
  - `impayes.sequence_id` → `sequences(id)` ✓
- Contraintes: `facture_soldee` INTEGER DEFAULT 0, `is_blacklisted` INTEGER DEFAULT 0 ✓

## Vérifications
- [x] Tables existent dans schema.sql
- [x] Colonnes existent
- [x] Types de données cohérents
- [x] Foreign keys valides
- [x] Contraintes respectées

### Vérification détaillée des colonnes

#### sequences
| Colonne | Type schema | Nullable | Valeur utilisée | Statut |
|---------|-------------|----------|-----------------|--------|
| id | TEXT PRIMARY KEY | NOT NULL | auto | ✓ |
| type_sequence | TEXT | NOT NULL | 'suivi' | ✓ |
| actif | INTEGER | DEFAULT 1 | 1 | ✓ |

#### impayes
| Colonne | Type schema | Nullable | Valeur utilisée | Statut |
|---------|-------------|----------|-----------------|--------|
| id | TEXT PRIMARY KEY | NOT NULL | auto | ✓ |
| sequence_id | TEXT | - | paramètre ? | ✓ FK→sequences.id |
| apporteur_id | TEXT | - | JOIN c.id | ✓ FK→contacts.id |
| facture_soldee | INTEGER | DEFAULT 0 | 0 | ✓ |

#### contacts
| Colonne | Type schema | Nullable | Valeur utilisée | Statut |
|---------|-------------|----------|-----------------|--------|
| id | TEXT PRIMARY KEY | NOT NULL | JOIN i.apporteur_id | ✓ |
| email | TEXT | - | c.email | ✓ |
| nom | TEXT | - | c.nom | ✓ |
| is_blacklisted | INTEGER | DEFAULT 0 | 0 | ✓ |

## Problèmes Identifiés
*Aucun problème détecté*

Toutes les structures de données référencées dans le workflow existent dans le schéma SQL et sont utilisées conformément aux contraintes définies.

## Recommandations
*Aucune correction nécessaire*

Le workflow est conforme au schéma de base de données. Les requêtes SQL sont valides et respectent :
- Les types de données définis
- Les contraintes de clés étrangères
- Les valeurs par défaut (NOT NULL, DEFAULT)
- La logique métier (filtrage sur `facture_soldee = 0` et `is_blacklisted = 0`)

### Notes complémentaires
- Le workflow utilise correctement la distinction `type_sequence = 'suivi'` vs `'relances'`
- Le JOIN sur `apporteur_id` implique que les impayés sont liés à un contact de type apporteur
- Les filtres `is_blacklisted = 0` et `facture_soldee = 0` assurent que seuls les impayés actifs et non soldés sont traités
