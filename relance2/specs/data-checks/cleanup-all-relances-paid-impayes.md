# Data Check: cleanup-all-relances-paid-impayes.md

## Résumé
- **Workflow analysé:** cleanup-all-relances-paid-impayes.md
- **Status:** ✗ Problèmes trouvés
- **Tables identifiées:** 2 (relances, impayes)

---

## Tables Utilisées

| Table | Colonnes utilisées | Existe dans schema | Validité |
|-------|-------------------|-------------------|----------|
| relances | id, statut, contact_id | ✓ Partiel | ✗ Colonne `contact_id` inexistante |
| impayes | contact_relance_id, facture_soldee | ✓ Oui | ✓ Conforme |

### Colonnes détaillées par table

#### Table `relances`
| Colonne workflow | Colonne schema | Type schema | Contraintes | Statut |
|------------------|----------------|-------------|-------------|--------|
| r.id (via r.*) | id | TEXT | PRIMARY KEY | ✓ OK |
| r.statut (via r.*) | statut | TEXT | DEFAULT 'brouillon' | ✓ OK |
| relance.id | id | TEXT | PRIMARY KEY | ✓ OK |
| relance.contact_id | **N'EXISTE PAS** | - | - | ✗ **ERREUR CRITIQUE** |

**Colonnes existantes dans schema:**
- `id` TEXT PRIMARY KEY
- `contact_id` **ABSENT** → La table a `contact_relance_id`? **Non** - à vérifier
- `sequence_id` TEXT NOT NULL REFERENCES sequences(id)
- `statut` TEXT DEFAULT 'brouillon'
- `date_envoi` TEXT
- `date_programmation` TEXT
- `sujet` TEXT NOT NULL
- `corps` TEXT NOT NULL
- `email_envoye_a` TEXT
- `valide` INTEGER DEFAULT 0
- `manuelle` INTEGER DEFAULT 0
- `created_at` TEXT NOT NULL
- `updated_at` TEXT NOT NULL
- `smtp_profile_id` TEXT REFERENCES smtp_profiles(id)
- `cc` TEXT, `scenario` TEXT, `email_index` INTEGER
- `email_sent` INTEGER DEFAULT 0
- `erreur_count` INTEGER DEFAULT 0
- `last_error` TEXT

#### Table `impayes`
| Colonne workflow | Colonne schema | Type schema | Contraintes | Statut |
|------------------|----------------|-------------|-------------|--------|
| contact_relance_id | contact_relance_id | TEXT | REFERENCES contacts(id) | ✓ OK |
| facture_soldee | facture_soldee | INTEGER | DEFAULT 0 | ✓ OK |

---

## Requêtes SQL Analysées

### Requête 1: Sélection des relances actives
```sql
SELECT r.* FROM relances r
WHERE r.statut IN ('brouillon', 'pret pour envoi', 'planifiee')
```

| Aspect | Détail | Conformité |
|--------|--------|------------|
| Type | SELECT | ✓ OK |
| Table | relances | ✓ Existe |
| Colonnes | r.* (toutes) | ✓ Existent |
| Colonne WHERE | statut | ✓ Existe |
| Valeurs statut | 'brouillon', 'pret pour envoi', 'planifiee' | ⚠️ Valeurs à vérifier |

**Note:** La valeur `'pret pour envoi'` contient un espace. Dans le schema, `statut` est TEXT sans contrainte CHECK, donc les valeurs sont libres. Cependant, il faudrait vérifier si ces valeurs correspondent aux valeurs utilisées ailleurs dans l'application.

### Requête 2: Comptage des impayés actifs
```sql
SELECT COUNT(*) as count FROM impayes
WHERE contact_relance_id = ? AND facture_soldee = 0
```

| Aspect | Détail | Conformité |
|--------|--------|------------|
| Type | SELECT avec agrégation | ✓ OK |
| Table | impayes | ✓ Existe |
| Colonnes WHERE | contact_relance_id, facture_soldee | ✓ Existent |
| Type données | contact_relance_id = TEXT, facture_soldee = INTEGER | ✓ Compatible |

### Requête 3: Mise à jour du statut
```javascript
db.update('relances', relance.id, { statut: 'annulee' });
```

| Aspect | Détail | Conformité |
|--------|--------|------------|
| Type | UPDATE | ✓ OK |
| Table | relances | ✓ Existe |
| Colonne SET | statut | ✓ Existe |
| Colonne WHERE | id | ✓ Existe (PRIMARY KEY) |
| Valeur | 'annulee' | ⚠️ Valeur à vérifier |

---

## Vérifications

### Structure du schéma

- [x] **Table `relances`** - Existe dans schema.sql
- [x] **Table `impayes`** - Existe dans schema.sql  
- [x] **Colonne `relances.id`** - Existe (TEXT PRIMARY KEY)
- [x] **Colonne `relances.statut`** - Existe (TEXT DEFAULT 'brouillon')
- [x] **Colonne `impayes.contact_relance_id`** - Existe (TEXT REFERENCES contacts(id))
- [x] **Colonne `impayes.facture_soldee`** - Existe (INTEGER DEFAULT 0)
- [ ] **Colonne `relances.contact_id`** - **N'EXISTE PAS** ⚠️ CRITIQUE

### Contraintes vérifiées

| Contrainte | Table/Colonne | Statut |
|------------|---------------|--------|
| PRIMARY KEY | relances.id | ✓ Respectée |
| PRIMARY KEY | impayes.id | ✓ Existe (non utilisé directement) |
| FOREIGN KEY | impayes.contact_relance_id → contacts(id) | ✓ Valide |
| NOT NULL | (aucune colonne requise n'est null) | ✓ Respecté |
| DEFAULT | statut DEFAULT 'brouillon' | ✓ Considéré |
| DEFAULT | facture_soldee DEFAULT 0 | ✓ Vérifié |

---

## Problèmes Identifiés

### 🔴 ERREUR CRITIQUE

**Colonne inexistante: `relances.contact_id`**

Le workflow utilise `relance.contact_id` pour filtrer les impayés:
```javascript
const impayesActifs = db.query(`
  SELECT COUNT(*) as count FROM impayes
  WHERE contact_relance_id = ? AND facture_soldee = 0
`, [relance.contact_id]);  // ← ICI: relance.contact_id
```

**Problème:** La table `relances` ne contient PAS de colonne `contact_id`.

**Colonnes disponibles dans `relances`:**
- `id` TEXT PRIMARY KEY
- `sequence_id` TEXT NOT NULL REFERENCES sequences(id)
- `statut` TEXT DEFAULT 'brouillon'
- ... (voir liste complète ci-dessus)

**Analyse des relations:**
- La table `impayes` a une colonne `contact_relance_id` qui référence `contacts(id)`
- La table `relances` n'a pas de colonne directe vers contacts
- Il existe une table de liaison `relance_impayes` qui lie `relances` et `impayes`

**La logique actuelle est donc incorrecte.** Le workflow suppose que chaque relance est liée à un contact directement, mais ce n'est pas le cas dans le schéma.

### 🟡 Points d'attention

1. **Valeurs de statut**: Les valeurs `'pret pour envoi'` et `'planifiee'` ne sont pas contraintes par le schema (pas de CHECK constraint). Il faudrait s'assurer qu'elles correspondent aux valeurs utilisées dans l'application.

2. **Valeur 'annulee'**: Le statut `'annulee'` n'a pas de DEFAULT et n'est pas contraint, mais est utilisé dans l'UPDATE.

3. **Relation many-to-many**: Le schéma définit une relation many-to-many via `relance_impayes`, mais le workflow semble supposer une relation one-to-many (via contact_id).

---

## Recommandations

### Pour corriger l'erreur critique

**Option 1: Ajouter la colonne `contact_id` dans la table `relances`**

Si une relance doit effectivement être liée à un contact spécifique (et pas seulement via les impayés), ajouter dans schema.sql:
```sql
ALTER TABLE relances ADD COLUMN contact_id TEXT REFERENCES contacts(id);
```

**⚠️ ATTENTION:** Le fichier schema.sql est en lecture seule. Cette modification doit être demandée à l'équipe responsable.

**Option 2: Modifier la logique du workflow**

Si une relance est liée aux impayés via la table `relance_impayes`, modifier le workflow:

```javascript
async function cleanupRelancesPaid() {
  // Relances actives
  const relances = db.query(`
    SELECT r.* FROM relances r
    WHERE r.statut IN ('brouillon', 'pret pour envoi', 'planifiee')
  `, []);
  
  let annulees = 0;
  
  for (const relance of relances) {
    // Récupérer tous les impayés liés à cette relance
    const impayesRelance = db.query(`
      SELECT i.* FROM impayes i
      JOIN relance_impayes ri ON i.id = ri.impaye_id
      WHERE ri.relance_id = ?
    `, [relance.id]);
    
    // Vérifier s'il reste des impayés non soldés parmi ceux liés
    const impayesNonSoldes = impayesRelance.filter(i => i.facture_soldee === 0);
    
    if (impayesNonSoldes.length === 0) {
      db.update('relances', relance.id, { statut: 'annulee' });
      annulees++;
    }
  }
  
  return { relances_annulees: annulees };
}
```

**Option 3: Si les relances sont liées à un contact via les impayés**

```javascript
for (const relance of relances) {
  // Trouver le contact via la table de liaison
  const contacts = db.query(`
    SELECT DISTINCT i.contact_relance_id 
    FROM impayes i
    JOIN relance_impayes ri ON i.id = ri.impaye_id
    WHERE ri.relance_id = ?
    LIMIT 1
  `, [relance.id]);
  
  if (contacts.length === 0) continue;
  
  const contactId = contacts[0].contact_relance_id;
  
  // Vérifier si ce contact a encore des impayés non soldés
  const impayesActifs = db.query(`
    SELECT COUNT(*) as count FROM impayes
    WHERE contact_relance_id = ? AND facture_soldee = 0
  `, [contactId]);
  
  if (impayesActifs[0].count === 0) {
    db.update('relances', relance.id, { statut: 'annulee' });
    annulees++;
  }
}
```

### Vérifications recommandées

1. **Clarifier la relation métier**: Une relance est-elle liée à un contact directement ou uniquement via les impayés?

2. **Vérifier les valeurs de statut**: S'assurer que `'brouillon'`, `'pret pour envoi'`, `'planifiee'` et `'annulee'` sont les valeurs attendues dans l'application.

3. **Tests d'intégrité**: Si la colonne `contact_id` est ajoutée à `relances`, s'assurer qu'elle est bien peuplée lors de la création des relances.

---

## Résumé des dépendances

```
Workflow: cleanup-all-relances-paid-impayes.md
│
├── Table: relances
│   ├── Utilise: id ✓
│   ├── Utilise: statut ✓
│   └── ❌ Utilise: contact_id (INEXISTANT)
│
└── Table: impayes
    ├── Utilise: contact_relance_id ✓
    └── Utilise: facture_soldee ✓

Table de liaison ignorée: relance_impayes (relance_id, impaye_id)
```

---

*Rapport généré le: 2026-04-02*
*Analyse basée sur schema.sql et workflow backend*
