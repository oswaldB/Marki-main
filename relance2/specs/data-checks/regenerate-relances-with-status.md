# Data Check: regenerate-relances-with-status.md

## Résumé
- Workflow analysé: regenerate-relances-with-status.md
- Status: ✓ Cohérent
- Tables identifiées: 1

## Tables Utilisées
| Table | Colonnes utilisées | Existe dans schema | Validité |
|-------|-------------------|-------------------|----------|
| relances | contact_id, statut | ✓ Oui | ✓ Valide |

## Requêtes SQL Analysées

### Requête 1: SELECT DISTINCT
```sql
SELECT DISTINCT contact_id FROM relances WHERE statut = ?
```
| Aspect | Détail |
|--------|--------|
| Type | SELECT |
| Tables | relances |
| Colonnes | contact_id (SELECT), statut (WHERE) |
| Paramètres | statutCible |
| Conformité | ✓ Oui |

### Requête 2: DELETE
```sql
DELETE FROM relances WHERE contact_id = ? AND statut = ?
```
| Aspect | Détail |
|--------|--------|
| Type | DELETE |
| Tables | relances |
| Colonnes | contact_id (WHERE), statut (WHERE) |
| Paramètres | contact_id, statutCible |
| Conformité | ✓ Oui |

## Vérifications

### Structure de la table `relances`
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
    updated_at TEXT NOT NULL,
    smtp_profile_id TEXT REFERENCES smtp_profiles(id),
    cc TEXT,
    scenario TEXT,
    email_index INTEGER,
    email_sent INTEGER DEFAULT 0,
    erreur_count INTEGER DEFAULT 0,
    last_error TEXT
);
```

### Colonnes utilisées
| Colonne | Type SQL | NOT NULL | Valeur par défaut | Validité |
|---------|----------|----------|-------------------|----------|
| contact_id | TEXT | ✓ Oui | - | ✓ Valide |
| statut | TEXT | Non | 'brouillon' | ✓ Valide |

- [x] Tables existent dans schema.sql
- [x] Colonnes existent
- [x] Types de données cohérents
- [x] Foreign keys valides
- [x] Contraintes respectées

## Problèmes Identifiés

*Aucun problème détecté*

## Détails des Validations

### Validité des colonnes

**contact_id**
- Type: TEXT
- Contrainte: NOT NULL
- Foreign Key: REFERENCES contacts(id)
- Usage dans workflow: ✓ Utilisé dans WHERE et SELECT
- Analyse: La requête DELETE utilise `contact_id = ?` ce qui est conforme

**statut**
- Type: TEXT
- Contrainte: DEFAULT 'brouillon'
- Usage dans workflow: ✓ Utilisé dans WHERE clause
- Analyse: La requête filtre sur `statut = ?`, la valeur par défaut n'est pas utilisée mais c'est correct

### Foreign Keys

| Colonne | Référence | Action ON DELETE | Impact sur workflow |
|---------|-----------|------------------|---------------------|
| contact_id | contacts(id) | - | Le workflow ne supprime que des relances, pas de contacts |

### Notes d'implémentation

Le workflow est conforme au schéma. Quelques observations:
1. La requête utilise `DISTINCT` pour éviter les doublons de contact_id
2. Le DELETE est sécurisé par un filtre sur contact_id ET statut
3. La fonction `generateRelances` est appelée avec `contactId` mais son implémentation n'est pas visible dans ce workflow

## Recommandations

*Aucune correction nécessaire*

Le workflow est entièrement cohérent avec le schéma de base de données. Les requêtes SQL respectent:
- Les noms de tables et colonnes
- Les contraintes NOT NULL
- Les clés étrangères
- Les types de données