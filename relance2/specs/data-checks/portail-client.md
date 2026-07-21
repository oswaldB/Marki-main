# Data Check: portail-client.md

## Résumé
- Workflow analysé: `portail-client.md`
- Status: ✓ Cohérent (avec avertissements)
- Tables identifiées: 2

## Tables Utilisées

| Table | Colonnes utilisées | Existe dans schema | Validité |
|-------|-------------------|-------------------|----------|
| contacts | id, nom, prenom | ✓ Oui | ✓ Valide |
| impayes | contact_relance_id, facture_soldee, reste_a_payer | ✓ Oui | ✓ Valide |

### Colonnes détaillées par table

**contacts:**
- `id` (TEXT PRIMARY KEY) - utilisé via `db.read('contacts', contactId)`
- `nom` (TEXT, sans NOT NULL) - utilisé dans la réponse
- `prenom` (TEXT, sans NOT NULL) - utilisé dans la réponse

**impayes:**
- `contact_relance_id` (TEXT, FK → contacts.id) - utilisé dans WHERE
- `facture_soldee` (INTEGER DEFAULT 0) - utilisé dans WHERE
- `reste_a_payer` (REAL DEFAULT 0) - utilisé dans le calcul du total

## Requêtes SQL Analysées

| Type | Tables | Colonnes | Conformité |
|------|--------|----------|------------|
| SELECT | impayes | `*` (toutes) | ⚠️ Partielle |

```sql
SELECT * FROM impayes 
WHERE contact_relance_id = ? 
AND facture_soldee = 0
```

**Analyse de la requête:**
- ✓ Table `impayes` existe
- ✓ Colonne `contact_relance_id` existe et est indexée (FK)
- ✓ Colonne `facture_soldee` existe (INTEGER)
- ⚠️ Utilisation de `SELECT *` - non recommandé en production
- ✓ Clause WHERE utilise des colonnes existantes

## Vérifications

- [x] Tables existent dans schema.sql
  - `contacts` ✓
  - `impayes` ✓

- [x] Colonnes existent
  - `contacts.id`, `contacts.nom`, `contacts.prenom` ✓
  - `impayes.contact_relance_id`, `impayes.facture_soldee`, `impayes.reste_a_payer` ✓

- [x] Types de données cohérents
  - `contact_relance_id` (TEXT) ↔ paramètre attendu (string/contactId) ✓
  - `facture_soldee` (INTEGER) ↔ valeur `0` ✓
  - `reste_a_payer` (REAL) ↔ calcul numérique ✓

- [x] Foreign keys valides
  - `impayes.contact_relance_id` → `contacts(id)` avec ON DELETE... (implicit)

- [⚠️] Contraintes respectées (voir section Problèmes)
  - Aucune violation de contraintes strictes
  - Mais champs optionnels non vérifiés

## Champs Requis vs Optionnels

| Table | Champ | Requis (DB) | Requis (Workflow) | Risque |
|-------|-------|-------------|-------------------|--------|
| contacts | id | ✓ (PK) | ✓ | Aucun |
| contacts | nom | ✗ (nullable) | ✓ (affiché) | Moyen - nom peut être NULL |
| contacts | prenom | ✗ (nullable) | ✓ (affiché) | Moyen - prénom peut être NULL |
| impayes | contact_relance_id | ✗ (nullable) | ✓ (filtre) | Faible - filtre par paramètre |
| impayes | facture_soldee | ✗ (nullable) | ✓ (filtre) | Faible - valeur par défaut 0 |
| impayes | reste_a_payer | ✗ (nullable) | ✓ (calcul) | Faible - valeur par défaut 0 |

## Problèmes Identifiés

### 1. Avertissement: Champs NULL possibles (Sévérité: Faible)
Les colonnes `contacts.nom` et `contacts.prenom` n'ont pas de contrainte `NOT NULL` dans le schéma. Le workflow retourne ces valeurs sans vérification:

```javascript
return {
  contact: { nom: contact.nom, prenom: contact.prenom },  // Peut être null
  // ...
};
```

**Impact:** L'interface pourrait afficher "null" ou un champ vide.

### 2. Avertissement: SELECT * (Sévérité: Faible)
La requête utilise `SELECT *` alors que seules quelques colonnes sont utilisées:

```javascript
const impayes = db.query(`
  SELECT * FROM impayes   -- Toutes les colonnes (80+)
  WHERE contact_relance_id = ? 
  AND facture_soldee = 0
`, [contactId]);
```

**Impact:** Performance réduite, transfert de données inutile.

### 3. Avertissement: Pas de gestion d'erreur sur reste_a_payer (Sévérité: Faible)
```javascript
const totalDu = impayes.reduce((sum, i) => sum + i.reste_a_payer, 0);
```

Si `reste_a_payer` est NULL, le calcul retournera `NaN`.

### 4. Note: Utilisation de db.read (Sévérité: Info)
```javascript
const contact = db.read('contacts', contactId);
```

Cette abstraction n'est pas visible dans schema.sql. Assurez-vous qu'elle équivaut à:
```sql
SELECT * FROM contacts WHERE id = ?
```

## Recommandations

1. **Ajouter une vérification NULL** pour les champs affichés:
```javascript
return {
  contact: { 
    nom: contact.nom || '', 
    prenom: contact.prenom || '' 
  },
  // ...
};
```

2. **Remplacer SELECT * par les colonnes spécifiques**:
```sql
SELECT id, nfacture, date_facture, date_echeance, 
       montant_ttc, reste_a_payer, statut
FROM impayes 
WHERE contact_relance_id = ? 
AND facture_soldee = 0
```

3. **Gérer les valeurs NULL dans le calcul**:
```javascript
const totalDu = impayes.reduce((sum, i) => sum + (i.reste_a_payer || 0), 0);
```

4. **Considérer l'ajout de NOT NULL** sur `contacts.nom` si c'est un cas métier réel.

---

*Rapport généré le: 2025-01-XX*
*Schéma de référence: `/home/ubuntu/marki/relance2/specs/schema.sql`*
*Workflow analysé: `/home/ubuntu/marki/relance2/specs/workflows/backend/portail-client.md`*
