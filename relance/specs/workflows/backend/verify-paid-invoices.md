# Workflow Backend : Vérification des Factures Payées

## Objectifs
- Vérifier le statut de paiement des factures dans la base SQLite externe
- Mettre à jour les factures payées dans Parse (marquer comme soldées)
- Créer des entrées d'activité pour tracer les paiements
- Nettoyer les relances associées aux factures payées (suppression des relances non envoyées)

## Process (méga-fonction)

La méga-fonction `verifyPaidInvoicesMaster()` orchestre 3 phases :

### Phase 1 : Vérification des Factures Payées (`verifyPaidInvoices`)
1. **Récupération** : Récupère les factures impayées de Parse (`reste_a_payer > 0`)
2. **Extraction** : Extrait les numéros de facture (`nfacture`)
3. **Vérification SQLite** : Exécute une requête SQL pour trouver les factures payées :
   ```sql
   SELECT p.nfacture, p.facturesoldee, p.resteapayer
   FROM _GCO__GcoPiece p
   WHERE p.facturesoldee = 1
     AND p.resteapayer = 0
     AND p.nfacture IN (...)
   ```
4. **Mise à jour Parse** : Pour chaque facture payée :
   - `facture_soldee = true`
   - `solde = true`
   - `solde_le = new Date()`
   - `reste_a_payer = 0`
5. **Logging** : Crée une entrée `Activite` de type "payment"

### Phase 2 : Nettoyage des Relances (Nouvelles Factures Payées)
- Recherche les factures payées depuis le démarrage du workflow (`solde_le >= workflowStartTime`)
- Supprime les relances associées avec statut != "Envoyée"

### Phase 3 : Nettoyage des Relances (Toutes les Factures Payées)
- Recherche TOUTES les factures payées (mode full cleanup)
- Supprime les relances associées avec statut != "Envoyée"
- Permet de nettoyer les relances orphelines restantes

**Différence Phase 2 vs Phase 3 :**

| Phase | Scope | Quand l'exécuter |
|-------|-------|------------------|
| Phase 2 | Uniquement les factures **nouvellement payées** depuis le démarrage du workflow | Traitement normal - nettoie les relances des paiements détectés dans cette exécution |
| Phase 3 | **Toutes** les factures déjà marquées comme payées dans Parse | Cleanup complet - permet de rattraper les relances orphelines oubliées lors d'exécutions précédentes |

**Pourquoi les deux phases ?**
- La Phase 2 est optimisée pour le traitement quotidien : elle ne traite que les nouveaux paiements détectés, ce qui est plus rapide
- La Phase 3 est une sécurité qui s'exécute après pour s'assurer qu'aucune relance n'a été oubliée sur des factures déjà payées (cas edge, erreurs précédentes, etc.)
- Cela évite d'avoir des relances en attente pour des factures déjà payées depuis longtemps

**Gestion des relances multi-impayés :**
Lorsqu'une relance contient plusieurs impayés et qu'un seul est payé :
- Si la relance n'est pas encore envoyée (statut != "Envoyée") : on met à jour le statut de la relance à `"refaire"` (au lieu de la supprimer)
- Cela signifie que la relance doit être régénérée avec les impayés restants
- Si tous les impayés de la relance sont payés : on supprime la relance
## Data Model

### Collection: `impayes`
**Stockage:** `/backend/data/impayes/{id}.yml`

| Champ | Type | Description |
|-------|------|-------------|
| `id` | string | Identifiant |
| `nfacture` | string | Numéro de facture (clé de liaison avec SQLite) |
| `reste_a_payer` | number | **Filtre**: > 0 pour récupération, mis à jour à 0 si payé |
| `facture_soldee` | boolean | **Modifié**: `true` si payée dans SQLite |
| `solde` | boolean | **Modifié**: `true` si payée |
| `solde_le` | ISO date | **Modifié**: date de constatation du paiement |

### Table SQLite: `_GCO__GcoPiece`
**Stockage:** `sync.db`

| Champ | Type | Filtre | Description |
|-------|------|--------|-------------|
| `nfacture` | string | IN (Parse nfactures) | Numéro de facture |
| `facturesoldee` | boolean | `= 1` | Facture soldée dans SQLite |
| `resteapayer` | number | `= 0` | Reste à payer nul |

### Collection: `relances`
**Stockage:** `/backend/data/relances/{id}.yml`

| Champ | Type | Description |
|-------|------|-------------|
| `id` | string | Identifiant |
| `impaye_ids` | string[] | IDs des impayés liés |
| `statut` | RelanceStatut | **Supprimé si**: != "Envoyée" et tous les impayés payés.<br>**Modifié**: `"refaire"` si un impayé payé mais d'autres restants |

### Collection: `activites`
**Stockage:** `/backend/data/activites/{id}.yml`

| Champ | Type | Description |
|-------|------|-------------|
| `type` | string | `"payment"` ou `"error"` ou `"cleanup"` |
| `operation` | string | Description de l'opération |
| `details` | string | Détails (ex: "Invoice 12345 marked as paid") |
| `impaye_id` | string\|null | ID de l'impayé lié |
| `relance_id` | string\|null | ID de la relance concernée (si applicable) |

---

## Organisation des fichiers

```
/backend/
├── verify-paid-invoices/
│   ├── index.js              # Point d'entrée (méga-fonction)
│   ├── logs/                 # Logs quotidiens
│   │   └── YYYY-MM-DD.log
│   └── specs/
│       └── spec.md           # Documentation
```

**Chemin complet:** `/backend/verify-paid-invoices/`

---

## Start

### Route
```bash
POST /functions/verifyPaidInvoicesNow

# cURL
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"trigger": "manual"}' \
  "https://dev.markidiags.com/api/functions/verifyPaidInvoicesNow"
```

### Cron (quotidien)
```javascript
cron.schedule("0 6 * * *", () => {
  verifyPaidInvoicesMaster("cron");
});
```

### CLI
```bash
node index.js manual
```

## Process

### index.js
**Objectif :** Vérifier et synchroniser les paiements depuis SQLite.

#### Operations

**Initialisation**
```javascript
const Database = require('better-sqlite3');
const LOG_DIR = path.join(__dirname, '..', 'logs', 'verify-paid-invoices');

// Initialiser Parse


```

**Phase 1 : Vérification des Factures Payées**
```javascript
// 1. Récupérer les factures impayées de Parse
const unpaidInvoices = db.query('impayes')
  .where('reste_a_payer').gt(0)
  .limit(10000)
  .data();

await log('info', `${unpaidInvoices.length} factures impayées dans Parse`);

// 2. Extraire les numéros de facture
const invoiceNumbers = unpaidInvoices.map(inv => inv.nfacture).filter(Boolean);

// 3. Vérifier dans SQLite
const dbPath = process.env.SYNC_DB_PATH || '/home/arthur/adti/sync.db';
const sqliteDb = new Database(dbPath);

const placeholders = invoiceNumbers.map(() => '?').join(',');
const sql = `
  SELECT p.nfacture, p.facturesoldee, p.resteapayer
  FROM _GCO__GcoPiece p
  WHERE p.facturesoldee = 1
    AND p.resteapayer = 0
    AND p.nfacture IN (${placeholders})
`;

const stmt = sqliteDb.prepare(sql);
const paidInvoicesFromSQLite = stmt.all(...invoiceNumbers);

await log('info', `${paidInvoicesFromSQLite.length} factures payées trouvées dans SQLite`);

// 4. Mettre à jour Parse
for (const row of paidInvoicesFromSQLite) {
  const { nfacture } = row;
  
  // Trouver l'impayé correspondant
  const impaye = unpaidInvoices.find(inv => inv.nfacture === nfacture);
  if (!impaye) {
    await log('warn', `Impayé non trouvé pour nfacture: ${nfacture}`);
    continue;
  }
  
  // Mettre à jour
  await db.update('impayes', impaye.id, {
    facture_soldee: true,
    solde: true,
    solde_le: new Date().toISOString(),
    reste_a_payer: 0
  });
  
  // Créer activité
  await db.create('activites', {
    id: `act_${Date.now()}`,
    type: 'payment',
    operation: 'verifyPaidInvoices - invoice marked as paid',
    details: `Invoice ${nfacture} marked as paid from SQLite verification`,
    impaye_id: impaye.id,
    created_at: new Date().toISOString()
  });
}

sqliteDb.close();
```

**Phase 2 & 3 : Nettoyage des Relances**
```javascript
async function cleanupRelances(fullCleanup = false) {
  // Déterminer les factures payées à traiter
  const paidQuery = db.query('impayes')
    .where('facture_soldee').eq(true)
    .where('solde').eq(true);
  
  // Si pas full cleanup, filtrer uniquement les nouvelles
  if (!fullCleanup) {
    paidQuery = paidQuery.where('solde_le').gte(workflowStartTime);
  }
  
  const paidInvoices = paidQuery.data();
  
  await log('info', `${paidInvoices.length} factures payées à traiter${fullCleanup ? ' (full cleanup)' : ''}`);
  
  for (const paidImpaye of paidInvoices) {
    // Récupérer les relances de cette facture
    const relances = db.query('relances')
      .where('impaye_ids').contains(paidImpaye.id)
      .data();
    
    for (const relance of relances) {
      // Ignorer si déjà envoyée
      if (relance.statut === 'Envoyée') continue;
      
      // Vérifier si la relance contient d'autres impayés non payés
      const autresImpayes = relance.impaye_ids.filter(id => id !== paidImpaye.id);
      const impayesRestants = db.query('impayes')
        .where('id').in(autresImpayes)
        .where('facture_soldee').eq(false)
        .data();
      
      if (impayesRestants.length > 0) {
        // La relance contient encore des impayés non payés
        // Mettre à jour le statut à "refaire" pour régénération
        await db.update('relances', relance.id, { statut: 'refaire' });
        
        await db.create('activites', {
          id: `act_${Date.now()}`,
          type: 'cleanup',
          operation: 'verifyPaidInvoices - relance marked for regeneration',
          details: `Relance ${relance.id} marked as 'refaire' - one impaye paid, ${impayesRestants.length} remaining`,
          impaye_id: paidImpaye.id,
          relance_id: relance.id,
          created_at: new Date().toISOString()
        });
      } else {
        // Tous les impayés de la relance sont payés - supprimer
        await db.delete('relances', relance.id);
        
        await db.create('activites', {
          id: `act_${Date.now()}`,
          type: 'cleanup',
          operation: 'verifyPaidInvoices - relance deleted',
          details: `Relance ${relance.id} deleted - all impayes paid`,
          impaye_id: paidImpaye.id,
          created_at: new Date().toISOString()
        });
      }
    }
  }
}

// Phase 2 : Nouvelles factures payées
await cleanupRelances(false);

// Phase 3 : Toutes les factures payées (full cleanup)
await cleanupRelances(true);
```

#### Output
```javascript
{
  "status": 200,
  "data": {
    "result": {
      "updated": 45,
      "skipped": 2,
      "errors": [],
      "invoiceNumbers": ["47855", "47856", "47857", ...]
    },
    "cleanup": {
      "newlyPaid": { "deleted": 8, "markedRefaire": 4, "skipped": 0 },
      "allPaid": { "deleted": 120, "markedRefaire": 36, "skipped": 23 },
      "deleted": 128,
      "markedRefaire": 40,
      "skipped": 23
    },
    "total": {
      "updatedInvoices": 45,
      "deletedRelances": 128,
      "markedRefaireRelances": 40,
      "skipped": 25,
      "startTime": "2026-07-10T06:00:00.000Z",
      "endTime": "2026-07-10T06:05:32.000Z",
      "durationMs": 332000
    }
  }
}
```

## Error Handling

| Code | Description |
|------|-------------|
| SQLite | Erreur ouverture → Retry 3x avec délai de 60s |
| Parse | Erreur sauvegarde → Loggué, continue avec suivante |
| Activite | Échec création → Loggué, ne bloque pas le workflow |
| Relance | Échec suppression → Loggué, continue avec suivante |

### Retry SQLite
- 3 tentatives avec délai de 60 secondes entre chaque
- Permet de gérer les verrous de base SQLite

## Fonctions Utilitaires

### openDatabaseWithRetry(dbPath, maxRetries, retryDelay)
Ouvre la base SQLite avec logique de retry intégrée.

### createActivite(type, operation, details, impaye)
Crée une entrée d'activité pour tracer les opérations (paiement, erreur, cleanup).
