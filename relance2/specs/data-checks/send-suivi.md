# Data Check: send-suivi.md

## Résumé
- Workflow analysé: `workflows/backend/send-suivi.md`
- Status: ✗ Problèmes trouvés
- Tables identifiées: 3

## Tables Utilisées

| Table | Colonnes utilisées | Existe dans schema | Validité |
|-------|-------------------|-------------------|----------|
| relances | `*`, `contact_id`, `sequence_id`, `statut`, `date_programmation` | ✓ Oui | ⚠️ Mauvaise table |
| contacts | `id`, `email` | ✓ Oui | ✓ Valide |
| sequences | `id`, `type_sequence` | ✓ Oui | ✓ Valide |

### Table `relances` (Schéma)
```sql
id TEXT PRIMARY KEY
contact_id TEXT NOT NULL REFERENCES contacts(id)
sequence_id TEXT NOT NULL REFERENCES sequences(id)
statut TEXT DEFAULT 'brouillon'
date_envoi TEXT
date_programmation TEXT
sujet TEXT NOT NULL
corps TEXT NOT NULL
email_envoye_a TEXT
valide INTEGER DEFAULT 0
manuelle INTEGER DEFAULT 0
created_at TEXT NOT NULL
updated_at TEXT NOT NULL
smtp_profile_id TEXT REFERENCES smtp_profiles(id)
cc TEXT
scenario TEXT
email_index INTEGER
email_sent INTEGER DEFAULT 0
erreur_count INTEGER DEFAULT 0
last_error TEXT
```

### Table `suivis` (Schéma) - **Table appropriée**
```sql
id TEXT PRIMARY KEY
statut TEXT
format TEXT
email_index INTEGER
valide INTEGER
manuelle INTEGER
corps TEXT
objet TEXT
emailSent INTEGER
created_at TEXT
updated_at TEXT
contact_id TEXT REFERENCES contacts(id)  -- FK OK
sequence_id TEXT REFERENCES sequences(id)  -- FK OK
smtp_profile_id TEXT REFERENCES smtp_profiles(id)
date_envoi TEXT
date_programmation TEXT
sujet TEXT
cc TEXT
scenario TEXT
email_sent INTEGER DEFAULT 0
erreur_count INTEGER DEFAULT 0
last_error TEXT
```

## Requêtes SQL Analysées

| Type | Tables | Colonnes | Conformité |
|------|--------|----------|------------|
| SELECT | relances, contacts, sequences | r.*, c.email, s.type_sequence | ✗ Mauvaise table cible |

**Requête analysée:**
```javascript
SELECT r.*, c.email
FROM relances r
JOIN contacts c ON r.contact_id = c.id
JOIN sequences s ON r.sequence_id = s.id
WHERE s.type_sequence = 'suivi'
  AND r.statut IN ('pret pour envoi', 'planifiee')
  AND (r.date_programmation IS NULL OR r.date_programmation <= datetime('now'))
```

## Vérifications

- [x] Tables existent dans schema.sql
- [x] Colonnes existent
- [x] Types de données cohérents
- [x] Foreign keys valides (sur `relances` et `suivis`)
- [x] Contraintes respectées
- [ ] **Table correcte utilisée** ✗

## Problèmes Identifiés

### ⚠️ PROBLÈME MAJEUR: Mauvaise table utilisée

**Description:** Le workflow "send-suivi" interroge la table `relances` au lieu de la table `suivis`.

**Détails:**
- Le workflow filtre sur `s.type_sequence = 'suivi'`
- Mais il interroge `FROM relances r` qui est la table des relances standard
- La table `suivis` existe dans le schéma et contient les mêmes colonnes nécessaires
- La structure de `suivis` inclut: `contact_id`, `sequence_id`, `statut`, `date_programmation`

**Impact:**
- Les emails de suivi ne seront jamais envoyés car la logique métier est incorrecte
- La séparation entre `relances` et `suivis` existe pour gérer deux workflows distincts

**Colonnes présentes dans `suivis` (requises pour la requête):**
| Colonne | Existe dans `suivis` | Type |
|---------|---------------------|------|
| id | ✓ | TEXT PRIMARY KEY |
| contact_id | ✓ | TEXT (FK contacts) |
| sequence_id | ✓ | TEXT (FK sequences) |
| statut | ✓ | TEXT |
| date_programmation | ✓ | TEXT |
| date_envoi | ✓ | TEXT |
| sujet | ✓ | TEXT |
| corps | ✓ | TEXT |
| email_sent | ✓ | INTEGER |
| erreur_count | ✓ | INTEGER |
| last_error | ✓ | TEXT |

### Notes sur les colonnes absentes

La colonne `c.email` provient de `contacts` qui est correctement jointe - pas de problème.

## Recommandations

### Correction immédiate requise

La requête devrait être modifiée pour utiliser la table `suivis`:

```javascript
// ❌ INCORRECT (actuel)
const suivis = db.query(`
  SELECT r.*, c.email
  FROM relances r
  JOIN contacts c ON r.contact_id = c.id
  JOIN sequences s ON r.sequence_id = s.id
  WHERE s.type_sequence = 'suivi'
    AND r.statut IN ('pret pour envoi', 'planifiee')
    AND (r.date_programmation IS NULL OR r.date_programmation <= datetime('now'))
`, []);

// ✅ CORRECT (recommandé)
const suivis = db.query(`
  SELECT s.*, c.email
  FROM suivis s
  JOIN contacts c ON s.contact_id = c.id
  JOIN sequences seq ON s.sequence_id = seq.id
  WHERE seq.type_sequence = 'suivi'
    AND s.statut IN ('pret pour envoi', 'planifiee')
    AND (s.date_programmation IS NULL OR s.date_programmation <= datetime('now'))
`, []);
```

### Alternative si `relances` est intentionnel

Si le workflow est intentionnellement sur `relances` (unicité de la logique), alors:
1. Supprimer le commentaire "Similaire à send-emails mais pour type_sequence = 'suivi'" car c'est trompeur
2. Renommer le workflow en `send-relances-suivi.md` pour éviter la confusion
3. Vérifier si la table `suivis` est réellement utilisée ailleurs

### Structure cohérente des tables

Les deux tables (`relances` et `suivis`) ont des structures quasi-identiques. Si elles doivent rester séparées:
- `relances` : pour les relances de factures (impayés)
- `suivis` : pour les suivis post-location/vente

Cette séparation semble intentionnelle vu la présence de:
- `relance_impayes` (table de jointure)
- `suivi_impayes` (table de jointure)

## Conclusion

Le workflow `send-suivi.md` contient une **erreur de conception** en interrogeant la table `relances` au lieu de `suivis`. Bien que toutes les colonnes référencées existent dans les tables mentionnées, la logique métier est incorrecte pour un workflow de "suivi".

**Priorité:** Haute - Ce bug empêchera l'envoi des emails de suivi.
