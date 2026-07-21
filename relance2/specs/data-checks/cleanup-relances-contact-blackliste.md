# Data Check: cleanup-relances-contact-blackliste.md

## Résumé
- **Workflow analysé** : cleanup-relances-contact-blackliste.md
- **Status** : ✓ Cohérent
- **Tables identifiées** : 2 (contacts, relances)

## Tables Utilisées

| Table | Colonnes utilisées | Existe dans schema | Validité |
|-------|-------------------|-------------------|----------|
| contacts | id, is_blacklisted | ✓ Oui | ✓ Valide |
| relances | contact_id, statut, updated_at | ✓ Oui | ✓ Valide |

## Requêtes SQL Analysées

| Type | Tables | Colonnes | Conformité |
|------|--------|----------|------------|
| SELECT (search) | contacts | id, is_blacklisted | ✓ Conforme |
| UPDATE | relances | statut, updated_at, contact_id (WHERE) | ✓ Conforme |

### Détails des requêtes

#### 1. Recherche contacts blacklistés
```javascript
db.search('contacts', { where: { is_blacklisted: 1 } })
```
- **Table** : `contacts` ✓
- **Colonne filtre** : `is_blacklisted` ✓
- **Type attendu** : INTEGER (valeur 0/1)
- **Conformité** : ✓ La colonne existe avec DEFAULT 0

#### 2. Mise à jour des relances
```sql
UPDATE relances 
SET statut = 'annulee', updated_at = CURRENT_TIMESTAMP
WHERE contact_id = ? 
  AND statut IN ('brouillon', 'pret pour envoi', 'planifiee')
```
- **Table** : `relances` ✓
- **SET** : 
  - `statut` TEXT ✓ (DEFAULT 'brouillon')
  - `updated_at` TEXT ✓ (NOT NULL)
- **WHERE** :
  - `contact_id` TEXT ✓ (NOT NULL, FK vers contacts.id)
  - `statut` TEXT ✓
- **Valeurs statut** : 'annulee', 'brouillon', 'pret pour envoi', 'planifiee'
- **Conformité** : ✓ Toutes les colonnes existent

## Vérifications

- [x] Tables existent dans schema.sql
  - `contacts` : ✓ Table présente
  - `relances` : ✓ Table présente

- [x] Colonnes existent
  - `contacts.id` : ✓ TEXT PRIMARY KEY
  - `contacts.is_blacklisted` : ✓ INTEGER DEFAULT 0
  - `relances.contact_id` : ✓ TEXT NOT NULL
  - `relances.statut` : ✓ TEXT DEFAULT 'brouillon'
  - `relances.updated_at` : ✓ TEXT NOT NULL

- [x] Types de données cohérents
  - `is_blacklisted` : INTEGER (valeur 1 pour blacklisté) ✓
  - `statut` : TEXT (valeurs 'annulee', etc.) ✓
  - `updated_at` : TEXT (CURRENT_TIMESTAMP) ✓
  - `contact_id` : TEXT ✓

- [x] Foreign keys valides
  - `relances.contact_id` → `contacts.id` : ✓ Contrainte FK présente

- [x] Contraintes respectées
  - `relances.contact_id` : NOT NULL ✓
  - `relances.updated_at` : NOT NULL ✓ (mis à jour avec CURRENT_TIMESTAMP)

## Problèmes Identifiés

*Aucun problème détecté*

## Notes sur les valeurs de statut

Le workflow utilise les valeurs de statut suivantes pour `relances.statut` :
- `'brouillon'` (valeur par défaut dans le schéma) ✓
- `'pret pour envoi'` (pas de contrainte ENUM, TEXT libre) ✓
- `'planifiee'` (pas de contrainte ENUM, TEXT libre) ✓
- `'annulee'` (valeur assignée) ✓

Le schéma utilise `TEXT` sans contrainte CHECK, donc toutes ces valeurs sont acceptées.

## Recommandations

*Aucune correction nécessaire - le workflow est conforme au schéma de données*
