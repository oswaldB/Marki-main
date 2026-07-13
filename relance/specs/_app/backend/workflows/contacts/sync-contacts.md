# Workflow Backend : Synchronisation des Contacts Parse → SQLite

## Objectifs
- Synchroniser les contacts modifiés dans Parse +> il ny' a plus parse mais /home/ubuntu/marki/relance/backend/lib/flat-file-db.js vers la base SQLite externe (`sync.db`)
- Mettre à jour les interlocuteurs dans `_ADN_RG_Interlocuteur` avec les données Parse
- Marquer les contacts synchronisés avec `lastSyncAt`
- Support du mode `dryRun` pour simulation +> supprime le dryRun.

## Process (méga-fonction)

La méga-fonction `syncContactsMaster()` exécute les étapes suivantes :

### Étape 1 : Récupération des Contacts Parse
- Query les contacts avec `source === 'db_externe'` ET `externe_id` existe
- Optionnel : filtre `since` pour les contacts mis à jour depuis une date
- Sélection des champs : `externe_id`, `nom`, `prenom`, `email`, `telephone`, `civilite`, `type_personne`, `adresse`, `code_postal`, `ville`
- Limite : 10 000 contacts

### Étape 2 : Validation des IDs dans SQLite
- Connexion à `SYNC_DB_PATH` (better-sqlite3)
- Vérifier que les `externe_id` existent dans `_ADN_RG_Interlocuteur`
- Retourne un `Set` des IDs valides (pour filtrer les contacts orphelins)

### Étape 3-4 : Mise à jour des Interlocuteurs dans SQLite
- Pour chaque contact valide :
  - Préparer les données à mettre à jour
  - Utiliser `COALESCE` pour ne pas écraser les valeurs SQLite si null dans Parse
  - Mettre à jour `dateMaj` et `parseObjectId`
- Exécution dans une transaction SQL
- Mode `dryRun` : simulation sans modification

### Étape 5 : Marquage des Contacts comme Synchronisés
- Met à jour `lastSyncAt` dans Parse pour les contacts synchronisés avec succès
- Utilise `db.update()` en boucle pour marquer les contacts synchronisés
- Les contacts en échec ne sont pas marqués

### Étape 7 : Logging dans Activite
- Crée un document `Activite` avec :
  - `type: 'sync_contacts_interlocuteurs'`
  - `details`: résumé de la synchro
  - `metadata`: stats complètes

## Data Model

### Collection: `contacts` (Source Parse)
**Stockage:** `/backend/data/contacts/{id}.yml`

| Champ | Type | Filtre | Description |
|-------|------|--------|-------------|
| `id` | string | | ID Parse |
| `source` | string | `=== 'db_externe'` | Source du contact |
| `externe_id` | string | `exists` | ID dans SQLite (clé de liaison) |
| `nom` | string | | Nom |
| `prenom` | string | | Prénom |
| `email` | string | | Email |
| `telephone` | string | | Téléphone |
| `civilite` | string | | Civilité |
| `type_personne` | string | | Type (P/M) |
| `adresse` | string | | Adresse |
| `code_postal` | string | | Code postal |
| `ville` | string | | Ville |
| `lastSyncAt` | ISO date | **Modifié** | Date dernière synchro |

### Table: `_ADN_RG_Interlocuteur` (Destination SQLite)
**Stockage:** `sync.db`

| Champ | Type | Mise à jour | Description |
|-------|------|-------------|-------------|
| `idInterlocuteur` | number | Clé WHERE | ID SQLite (clé primaire) |
| `typePersonne` | string | `COALESCE` | Type personne |
| `nom` | string | `COALESCE` | Nom |
| `prenom` | string | `COALESCE` | Prénom |
| `email` | string | `COALESCE` | Email |
| `telephoneMobile` | string | `COALESCE` | Téléphone |
| `titre` | string | `COALESCE` | Civilité |
| `adresse1` | string | `COALESCE` | Adresse |
| `codePostal` | string | `COALESCE` | Code postal |
| `ville` | string | `COALESCE` | Ville |
| `dateMaj` | ISO date | Oui | Date de mise à jour |
| `parseObjectId` | string | Oui | ID Parse (référence) |

### Collection: `activites` (Log)
**Stockage:** `/backend/data/activites/{id}.yml`

| Champ | Type | Description |
|-------|------|-------------|
| `type` | string | `"sync_contacts_interlocuteurs"` |
| `details` | string | Résumé textuel |
| `metadata` | object | Stats complètes |
| `isSystem` | boolean | `true` |

---

## Organisation des fichiers

```
/backend/
├── sync-contacts/
│   ├── index.js              # Point d'entrée et orchestrateur
│   ├── specs/
│   │   └── spec.md           # Documentation
│   └── logs/                 # Logs quotidiens
│       └── YYYY-MM-DD.log
```

**Chemin complet:** `/backend/sync-contacts/`

---

## Start

### Route
```bash
POST /api/sync/contacts

# cURL - Synchronisation complète
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  "http://adti.api2.markidiags.com/api/sync/contacts"

# cURL - Mode dryRun (simulation)
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"dryRun": true}' \
  "http://adti.api2.markidiags.com/api/sync/contacts"

# cURL - Contact spécifique
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"contactId": "cont_abc123"}' \
  "http://adti.api2.markidiags.com/api/sync/contacts"

# cURL - Depuis une date
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"since": "2026-07-01T00:00:00.000Z"}' \
  "http://adti.api2.markidiags.com/api/sync/contacts"
```

### Cron (toutes les heures)
```javascript
cron.schedule("0 * * * *", () => {
  syncContactsMaster({ trigger: "cron" });
});
```

### CLI
```bash
# Mode normal
node index.js

# Mode dryRun
node index.js --dry-run

# Contact spécifique
node index.js --contact-id=cont_abc123
```

## Process

### index.js
**Objectif :** Orchestrer la synchronisation Parse → SQLite.

#### Operations

**Initialisation**
```javascript
const Database = require('better-sqlite3');
const LOG_DIR = path.join(__dirname, '..', 'logs', 'sync-contacts');

async function log(level, message, data = {}) {
  await fs.mkdir(LOG_DIR, { recursive: true });
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    data,
    workflow: 'sync-contacts'
  };
  const file = path.join(LOG_DIR, `${new Date().toISOString().split('T')[0]}.log`);
  await fs.appendFile(file, JSON.stringify(entry) + '\n');
}
```

**Étape 1 : Récupération Contacts Parse**
```javascript
const contacts = db.query('contacts')
  .where('source').eq('db_externe')
  .where('externe_id').exists()
  .data();

// Filtrage optionnel depuis une date
if (since) {
  contacts = contacts.filter(c => new Date(c.updated_at) > new Date(since));
}

// Filtrage optionnel par contactId
if (contactId) {
  contacts = contacts.filter(c => c.id === contactId || c.externe_id === contactId);
}

await log('info', `${contacts.length} contacts à synchroniser`);
```

**Étape 2 : Validation IDs dans SQLite**
```javascript
const dbPath = process.env.SYNC_DB_PATH || '/home/arthur/adti/sync.db';
const sqliteDb = new Database(dbPath);

const externeIds = contacts.map(c => c.externe_id);
const placeholders = externeIds.map(() => '?').join(',');

const existingRows = sqliteDb.prepare(`
  SELECT idInterlocuteur FROM _ADN_RG_Interlocuteur
  WHERE idInterlocuteur IN (${placeholders})
`).all(externeIds);

const existingIdsSet = new Set(existingRows.map(r => String(r.idInterlocuteur)));

await log('info', `${existingIdsSet.size} contacts trouvés dans sync.db`);
```

**Étape 3-4 : Mise à jour Interlocuteurs**
```javascript
const updatesToApply = [];
const now = new Date().toISOString();

for (const contact of contacts) {
  const externeId = contact.externe_id;
  
  // Ignorer les contacts orphelins (pas dans SQLite)
  if (!existingIdsSet.has(String(externeId))) {
    await log('warn', `Contact orphelin ignoré: ${externeId}`);
    continue;
  }
  
  updatesToApply.push({
    idInterlocuteur: externeId,
    typePersonne: contact.type_personne,
    nom: contact.nom,
    prenom: contact.prenom,
    email: contact.email,
    telephoneMobile: contact.telephone,
    titre: contact.civilite,
    adresse1: contact.adresse,
    codePostal: contact.code_postal,
    ville: contact.ville,
    dateMaj: now,
    parseObjectId: contact.id
  });
}

// Mode dryRun : simulation uniquement
if (dryRun) {
  await log('info', `Mode dryRun: ${updatesToApply.length} mises à jour simulées`);
  return { stats: { updated: updatesToApply.length } };
}

// Préparer la requête UPDATE avec COALESCE
const updateStmt = sqliteDb.prepare(`
  UPDATE _ADN_RG_Interlocuteur SET
    typePersonne = COALESCE(?, typePersonne),
    nom = COALESCE(?, nom),
    prenom = COALESCE(?, prenom),
    email = COALESCE(?, email),
    telephoneMobile = COALESCE(?, telephoneMobile),
    titre = COALESCE(?, titre),
    adresse1 = COALESCE(?, adresse1),
    codePostal = COALESCE(?, codePostal),
    ville = COALESCE(?, ville),
    dateMaj = ?,
    parseObjectId = ?
  WHERE idInterlocuteur = ?
`);

// Exécution en transaction
const transaction = sqliteDb.transaction((updates) => {
  for (const update of updates) {
    try {
      const result = updateStmt.run(
        update.typePersonne,
        update.nom,
        update.prenom,
        update.email,
        update.telephoneMobile,
        update.titre,
        update.adresse1,
        update.codePostal,
        update.ville,
        update.dateMaj,
        update.parseObjectId,
        update.idInterlocuteur
      );
      
      if (result.changes > 0) {
        stats.updated++;
      }
    } catch (err) {
      stats.failed++;
      stats.failedDetails.push({
        idInterlocuteur: update.idInterlocuteur,
        error: err.message
      });
      await log('error', `Échec mise à jour ${update.idInterlocuteur}`, { error: err.message });
    }
  }
});

transaction(updatesToApply);
sqliteDb.close();

await log('info', `${stats.updated} interlocuteurs mis à jour, ${stats.failed} échecs`);
```

**Étape 5 : Marquage Contacts Synchronisés**
```javascript
// Filtrer les contacts en échec
const failedIds = new Set(stats.failedDetails.map(f => String(f.idInterlocuteur)));
const contactsToMark = updatesToApply.filter(u => !failedIds.has(String(u.idInterlocuteur)));

if (contactsToMark.length === 0) {
  await log('info', 'Aucun contact à marquer comme synchronisé');
  return { marked: 0 };
}

const syncTimestamp = new Date();

// Mise à jour en batch
for (const batch of chunk(contactsToMark, 50)) {
  await Promise.all(batch.map(update => 
    db.update('contacts', update.parseObjectId, { lastSyncAt: syncTimestamp.toISOString() })
  ));
}

await log('info', `${contactsToMark.length} contacts marqués comme synchronisés`);

// Fonction utilitaire pour chunk
function chunk(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}
```

**Étape 7 : Logging Activite**
```javascript
await db.create('activites', {
  id: `act_${Date.now()}`,
  type: 'sync_contacts_interlocuteurs',
  details: `Sync contacts Parse → sync.db: ${stats.updated} mis à jour`,
  metadata: {
    updatedInDb: stats.updated,
    failedInDb: stats.failed,
    duration: `${durationMs}ms`,
    dryRun: dryRun
  },
  isSystem: true,
  created_at: new Date().toISOString()
});

await log('info', 'Activité loggée');
```

#### Output
```javascript
{
  "status": 200,
  "data": {
    "success": true,
    "dryRun": false,
    "stats": {
      "contactsLoaded": 1547,
      "updatedInDb": 1545,
      "failedInDb": 2,
      "markedAsSynced": 1545
    },
    "duration": 3200,
    "timestamp": "2026-07-10T14:30:00.000Z",
    "errors": []
  }
}
```

## Error Handling

| Code | Description |
|------|-------------|
| SQLite | Erreur connexion → Erreur fatale |
| SQLite | Échec mise à jour ligne → Logué, continue avec autres |
| Parse | Échec `saveAll` → Logué, stats ajustées |

### Gestion des erreurs
- Les contacts orphelins (pas dans SQLite) sont ignorés avec warning
- Les échecs de mise à jour sont logués mais ne bloquent pas les autres
- Le marquage `lastSyncAt` n'est fait que pour les contacts réussis
- Une activité est toujours créée même en cas d'erreurs partielles
