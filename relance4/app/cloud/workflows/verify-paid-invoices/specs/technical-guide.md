# Spécification Technique - Workflow Verify Paid Invoices

## Sommaire
1. [Vue d'ensemble](#vue-densemble)
2. [Modèles de Données](#modèles-de-données)
3. [Étapes du Workflow](#étapes-du-workflow)
4. [Scénarios de Test](#scénarios-de-test)

---

## Vue d'ensemble

**Objectif** : Vérifier et synchroniser le statut de paiement des factures entre la base de données externe SQLite et Parse, puis nettoyer les relances associées.

**Différenciation** : Ce workflow est autonome et ne nécessite pas de données d'entrée. Il :
- Interroge directement la base SQLite pour identifier les factures payées
- Met à jour les objets `Impaye` dans Parse en fonction des données SQLite
- Nettoie automatiquement les relances pour les factures nouvellement soldées

**Entrée** : Aucune (workflow autonome)

**Requiert** : `masterKey` OU utilisateur authentifié

**Sortie** : Objet JSON avec `{ result, cleanup, generation, errors, total }`

**Routes d'exécution** :
- Cloud Function: `Parse.Cloud.run("verifyPaidInvoicesNow")`
- CLI: `node verify-paid-invoices/00-master.js`
- Programmation: `require('./verify-paid-invoices/00-master')`

---

## Modèles de Données

### Commandes cURL de référence

```bash
# Récupération des schémas Parse
curl -X GET "https://dev.markidiags.com/api/parse/schemas" \
  -H "X-Parse-Application-Id: adti-marki" \
  -H "X-Parse-Master-Key: ${PARSE_MASTER_KEY}"

# Vérifier les factures impayées
curl -X GET "https://dev.markidiags.com/api/parse/classes/Impaye" \
  -H "X-Parse-Application-Id: adti-marki" \
  -H "X-Parse-Master-Key: ${PARSE_MASTER_KEY}" \
  -d '{"where":{"facture_soldee":false}}'

# Vérifier les relances
curl -X GET "https://dev.markidiags.com/api/parse/classes/Relance" \
  -H "X-Parse-Application-Id: adti-marki" \
  -H "X-Parse-Master-Key: ${PARSE_MASTER_KEY}"
```

### 1. Classe `Impaye` (Parse)

```javascript
{
  "objectId": String,
  "externe_id": String,         // Référence vers nfacture dans SQLite
  "nfacture": String,           // Numéro de facture
  "reference": String,
  "date_piece": Date,
  "date_echeance": Date,
  "total_ht": Number,
  "total_ttc": Number,
  "montant_total": Number,
  "reste_a_payer": Number,
  "url_pdf": String,
  "facture_soldee": Boolean,    // Statut de paiement dans Parse
  "solde": Boolean,             // Statut soldé global
  "solde_le": Date,             // Date de soldage
  "payeur": Pointer(Contact),   // Référence au payeur
  "createdAt": Date,
  "updatedAt": Date
}
```

### 2. Classe `Relance` (Parse)

```javascript
{
  "objectId": String,
  "impaye": Pointer(Impaye),    // Référence à la facture impayée
  "statut": String,             // "En attente de génération", "pret pour envoi", "Envoyée", "Annulée - facture payée"
  "date_envoi": Date,
  "email": String,
  "objet": String,
  "corps": String,
  "createdAt": Date,
  "updatedAt": Date
}
```

### 3. Classe `Activite` (Parse)

```javascript
{
  "objectId": String,
  "type": String,               // "payment", "error", etc.
  "operation": String,          // Description de l'opération
  "details": String,
  "impaye": Pointer(Impaye),   // Référence optionnelle
  "user": Pointer(User),        // Utilisateur ayant déclenché l'action
  "createdAt": Date
}
```

### 4. Table SQLite `_GCO__GcoPiece`

```sql
-- Structure de la table des factures dans la base SQLite externe
CREATE TABLE _GCO__GcoPiece (
    nfacture TEXT PRIMARY KEY,      -- Numéro de facture (correspond à externe_id dans Impaye)
    facturesoldee INTEGER,          -- 1 = payée, 0 = non payée
    resteapayer REAL,              -- Montant restant à payer (0 = soldée)
    -- autres champs...
);
```

---

## Étapes du Workflow

### Orchestrateur Principal

**Entrée** :
- `trigger`: string (valeur par défaut: "manual")

**Opérations** :
1. Charger les variables d'environnement depuis `.env`
2. Initialiser le SDK Parse
3. Nettoyer le répertoire `logs/` (sauf si `trigger === "test"`)
4. Logger le démarrage du workflow
5. Initialiser l'objet `stats` pour le suivi
6. Exécuter la fonction `verifyPaidInvoicesMaster()`
7. Enregistrer la Cloud Function: `Parse.Cloud.define("verifyPaidInvoicesNow")`

**Sortie** :
```javascript
{
  result: {...},      // Résultats de la vérification
  cleanup: {...},     // Résultats du nettoyage
  generation: {...},  // Résultats de la génération
  errors: [...],      // Liste des erreurs
  total: {...}        // Statistiques globales
}
```

### Vérification des Factures Payées

**Entrée** :
- `trigger`: string (hérité de l'orchestrateur principal)

**Opérations** :

1. **Initialisation** :
   - Vérifier la disponibilité du SDK Parse
   - Déterminer le chemin de la base SQLite (test ou production)
   - Initialiser l'objet `stats`

2. **Connexion SQLite** :
   - Ouvrir la base SQLite avec logique de réessai (3 tentatives max, délai de 1 minute)

3. **Récupération des factures impayées depuis Parse** :
   ```javascript
   // Requête Parse
   const unpaidQuery = new Parse.Query('Impaye');
   unpaidQuery.greaterThan("reste_a_payer", 0);
   unpaidQuery.limit(10000);
   const unpaidInvoices = await unpaidQuery.find();
   ```

4. **Extraction des identifiants externes** :
   - Extraire `nfacture` de chaque `Impaye`

5. **Construction de la requête SQL** :
   ```sql
   SELECT p.nfacture, p.facturesoldee, p.resteapayer
   FROM _GCO__GcoPiece p
   WHERE p.facturesoldee = 1 
     AND p.resteapayer = 0
     AND p.nfacture IN (liste-des-externe_ids)
   ```

6. **Exécution de la requête SQL**

7. **Traitement des factures payées** :
   Pour chaque ligne de résultat SQLite :
   
   a. Ajouter `nfacture` à `stats.invoiceNumbers`
   
   b. Rechercher l'`Impaye` correspondant dans Parse par `externe_id`
   
   c. **Si Impaye non trouvé** :
      - Logger un avertissement
      - Incrémenter `stats.skipped`
   
   d. **Si Impaye trouvé** :
      ```javascript
      impaye.set('facture_soldee', true);
      impaye.set('solde', true);
      impaye.set('solde_le', new Date());
      impaye.set('reste_a_payer', 0);
      await impaye.save(null, { useMasterKey: true });
      ```
      - Incrémenter `stats.updated`
      - Créer une entrée `Activite` pour tracer le paiement
   
   e. **Si erreur lors de la mise à jour** :
      - Ajouter à `stats.errors`
      - Créer une entrée `Activite` avec `operation: "error"`

**Sortie** :
```javascript
{
  updated: Number,        // Nombre de factures mises à jour
  errors: Array,          // Liste des erreurs
  skipped: Number,        // Nombre de factures ignorées
  invoiceNumbers: Array   // Liste des numéros de facture traités
}
```

### Nettoyage des Relances

**Entrée** :
- `trigger`: string (hérité de l'orchestrateur principal)

**Opérations** :

1. **Recherche des factures récemment payées** :
   ```javascript
   const paidQuery = new Parse.Query('Impaye');
   paidQuery.equalTo('facture_soldee', true);
   paidQuery.equalTo('solde', true);
   const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
   paidQuery.greaterThanOrEqualTo('solde_le', twentyFourHoursAgo);
   ```

2. **Nettoyage des relances** :
   Pour chaque `Impaye` payé :
   
   a. Rechercher les `Relance` associées :
   ```javascript
   const relanceQuery = new Parse.Query('Relance');
   relanceQuery.equalTo('impaye', paidImpaye);
   const relances = await relanceQuery.find();
   ```
   
   b. Pour chaque relance trouvée :
      - **Si `statut === "En attente de génération"` OU `"pret pour envoi"`** :
        Supprimer la relance, incrémenter `stats.deleted`
      - **Autre statut** :
        Incrémenter `stats.skipped`

**Sortie** :
```javascript
{
  deleted: Number,   // Nombre de relances supprimées
  updated: Number,   // Nombre de relances mises à jour
  skipped: Number    // Nombre de relances ignorées
}
```
