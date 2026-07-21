# Data Check: appliquer-regles-attribution.md

## Résumé
- Workflow analysé: appliquer-regles-attribution.md
- Status: ✓ Cohérent
- Tables identifiées: 1

## Tables Utilisées
| Table | Colonnes utilisées | Existe dans schema | Validité |
|-------|-------------------|-------------------|----------|
| impayes | sequence_id, facture_soldee, reste_a_payer, id | ✓ Oui | ✓ Valide |

## Requêtes SQL Analysées
| Type | Tables | Colonnes | Conformité |
|------|--------|----------|------------|
| SELECT | impayes | sequence_id, facture_soldee, reste_a_payer, id | ✓ Conforme |
| UPDATE | impayes | sequence_id | ✓ Conforme |

## Vérifications
- [x] Tables existent dans schema.sql
- [x] Colonnes existent
- [x] Types de données cohérents
- [x] Foreign keys valides
- [x] Contraintes respectées

## Colonnes Détaillées

### Table `impayes`
| Colonne | Type schema | Nullable | Utilisation workflow | Compatible |
|---------|-------------|----------|---------------------|------------|
| id | TEXT PRIMARY KEY | NOT NULL | Clé pour update | ✓ |
| sequence_id | TEXT | NULL | WHERE + UPDATE | ✓ |
| facture_soldee | INTEGER DEFAULT 0 | NULL | WHERE = 0 | ✓ |
| reste_a_payer | REAL DEFAULT 0 | NULL | Comparaisons montant | ✓ |

### Foreign Keys
| Colonne | Référence | Valide |
|---------|-----------|--------|
| sequence_id | sequences(id) | ✓ |

## Problèmes Identifiés
*Aucun problème détecté*

## Analyse des Requêtes

### Requête SELECT
```sql
SELECT * FROM impayes 
WHERE sequence_id IS NULL 
AND facture_soldee = 0
```
- ✓ `sequence_id IS NULL` : Colonne accepte NULL (pas de NOT NULL)
- ✓ `facture_soldee = 0` : INTEGER DEFAULT 0, comparaison valide

### Opération UPDATE (via db.update)
```javascript
db.update('impayes', impaye.id, { sequence_id: sequenceId })
```
- ✓ `sequence_id` : Peut recevoir une valeur TEXT (FK vers sequences.id)
- ✓ `id` : Clé primaire TEXT valide

## Logique Métier vs Schéma

| Condition workflow | Colonne utilisée | Type | Compatible |
|-------------------|------------------|------|------------|
| Montant < 500€ | reste_a_payer | REAL | ✓ |
| Montant > 2000€ | reste_a_payer | REAL | ✓ |

## Recommandations
*Aucune correction nécessaire - le workflow est conforme au schéma*

---
*Rapport généré le: 2026-04-02*
*Schéma source: /home/ubuntu/marki/relance2/specs/schema.sql*
