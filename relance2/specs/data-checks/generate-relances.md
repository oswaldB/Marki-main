# Data Check: generate-relances.md

## Résumé
- Workflow analysé: generate-relances.md
- Status: ✗ Problèmes trouvés
- Tables identifiées: 5

## Tables Utilisées
| Table | Colonnes utilisées | Existe dans schema | Validité |
|-------|-------------------|-------------------|----------|
| impayes | id, payer_id, contact_relance_id, apporteur_id, sequence_id, nfacture, date_echeance, montant_ttc, reste_a_payer, facture_soldee, is_blacklisted, statut | ✓ Oui | ✓ OK |
| contacts | id, is_blacklisted, email | ✓ Oui | ⚠️ Problème* |
| relances | id, contact_id, sequence_id, statut, sujet, corps, date_programmation, valide, manuelle, created_at, updated_at | ✓ Oui | ✓ OK |
| sequences | id, nom, type_sequence, actif, validation_obligatoire | ✓ Oui | ⚠️ Doc incomplète |
| sequences_emails | id, sequence_id, email_index, delai | ✓ Oui | ✓ OK |

\* Le workflow référence `contacts.is_blacklisted` mais cette colonne n'existe pas dans `schema.sql`

## Requêtes SQL Analysées

### Requête 1 : Récupération Impayés Actifs
```sql
SELECT i.*, s.nom as sequence_nom, s.type_sequence
FROM impayes i
JOIN sequences s ON i.sequence_id = s.id
WHERE i.reste_a_payer > 0
  AND i.facture_soldee = 0
  AND i.statut = 'impaye'
  AND s.type_sequence = 'relances'
```

| Aspect | État | Détails |
|--------|------|---------|
| Tables | ✓ | impayes, sequences |
| JOIN | ✓ | sequence_id FK valide |
| Colonnes WHERE | ✓ | reste_a_payer, facture_soldee, statut existent |
| Types compatibles | ✓ | INTEGER vs REAL, TEXT comparables |

### Requête 2 : Lecture Contact (via db.read)
```javascript
db.read('contacts', impaye.contact_relance_id || impaye.payer_id)
```

| Aspect | État | Détails |
|--------|------|---------|
| Table | ✓ | contacts existe |
| Clé primaire | ✓ | id TEXT PRIMARY KEY |
| Filtrage is_blacklisted | ✗ | Colonne inexistante |
| Filtrage email | ✓ | Colonne existe |

### Requête 3 : Sélection Séquence Email
```sql
SELECT delai FROM sequences_emails 
WHERE sequence_id = ? AND email_index = 0
```

| Aspect | État | Détails |
|--------|------|---------|
| Table | ✓ | sequences_emails existe |
| Colonnes WHERE | ✓ | sequence_id, email_index existent |
| FK sequence_id | ✓ | Référence sequences(id) |

### Requête 4 : Lecture Séquence (via db.read)
```javascript
db.read('sequences', group.sequence_id)
```

| Aspect | État | Détails |
|--------|------|---------|
| Table | ✓ | sequences existe |
| Colonne référencée | ✓ | validation_obligatoire existe (INTEGER) |

### Requête 5 : INSERT Relance
```javascript
db.create('relances', {
  id, contact_id, sequence_id, statut, sujet, corps,
  date_programmation, valide, manuelle, created_at, updated_at
})
```

| Aspect | État | Détails |
|--------|------|---------|
| Table | ✓ | relances existe |
| Colonnes obligatoires | ✓ | id, contact_id, sequence_id, sujet, corps, created_at, updated_at |
| Colonnes optionnelles | ✓ | statut (DEFAULT 'brouillon'), valide, manuelle, date_programmation |
| FK contact_id | ✓ | REFERENCES contacts(id) |
| FK sequence_id | ✓ | REFERENCES sequences(id) |

## Vérifications

### Schema impayes
- [x] `id` TEXT PRIMARY KEY
- [x] `payer_id` TEXT REFERENCES contacts(id)
- [x] `contact_relance_id` TEXT REFERENCES contacts(id)
- [x] `apporteur_id` TEXT REFERENCES contacts(id)
- [x] `sequence_id` TEXT REFERENCES sequences(id)
- [x] `nfacture` TEXT NOT NULL
- [x] `date_echeance` TEXT
- [x] `montant_ttc` REAL DEFAULT 0
- [x] `reste_a_payer` REAL DEFAULT 0
- [x] `statut` TEXT DEFAULT 'impaye'
- [x] `is_blacklisted` INTEGER DEFAULT 0
- [x] `facture_soldee` INTEGER DEFAULT 0

### Schema contacts
- [x] `id` TEXT PRIMARY KEY
- [x] `email` TEXT
- [ ] **~`is_blacklisted`~** - N'EXISTE PAS

### Schema relances
- [x] `id` TEXT PRIMARY KEY
- [x] `contact_id` TEXT NOT NULL REFERENCES contacts(id)
- [x] `sequence_id` TEXT NOT NULL REFERENCES sequences(id)
- [x] `statut` TEXT DEFAULT 'brouillon'
- [x] `date_programmation` TEXT
- [x] `sujet` TEXT NOT NULL
- [x] `corps` TEXT NOT NULL
- [x] `valide` INTEGER DEFAULT 0
- [x] `manuelle` INTEGER DEFAULT 0
- [x] `created_at` TEXT NOT NULL
- [x] `updated_at` TEXT NOT NULL

### Schema sequences
- [x] `id` TEXT PRIMARY KEY
- [x] `nom` TEXT NOT NULL
- [x] `type_sequence` TEXT NOT NULL
- [x] `actif` INTEGER DEFAULT 1
- [x] `validation_obligatoire` INTEGER DEFAULT 0
- [!] **Colonnes manquantes dans doc**: niveau, emails_json, regles_json, groupes_regles_json, attribution_automatique, lien_paiement, scenario

### Schema sequences_emails
- [x] `id` TEXT PRIMARY KEY
- [x] `sequence_id` TEXT NOT NULL REFERENCES sequences(id)
- [x] `email_index` INTEGER NOT NULL
- [x] `delai` INTEGER
- [!] **Colonnes manquantes dans doc**: cc, frequence, jour_envoi, heure_envoi, created_at, updated_at

## Problèmes Identifiés

### 🔴 CRITIQUE
1. **Colonne inexistante**: `contacts.is_blacklisted`
   - Le workflow filtre avec `contact.is_blacklisted === 1`
   - La table `contacts` dans schema.sql n'a PAS cette colonne
   - Seule la table `impayes` a `is_blacklisted`

### 🟡 WARNING
2. **Documentation incomplète - Table sequences**
   - Colonnes manquantes dans la doc: `niveau`, `emails_json`, `regles_json`, `groupes_regles_json`, `attribution_automatique`, `lien_paiement`, `scenario`

3. **Documentation incomplète - Table sequences_emails**
   - Colonnes manquantes dans la doc: `cc`, `frequence`, `jour_envoi`, `heure_envoi`, `created_at`, `updated_at`

4. **Documentation incomplète - Table impayes**
   - De nombreuses colonnes absentes de la doc: `proprietaire_id`, `donneur_ordre_id`, `locataire_entrant_id`, `locataire_sortant_id`, `notaire_id`, `syndic_id`, `acquereur_id`, `date_facture`, `date_piece`, etc.

### 🟢 INFO
5. **Colonnes supplémentaires dans relances (non utilisées)**
   - `date_envoi`, `email_envoye_a`, `smtp_profile_id`, `cc`, `scenario`, `email_index`, `email_sent`, `erreur_count`, `last_error`
   - Ces colonnes existent dans le schema mais ne sont pas utilisées par le workflow

## Recommandations

### 1. Correction CRITIQUE - Ajouter is_blacklisted à contacts
```sql
-- Option A: Ajouter la colonne si elle doit exister
ALTER TABLE contacts ADD COLUMN is_blacklisted INTEGER DEFAULT 0;
ALTER TABLE contacts ADD COLUMN blacklist_date TEXT;
ALTER TABLE contacts ADD COLUMN blacklist_motif TEXT;
```

```javascript
// Option B: Modifier le workflow pour utiliser impayes.is_blacklisted uniquement
// et/ou implémenter une logique de blacklist différente
```

### 2. Mise à jour de la documentation
Mettre à jour les tableaux "Data Models SQLite" dans le workflow pour inclure:
- Toutes les colonnes réelles du schema
- Les contraintes NOT NULL, DEFAULT, FOREIGN KEY

### 3. Vérification des valeurs de statut
Le workflow utilise `'pret pour envoi'` (avec accent), vérifier si la base attend `'pret pour envoi'` ou `'pret'` sans accent.

### 4. Table de jointion manquante
Le workflow ne crée pas d'entrées dans `relance_impayes` (table de jointure many-to-many), ce qui pourrait poser problème pour tracer quels impayés sont liés à quelle relance.

Recommandation: Ajouter après la création de la relance:
```javascript
for (const impaye of group.impayes) {
  db.query(
    'INSERT INTO relance_impayes (relance_id, impaye_id) VALUES (?, ?)',
    [relanceId, impaye.id]
  );
}
```

---
*Rapport généré le: 2025-01-XX*
*Schema version: schema.sql (lecture seule)*
*Workflow version: generate-relances.md*
