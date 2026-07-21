# Data Check: test-single-suivi.md

## Résumé
- Workflow analysé: test-single-suivi.md
- Status: ✗ Problèmes trouvés (6 problèmes majeurs)
- Tables identifiées: 4

## Tables Utilisées
| Table | Colonnes utilisées | Existe dans schema | Validité |
|-------|-------------------|-------------------|----------|
| sequences | id, type_sequence, nom, emails[], scenarios[] | ✓ Oui | ✗ Problème structure |
| contacts | id, nom, prenom, email, telephone, type_personne | ✓ Oui | ✓ OK |
| impayes | id, payeur_id, facture_soldee, reste_a_payer, apporteur_id, nfacture, date_piece, date_echeance, montant_total | ✓ Oui | ✗ Colonne inexistante |
| smtp_profiles | id, nom, host, port, username, password, email_from, signature_html, secure | ✓ Oui | ✗ Nom colonne différent |

## Requêtes SQL Analysées
| Type | Tables | Colonnes | Conformité |
|------|--------|----------|------------|
| SELECT (read) | sequences | id, type_sequence, nom | ✗ Colonne `emails_json` utilisée comme array |
| SELECT (read) | contacts | id, nom, prenom, email, telephone, type_personne | ✓ OK |
| SELECT (query) | impayes | payeur_id, facture_soldee, reste_a_payer | ✗ `payeur_id` → `payer_id` |
| SELECT (read) | smtp_profiles | id, nom, host, port, username, password, email_from, signature_html | ✗ `email_from` → `from_email` |

## Vérifications
- [✓] Tables existent dans schema.sql
- [✗] Colonnes existent (problèmes identifiés)
- [✗] Types de données cohérents (champs JSON utilisés comme objets)
- [✓] Foreign keys valides
- [✗] Contraintes respectées (champs requis manquants)

## Problèmes Identifiés

### 1. Colonne inexistante: `payeur_id` dans `impayes`
**Localisation:** 
```javascript
const impayes = db.query('impayes')
  .where('payeur_id').eq(contactId)  // ← ICI
  .where('facture_soldee').eq(false)
  .where('reste_a_payer').gt(0)
  .data();
```
**Problème:** Le workflow utilise `payeur_id` mais dans schema.sql la colonne s'appelle **`payer_id`**.

**Correction:**
```javascript
.where('payer_id').eq(contactId)
```

---

### 2. Nom de colonne incorrect: `email_from` vs `from_email`
**Localisation:**
```javascript
const smtp = await db.read('smtp_profiles', smtpProfileId);
// ...
from: `"${userName} (Test Suivi)" <${smtp.email_from}>`  // ← ICI
```
**Problème:** Le workflow utilise `email_from` mais dans schema.sql la colonne s'appelle **`from_email`**.

**Correction:**
```javascript
from: `"${userName} (Test Suivi)" <${smtp.from_email}>`
```

---

### 3. Structure JSON mal interprétée: `sequence.emails[]`
**Localisation:**
```javascript
const emailConfig = sequence.emails[emailIndex];  // ← ICI
```
**Problème:** Le workflow traite `emails` comme un array JavaScript, mais dans schema.sql c'est **`emails_json`** (TEXT) qui contient du JSON sérialisé.

**Correction nécessaire:**
```javascript
const emails = JSON.parse(sequence.emails_json || '[]');
const emailConfig = emails[emailIndex];
```

---

### 4. Structure JSON mal interprétée: `emailConfig.scenarios`
**Localisation:**
```javascript
const scenarios = emailConfig.scenarios || [];  // ← ICI (si emailConfig vient de emails_json)
const scenarioActif = scenarios.find(s => s.format === scenarioType && s.active);
```
**Problème:** Même problème que ci-dessus - `scenarios` est dans `emails_json` comme JSON texte.

**Note:** Alternativement, la table `sequences_scenarios` existe avec structure: `id`, `sequence_id`, `email_index`, `format`, `active`, `smtp`, `cc`, `objet`, `corps`. Il faudrait peut-être utiliser cette table plutôt que parser du JSON.

---

### 5. Champ manquant dans contacts: `societe` mentionné mais inexistant
**Localisation:**
```markdown
`contactJson` : données du contact (nom, prenom, civilite, email, telephone, type_personne, **societe**)
```
**Problème:** La documentation mentionne `societe` mais dans schema.sql, `contacts` n'a pas de colonne `societe`. Il y a `activite_societe` et `code`.

**Correction:** Utiliser `activite_societe` ou `code` selon l'intention métier.

---

### 6. Champ `montant_total` inexistant dans `impayes`
**Localisation:**
```javascript
const montantTotal = impayes.reduce((sum, imp) => sum + (imp.reste_a_payer || 0), 0);
// Le workflow mentionne aussi `montant_total` dans impayes
```
**Problème:** Le workflow fait référence à `montant_total` mais dans schema.sql la colonne s'appelle **`montant_ttc`** (ou `total_ht`).

**Correction:** Utiliser `montant_ttc` au lieu de `montant_total`.

---

### 7. Champs optionnels vs requis mal documentés
**Dans `smtp_profiles`:**
- Workflow: `secure` est utilisé (`smtp.secure`)
- Schema: `secure` existe avec DEFAULT 0
- ⚠️ Le workflow suppose que `secure` est un booléen mais c'est INTEGER (0/1)

**Dans `sequences`:**
- Le workflow suppose que `emails_json` contient toujours un array valide
- Pas de vérification de null/undefined avant parsing JSON

---

## Recommandations

### Priorité Haute
1. **Corriger `payeur_id` → `payer_id`** dans la requête impayes - bloquant
2. **Corriger `email_from` → `from_email`** dans l'envoi SMTP - bloquant
3. **Parser `emails_json`** avant d'y accéder comme un array - bloquant
4. **Utiliser `montant_ttc`** au lieu de `montant_total`** - bloquant

### Priorité Moyenne
5. **Clarifier la source des scénarios**: Utiliser la table `sequences_scenarios` plutôt que le JSON dans `emails_json` si possible, ou parser correctement le JSON
6. **Ajouter des guards pour champs optionnels**:
   ```javascript
   const emailFrom = smtp.from_email || smtp.username;
   const signature = smtp.signature_html || '';
   ```

### Priorité Faible
7. **Standardiser les noms de colonnes** dans la documentation pour correspondre au schéma
8. **Ajouter des validations de parsing JSON**:
   ```javascript
   let emails = [];
   try {
     emails = JSON.parse(sequence.emails_json || '[]');
   } catch (e) {
     emails = [];
   }
   ```

### Schéma alternatif suggéré pour les requêtes
Si `db.query()` utilise SQLite/Knex-like:

```javascript
// Correction complète pour impayes
const impayes = db.query('impayes')
  .where('payer_id').eq(contactId)        // ← CORRIGÉ: payer_id
  .where('facture_soldee').eq(0)          // ← NOTE: INTEGER 0/1 pas boolean
  .where('reste_a_payer').gt(0)
  .data();

// Correction pour SMTP
const smtp = await db.read('smtp_profiles', smtpProfileId);
const fromEmail = smtp.from_email;        // ← CORRIGÉ: from_email
```
