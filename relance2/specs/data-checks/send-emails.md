# Data Check: send-emails.md

## Résumé
- Workflow analysé: send-emails.md
- Status: ✗ Problèmes trouvés
- Tables identifiées: 4

## Tables Utilisées
| Table | Colonnes utilisées | Existe dans schema | Validité |
|-------|-------------------|-------------------|----------|
| relances | id, contact_id, sequence_id, statut, sujet, corps, date_programmation, date_envoi, valide | ✓ Oui | ✓ OK |
| contacts | id, nom, prenom, email | ✓ Oui | ✓ OK |
| smtp_profiles | id, nom, host, port, secure, username, password, from_email, from_name, actif | ✓ Oui | ✓ OK |
| impayes | id, contact_relance_id, facture_soldee, email_index | ✓ Oui | ✓ OK |

## Requêtes SQL Analysées

### Requête 1: Récupération des relances
```sql
SELECT r.*, c.nom, c.prenom, c.email as contact_email
FROM relances r
JOIN contacts c ON r.contact_id = c.id
WHERE r.statut IN ('pret pour envoi', 'planifiee')
  AND (r.date_programmation IS NULL OR r.date_programmation <= datetime('now'))
  AND r.valide = 1
```

| Aspect | Statut | Détail |
|--------|--------|--------|
| Tables | ✓ OK | relances, contacts |
| JOIN | ✓ OK | r.contact_id = c.id (FK valide) |
| Colonnes WHERE | ✓ OK | statut, date_programmation, valide existent |
| Colonnes SELECT | ✓ OK | nom, prenom, email existent dans contacts |
| Types | ✓ OK | Comparisons cohérentes |

### Requête 2: Vérification impayés
```sql
SELECT * FROM impayes WHERE contact_relance_id = ? AND facture_soldee = 0
```

| Aspect | Statut | Détail |
|--------|--------|--------|
| Tables | ✓ OK | impayes |
| Colonnes WHERE | ✓ OK | contact_relance_id, facture_soldee existent |
| Types | ✓ OK | INTEGER pour facture_soldee |

### Requête 3: Mise à jour relance (UPDATE)
```javascript
db.update('relances', relance.id, {
  statut: 'Envoyée',
  date_envoi: new Date().toISOString()
})
```

| Aspect | Statut | Détail |
|--------|--------|--------|
| Table | ✓ OK | relances |
| PK | ✓ OK | id (TEXT PRIMARY KEY) |
| Colonnes | ✓ OK | statut (TEXT), date_envoi (TEXT) |
| Types | ✓ OK | ISO string valide pour TEXT |

### Requête 4: Mise à jour impayés (UPDATE)
```javascript
db.update('impayes', impaye.id, {
  email_index: (impaye.email_index || 0) + 1
})
```

| Aspect | Statut | Détail |
|--------|--------|--------|
| Table | ✓ OK | impayes |
| PK | ✓ OK | id (TEXT PRIMARY KEY) |
| Colonnes | ✓ OK | email_index (INTEGER DEFAULT 0) |
| Types | ✓ OK | INTEGER |

## Vérifications

- [x] Tables existent dans schema.sql
- [x] Colonnes existent
- [x] Types de données cohérents
- [x] Foreign keys valides
- [x] Contraintes respectées (pour les requêtes présentes)

### Contraintes NOT NULL vérifiées
| Table | Colonne | Contrainte | Usage dans workflow |
|-------|---------|------------|---------------------|
| relances | contact_id | NOT NULL | ✓ Utilisé dans JOIN |
| relances | sequence_id | NOT NULL | - (pas utilisé directement) |
| relances | sujet | NOT NULL | ✓ SELECT r.* l'inclut |
| relances | corps | NOT NULL | ✓ SELECT r.* l'inclut |
| relances | created_at | NOT NULL | - (pas utilisé) |
| relances | updated_at | NOT NULL | - (pas utilisé) |
| smtp_profiles | nom | NOT NULL | ✓ db.getSmtpProfileDefault() |
| smtp_profiles | host | NOT NULL | ✓ Utilisé dans transport |
| smtp_profiles | port | NOT NULL | ✓ Utilisé dans transport |
| smtp_profiles | username | NOT NULL | ✓ Utilisé dans auth |
| smtp_profiles | password | NOT NULL | ✓ Utilisé dans auth |
| smtp_profiles | from_email | NOT NULL | ✓ Utilisé dans from |
| smtp_profiles | from_name | NOT NULL | ✓ Utilisé dans from |
| smtp_profiles | created_at | NOT NULL | - (pas utilisé) |
| smtp_profiles | updated_at | NOT NULL | - (pas utilisé) |

### Foreign Keys
| FK | Table source | Table cible | Colonnes | Statut |
|----|--------------|-------------|----------|--------|
| relances.contact_id → contacts.id | relances | contacts | contact_id | ✓ OK |
| relances.sequence_id → sequences.id | relances | sequences | sequence_id | - Non vérifié dans workflow |
| impayes.contact_relance_id → contacts.id | impayes | contacts | contact_relance_id | ✓ OK |
| smtp_profiles.id | smtp_profiles | - | id (PK) | ✓ OK |

## Problèmes Identifiés

### ❌ Problème 1: Colonnes manquantes dans la documentation du workflow
**Sévérité:** Moyenne (documentation obsolète)

La documentation du workflow ne mentionne pas plusieurs colonnes existantes dans le schéma qui pourraient être pertinentes:

| Table | Colonnes omises dans workflow | Présentes dans schema.sql |
|-------|-------------------------------|---------------------------|
| relances | smtp_profile_id, cc, scenario, email_index, email_sent, erreur_count, last_error, manuelle, email_envoye_a, created_at, updated_at | ✓ Toutes présentes |
| smtp_profiles | is_default, signature_html, created_at, updated_at | ✓ Toutes présentes |

**Impact:** Le code utilise `db.getSmtpProfileDefault()` qui suppose l'existence de `is_default`, non documentée mais présente dans le schéma.

### ❌ Problème 2: Table mentionnée mais non utilisée
**Sévérité:** Mineure

La documentation du workflow mentionne une table `relance_impayes` (jonction) dans la section "Base de données", mais le code utilise directement `impayes` avec `contact_relance_id`:

```javascript
// Workflow mentionne: relance_impayes
// Code utilise:
const impayes = db.query(
  'SELECT * FROM impayes WHERE contact_relance_id = ? AND facture_soldee = 0',
  [relance.contact_id]
);
```

La table `relance_impayes` existe bien dans le schéma mais n'est **pas utilisée** par ce workflow.

### ❌ Problème 3: Colonnes renvoyées par SELECT *
**Sévérité:** Faible

La requête `SELECT r.*` récupère toutes les colonnes de `relances`, y compris:
- `sujet` (NOT NULL) - utilisé
- `corps` (NOT NULL) - utilisé
- `created_at` (NOT NULL) - non utilisé
- `updated_at` (NOT NULL) - non utilisé

C'est acceptable mais moins performant qu'une sélection explicite.

### ❌ Problème 4: Valeurs de statut non documentées
**Sévérité:** Mineure

Le workflow utilise des valeurs de statut non listées dans la documentation:

| Valeur utilisée | Où | Documentée ? |
|-----------------|-----|--------------|
| 'Envoyée' | Étape 4 (succès) | ✓ Oui |
| 'annulee' | Étape 2 (impayé soldé) | ✗ Non |
| 'erreur_envoi' | Étape 4 (erreur) | ✗ Non |

### ❌ Problème 5: Fonction non standard `db.getSmtpProfileDefault()`
**Sévérité:** Faible (implémentation dépendante)

Le code utilise `db.getSmtpProfileDefault()` qui n'est pas une API SQLite standard. Cette méthode doit implémenter:
```sql
SELECT * FROM smtp_profiles WHERE is_default = 1 AND actif = 1 LIMIT 1
```

Les colonnes `is_default` et `actif` existent bien dans le schéma.

## Recommandations

### 1. Mettre à jour la documentation du workflow
Ajouter les colonnes manquantes dans les tableaux de documentation:

```markdown
### Table `relances` (colonnes supplémentaires)
| Colonne | Type | Description |
|---------|------|-------------|
| smtp_profile_id | TEXT | FK vers smtp_profiles |
| email_sent | INTEGER | 0 ou 1 - email envoyé |
| erreur_count | INTEGER | Nombre d'erreurs |
| last_error | TEXT | Dernier message d'erreur |

### Table `smtp_profiles` (colonnes supplémentaires)
| Colonne | Type | Description |
|---------|------|-------------|
| is_default | INTEGER | 0 ou 1 - profil par défaut |
| from_name | TEXT | Nom d'affichage expéditeur |
```

### 2. Corriger la documentation des tables utilisées
Retirer la mention de `relance_impayes` ou clarifier qu'elle n'est pas utilisée dans ce workflow.

### 3. Documenter toutes les valeurs de statut
Ajouter à la documentation:
- `'annulee'` - lorsque les impayés sont soldés
- `'erreur_envoi'` - lors d'une erreur SMTP

### 4. Requête SQL explicite recommandée
Remplacer `SELECT r.*` par une sélection explicite pour éviter de récupérer des colonnes inutiles:

```sql
SELECT r.id, r.contact_id, r.sequence_id, r.statut, r.sujet, r.corps,
       r.date_programmation, r.date_envoi, r.valide,
       c.nom, c.prenom, c.email as contact_email
FROM relances r
JOIN contacts c ON r.contact_id = c.id
WHERE r.statut IN ('pret pour envoi', 'planifiee')
  AND (r.date_programmation IS NULL OR r.date_programmation <= datetime('now'))
  AND r.valide = 1
```

### 5. Vérifier l'implémentation de `getSmtpProfileDefault()`
S'assurer que cette méthode implémente correctement:
```sql
SELECT * FROM smtp_profiles WHERE is_default = 1 AND actif = 1 LIMIT 1
```

## Vérifications complémentaires effectuées

### Compatibilité des types
| Colonne | Type schema | Utilisation workflow | Compatible |
|---------|-------------|----------------------|------------|
| relances.date_programmation | TEXT | Comparaison avec datetime('now') | ✓ Oui (ISO 8601) |
| relances.date_envoi | TEXT | new Date().toISOString() | ✓ Oui |
| relances.valide | INTEGER DEFAULT 0 | = 1 | ✓ Oui |
| impayes.facture_soldee | INTEGER DEFAULT 0 | = 0 | ✓ Oui |
| impayes.email_index | INTEGER DEFAULT 0 | Incrémentation | ✓ Oui |
| smtp_profiles.port | INTEGER NOT NULL DEFAULT 587 | Transport nodemailer | ✓ Oui |
| smtp_profiles.secure | INTEGER DEFAULT 0 | === 1 | ✓ Oui |
| smtp_profiles.actif | INTEGER DEFAULT 1 | Filtrage | ✓ Oui |

### Conclusion globale
Le workflow est **fonctionnellement cohérent** avec le schéma de base de données. Les problèmes identifiés concernent principalement la **documentation incomplète** plutôt que des incohérences techniques. Les requêtes SQL sont valides et respectent les contraintes du schéma.
