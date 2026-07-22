# Workflow : Synchronisation des données payeur (PouchDB)

## Écran
`impayes-payeur.html`

## Élément déclencheur
Bouton avec `@click="syncData()"`

## Action
Synchroniser les données impayés depuis CouchDB vers PouchDB local - affichage groupé par payeur

## Description
- Déclenche une synchronisation manuelle **PouchDB → CouchDB**
- Importe les nouvelles factures depuis CouchDB vers PouchDB local
- Met à jour les factures existantes si modification
- Crée un **event local** dans PouchDB marquant la synchronisation
- **Ne nécessite plus de backend workflows** - le sync est automatique avec PouchDB
- Après le reload, les données sont re-groupées par payeur côté client

## Data Model

**Page Function:** `impayesPayeurPage()`

**Données (depuis PouchDB):**
- `payeurs` - liste des payeurs avec leurs impayés (rechargée après sync)
- `syncing` - état de synchronisation
- `syncProgress` - progression (0-100)
- `lastSyncTime` - dernière date de sync
- `db` - instance PouchDB

**États UI:**
- `loading`
- `error`
- `syncing`
- `syncProgress`

## State Changes

**Modifications:**
- `syncing` ← `true` → `false`
- `syncProgress` ← 0 → 100
- `payeurs` ← rechargé depuis PouchDB après sync (regroupé par contact)
- `lastSyncTime` ← date actuelle

## PouchDB Operations

**Action:** Forcer une synchronisation bidirectionnelle avec CouchDB.

**Méthodes utilisées:**
- `db.sync(remoteUrl, { live: false, retry: true })` - Sync manuelle complète
- `dbEvents.put(doc)` - Créer un event de synchronisation



## Organisation des fichiers

```
frontend/
└── app/
    └── impayes-payeur/
        ├── index.html
        ├── components/
        │   └── (composants partagés)
        └── js/
            └── sync-data.js
```

### Fichier principal
- **HTML** : `frontend/app/impayes-payeur/index.html`
- **Point d'entrée** : Initialise la page Alpine.js avec PouchDB

### Fichier workflow
- **JS** : `frontend/app/impayes-payeur/js/sync-data.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/impayes-payeur/js/sync-data.js
export async function syncData() {
  // Implementation avec PouchDB sync
}
```

## Implementation (PouchDB)

```javascript
async syncData() {
  // 1. Check if already syncing
  if (this.syncing) return;
  
  // 2. Set states
  this.syncing = true;
  this.syncProgress = 0;
  this.error = null;
  
  try {
    // 3. Configuration CouchDB
    const remoteUrl = 'https://admin:admin@dev.markidiags.com/data/marki';
    
    // 4. Forcer une sync bidirectionnelle
    this.syncProgress = 25;
    const syncResult = await db.sync(remoteUrl, {
      live: false,  // Sync unique, pas continu
      retry: true   // Réessayer en cas d'erreur
    });
    
    // 5. Progress
    this.syncProgress = 50;
    
    // 6. Créer un event de synchronisation dans PouchDB
    const eventDoc = {
      _id: `event:${this.generateUUID()}`,
      type: 'event',
      event_type: 'sync',
      title: 'Synchronisation impayés par payeur',
      description: `${syncResult.pull?.docs_written || 0} factures importées`,
      created_at: new Date().toISOString(),
      by_marki: false,
      user_id: this.user?.id,
      metadata: {
        synced_at: new Date().toISOString(),
        pull_docs: syncResult.pull?.docs_written || 0,
        push_docs: syncResult.push?.docs_written || 0
      }
    };
    
    await dbEvents.put(eventDoc);
    this.syncProgress = 75;
    
    // 7. Reload payeurs depuis PouchDB (regroupés par contact)
    await this.loadPayeurs();
    this.syncProgress = 100;
    
    // 8. Update timestamp
    this.lastSyncTime = new Date().toISOString();
    localStorage.setItem('marki_last_sync', this.lastSyncTime);
    
    // 9. Notify
    const imported = syncResult.pull?.docs_written || 0;
    this.toast(
      `${imported} facture(s) synchronisée(s)`,
      'success'
    );
    
  } catch (error) {
    this.error = error.message;
    this.toast(`Erreur de synchronisation: ${error.message}`, 'error');
  } finally {
    this.syncing = false;
    setTimeout(() => { this.syncProgress = 0; }, 1000);
  }
}

generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
```

## Sync temps réel (déjà configuré)

```javascript
// Dans l'initialisation de l'application
initSync() {
  const remoteUrl = 'https://admin:admin@dev.markidiags.com/data/marki';
  
  // Sync automatique en temps réel
  db.sync(remoteUrl, {
    live: true,
    retry: true
  }).on('change', (info) => {
    console.log('Sync change:', info);
  }).on('paused', () => {
    console.log('Sync paused');
  }).on('active', () => {
    console.log('Sync active');
  }).on('error', (err) => {
    console.error('Sync error:', err);
  });
}
```

## Structure de l'event PouchDB

```javascript
{
  "_id": "event:550e8400-...",
  "_rev": "1-abc123...",
  "type": "event",
  "event_type": "sync",
  "title": "Synchronisation impayés par payeur",
  "description": "15 factures importées",
  "created_at": "2026-07-21T14:30:00.000Z",
  "by_marki": false,
  "user_id": "user-123",
  "metadata": {
    "synced_at": "2026-07-21T14:30:00.000Z",
    "pull_docs": 15,
    "push_docs": 0
  }
}
```

---

## Migration depuis l'ancienne API

| Aspect | Avant (API) | Après (PouchDB) |
|--------|-------------|-----------------|
| Orchestration | `POST /api/workflows/import-invoices` | `db.sync()` directement |
| Étapes backend | import-invoices → verify-paid | **Plus nécessaire** - CouchDB gère tout |
| Event creation | Backend automatique | `dbEvents.put()` local |
| Progression | Réponse API | Events PouchDB `active`, `paused`, `complete` |
| Tables impactées | `impayes`, `events` | PouchDB `factures`, `events` |
| Regroupement | Backend SQL | Côté client après reload |
| Latence | ~5-30s | ~1-10s |
| Offline | ❌ Bloquant | ✅ Fonctionne offline, sync reportée |

## Notes

- C'est une opération **asynchrone** longue (peut prendre plusieurs secondes)
- La progression peut être affichée via `syncProgress`
- **Différence avec impayes/sync-data.md** : après le reload, les données sont re-groupées par payeur côté client via `loadPayeurs()`
- Le sync est généralement **automatique** avec `live: true`, mais ce workflow permet un sync manuel forcé
