# Workflow : Synchronisation des données (PouchDB)

## Écran
`dashboard.html`

## Élément déclencheur
Bouton avec `@click="syncData()"`

## Action
Lancer la synchronisation manuelle avec CouchDB et rafraîchir les données locales

## Description
- Déclenche une synchronisation manuelle **PouchDB → CouchDB**
- Affiche un indicateur de progression
- Crée un **event local** dans PouchDB marquant la synchronisation
- Rafraîchit les KPIs et graphiques depuis les données locales PouchDB
- **Ne nécessite plus de backend workflows** - le sync est automatique avec PouchDB

## Architecture PouchDB

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Frontend       │◀───▶│   PouchDB       │◀───▶│   CouchDB       │
│  (Alpine.js)    │     │   (local)       │     │   (distant)     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                       │                       │
         │  syncData()          │  db.sync()           │
         │  (manuel)            │  (bidirectionnel)    │
         │                       │                       │
         │  createEvent()       │  create doc          │
         │  (local)             │  type='event'        │
         │                       │                       │
         │  loadFromLocal()     │  allDocs()           │
         │                       │                       │
```

## Étapes du workflow

```javascript
/**
 * @action Vérifier si une sync est déjà en cours
 * @checkpoint sync-check-done
 * Si syncing === true: return
 */

/**
 * @action Lancer la synchronisation PouchDB bidirectionnelle
 * @checkpoint sync-started, indicateur affiché
 * 
 * Code:
 * // Forcer une sync complète avec CouchDB
 * await db.replicate.to(remoteUrl, { retry: true });
 * await db.replicate.from(remoteUrl, { retry: true });
 * // OU: db.sync(remoteUrl, { live: false, retry: true });
 */

/**
 * @action Créer un event de synchronisation dans PouchDB
 * @checkpoint event-created, event ajouté localement
 * 
 * Code:
 * const eventDoc = {
 *   _id: `event:${uuid()}`,
 *   type: 'event',
 *   event_type: 'sync',
 *   title: 'Synchronisation terminée',
 *   description: 'Synchronisation effectuée avec succès',
 *   created_at: new Date().toISOString(),
 *   metadata: {
 *     user_id: this.user?.id,
 *     timestamp: new Date().toISOString(),
 *     synced_databases: ['factures', 'contacts', 'relances']
 *   }
 * };
 * await dbEvents.put(eventDoc);
 */

/**
 * @action Rafraîchir les données depuis PouchDB local
 * @checkpoint data-refreshed, KPIs et graphiques mis à jour
 * 
 * Note: Les données sont maintenant synchronisées avec CouchDB
 * et disponibles localement dans PouchDB.
 */

/**
 * @action Mettre à jour lastSyncTime
 * @checkpoint sync-time-updated
 */

/**
 * @action Afficher notification de succès
 * @checkpoint notification-shown
 */

/**
 * @action Réinitialiser les états de sync
 * @checkpoint sync-completed
 */
```

## PouchDB Operations

### Synchronisation manuelle

```javascript
async syncData() {
  // Vérifier si déjà en cours
  if (this.syncing) return;
  
  // Mettre à jour les états
  this.syncing = true;
  this.syncProgress = 0;
  this.error = null;
  
  try {
    // Configuration CouchDB distant
    const remoteUrl = 'https://admin:admin@dev.markidiags.com/data/marki';
    
    // Forcer une sync bidirectionnelle complète
    const syncResult = await db.sync(remoteUrl, {
      live: false,      // Sync unique, pas continu
      retry: true       // Réessayer en cas d'erreur
    });
    
    // Mise à jour de la progression
    this.syncProgress = 50;
    
    // Créer un event de synchronisation dans PouchDB
    const eventDoc = {
      _id: `event:${this.generateUUID()}`,
      type: 'event',
      event_type: 'sync',
      title: 'Synchronisation terminée',
      description: 'Synchronisation effectuée avec succès',
      created_at: new Date().toISOString(),
      by_marki: false,
      user_id: this.user?.id,
      user_username: this.user?.username,
      metadata: {
        synced_at: new Date().toISOString(),
        pull_docs: syncResult.pull?.docs_written || 0,
        push_docs: syncResult.push?.docs_written || 0,
        databases: ['factures', 'contacts', 'relances', 'events']
      }
    };
    
    await dbEvents.put(eventDoc);
    this.syncProgress = 75;
    
    // Rafraîchir les données depuis PouchDB local
    await this.loadDataFromPouchDB();
    this.syncProgress = 100;
    
    // Mettre à jour le timestamp
    this.lastSyncTime = new Date().toISOString();
    localStorage.setItem('marki_last_sync', this.lastSyncTime);
    
    // Notification succès
    this.toast('Synchronisation réussie', 'success');
    
  } catch (error) {
    this.error = error.message;
    this.toast(`Erreur de synchronisation: ${error.message}`, 'error');
    
  } finally {
    this.syncing = false;
    setTimeout(() => { this.syncProgress = 0; }, 500);
  }
}
```

### Synchronisation temps réel (déjà configurée)

```javascript
// Dans l'initialisation de l'application
initSync() {
  const remoteUrl = 'https://admin:admin@dev.markidiags.com/data/marki';
  
  // Sync automatique en temps réel (déjà actif)
  db.sync(remoteUrl, {
    live: true,    // Continuer à écouter
    retry: true    // Réessayer si déconnexion
  }).on('change', (info) => {
    console.log('Sync change:', info);
  }).on('paused', (err) => {
    console.log('Sync paused');
  }).on('active', () => {
    console.log('Sync active');
  }).on('denied', (err) => {
    console.error('Sync denied:', err);
  }).on('complete', (info) => {
    console.log('Sync complete:', info);
  }).on('error', (err) => {
    console.error('Sync error:', err);
  });
}
```

## Data Model

**Page Function:** `dashboardPage()`

**Stores Alpine.js:**
- $store.ui
- $store.sync

**Données (depuis PouchDB):**
- `kpis` - calculés depuis PouchDB
- `chartData` - agrégés depuis PouchDB
- `events` - depuis PouchDB (incluant l'event de sync créé)
- `lastSyncTime` - stocké en localStorage

**États UI:**
- `loading` - chargement depuis PouchDB
- `error` - erreur de sync
- `syncing` - synchronisation en cours
- `syncProgress` - pourcentage de progression (0-100)

## State Changes

**Modifications:**
- `syncing` → `true` → `false`
- `syncProgress` → 0 → 50 → 75 → 100
- `lastSyncTime` ← heure de fin de synchronisation
- `events` ← ajout du nouvel event de sync (via PouchDB changes)
- Les données PouchDB sont synchronisées avec CouchDB

## PouchDB Calls

| Action | Méthode | Description |
|--------|---------|-------------|
| Sync bidirectionnel | `db.sync(remoteUrl, { live: false })` | Force une sync manuelle |
| Créer event | `dbEvents.put(doc)` | Crée l'event de fin de sync |
| Charger données | `db.allDocs()` | Rafraîchit depuis PouchDB local |

## Structure de l'event PouchDB

```javascript
{
  "_id": "event:550e8400-...",
  "_rev": "1-abc123...",
  "type": "event",
  "event_type": "sync",
  "title": "Synchronisation terminée",
  "description": "Synchronisation effectuée avec succès",
  "created_at": "2024-01-15T09:45:00Z",
  "by_marki": false,
  "user_id": "user-123",
  "user_username": "john.doe",
  "metadata": {
    "synced_at": "2024-01-15T09:45:00Z",
    "pull_docs": 15,
    "push_docs": 0,
    "databases": ["factures", "contacts", "relances", "events"]
  }
}
```

## Organisation des fichiers

```
frontend/
└── app/
    └── dashboard/
        ├── index.html
        └── js/
            └── sync-data.js
```

### Fichier workflow
- **JS** : `frontend/app/dashboard/js/sync-data.js`

```javascript
// frontend/app/dashboard/js/sync-data.js
export async function syncData() {
  // Implementation avec PouchDB sync
}
```

## Implementation complète

```javascript
async syncData() {
  if (this.syncing) return;
  
  this.syncing = true;
  this.syncProgress = 0;
  this.error = null;
  
  try {
    // Configuration
    const remoteUrl = 'https://admin:admin@dev.markidiags.com/data/marki';
    const remoteEventsUrl = 'https://admin:admin@dev.markidiags.com/data/marki-events';
    
    // Étape 1: Sync bidirectionnel
    this.syncProgress = 25;
    const syncResult = await Promise.all([
      db.sync(remoteUrl, { live: false, retry: true }),
      dbEvents.sync(remoteEventsUrl, { live: false, retry: true })
    ]);
    
    // Étape 2: Créer event de synchronisation
    this.syncProgress = 50;
    const eventDoc = {
      _id: `event:${this.generateUUID()}`,
      type: 'event',
      event_type: 'sync',
      title: 'Synchronisation terminée',
      description: 'Données synchronisées avec le serveur',
      created_at: new Date().toISOString(),
      by_marki: false,
      user_id: this.user?.id,
      user_username: this.user?.username,
      metadata: {
        synced_at: new Date().toISOString(),
        factures_synced: syncResult[0]?.pull?.docs_written || 0,
        events_synced: syncResult[1]?.pull?.docs_written || 0
      }
    };
    
    await dbEvents.put(eventDoc);
    this.syncProgress = 75;
    
    // Étape 3: Rafraîchir les données
    await this.refreshAllData();
    this.syncProgress = 100;
    
    // Mettre à jour le timestamp
    this.lastSyncTime = new Date().toISOString();
    localStorage.setItem('marki_last_sync', this.lastSyncTime);
    
    // Notification
    this.toast('Synchronisation réussie', 'success');
    
  } catch (error) {
    this.error = error.message;
    console.error('Sync error:', error);
    this.toast(`Erreur: ${error.message}`, 'error');
    
  } finally {
    this.syncing = false;
    setTimeout(() => this.syncProgress = 0, 1000);
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

---

## Migration depuis l'ancienne API

| Aspect | Avant (API) | Après (PouchDB) |
|--------|-------------|-----------------|
| Orchestration | `POST /api/workflows/sync-orchestrator` | `db.sync()` directement |
| Étapes backend | import-invoices → verify-paid → regels-attribution | **Plus nécessaire** - CouchDB gère tout |
| Event creation | `POST /api/events` | `dbEvents.put()` local |
| Progression | Réponse API avec steps | Events PouchDB `active`, `paused`, `complete` |
| Latence | ~5-30s (3 workflows backend) | ~1-10s (sync direct) |
| Offline | ❌ Bloquant | ✅ Fonctionne offline, sync reportée |

## Notes importantes

- **Plus besoin de backend workflows** : PouchDB/CouchDB gère la synchronisation nativement
- Le sync est généralement **automatique** avec `live: true`, mais ce workflow permet un sync manuel forcé
- Les conflits de révision sont gérés automatiquement par PouchDB
- Si offline, le sync sera fait automatiquement quand la connexion revient
