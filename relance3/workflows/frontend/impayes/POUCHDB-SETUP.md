# Guide d'utilisation du Workflow PouchDB + CouchDB

## 📋 Vue d'ensemble

Ce workflow (`initial-load-pouchdb.js`) remplace les appels API directs par une architecture **local-first** avec PouchDB et réplication live vers CouchDB.

## 🏗️ Architecture

```
┌─────────────────┐     ┌─────────────┐     ┌─────────────────┐
│   Alpine.js     │────▶│  PouchDB    │◀───▶│    CouchDB      │
│   (Frontend)    │     │  (Local)    │     │   (Remote)      │
└─────────────────┘     └─────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌─────────────┐
                        │  IndexedDB  │
                        └─────────────┘
```

## ⚡ Fonctionnalités

- ✅ **Local-first** : Toutes les lectures depuis PouchDB local
- ✅ **Sync bidirectionnelle** : Réplication live automatique
- ✅ **Gestion des conflits** : Détection et résolution automatique
- ✅ **Mode offline** : Fonctionne sans connexion
- ✅ **Vues Mango** : Requêtes indexées avec design documents
- ✅ **Pattern _id/_rev** : IDs CouchDB et révisions gérées

## 🚀 Installation

### 1. Dépendances requises

```html
<!-- Dans votre HTML -->
<script src="https://cdn.jsdelivr.net/npm/pouchdb@8.0.1/dist/pouchdb.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/pouchdb@8.0.1/dist/pouchdb.find.min.js"></script>
```

### 2. Configuration CouchDB

Créer la base de données sur votre serveur CouchDB :

```bash
# Créer la base
curl -X PUT http://admin:password@localhost:5984/adti_impayes

# Activer CORS
curl -X PUT http://admin:password@localhost:5984/_node/_local/_config/httpd/enable_cors -d '"true"'
curl -X PUT http://admin:password@localhost:5984/_node/_local/_config/cors/origins -d '"*"'
curl -X PUT http://admin:password@localhost:5984/_node/_local/_config/cors/credentials -d '"true"'
```

### 3. Utilisation du Store

```html
<div x-data="impayesStore" x-init="init()">
  <!-- Status de synchronisation -->
  <div 
    :class="{
      'bg-green-100': syncStatus === 'connected',
      'bg-yellow-100': syncStatus === 'syncing',
      'bg-red-100': syncStatus === 'error',
      'bg-gray-100': syncStatus === 'offline'
    }"
    class="px-3 py-2 rounded">
    <span x-text="{
      'connected': '✅ Synchronisé',
      'syncing': '🔄 Synchronisation...',
      'error': '❌ Erreur de sync',
      'offline': '📵 Hors ligne',
      'initializing': '⏳ Initialisation...'
    }[syncStatus]"></span>
    
    <span x-show="lastSyncAt" class="text-xs"
          x-text="'Dernière: ' + new Date(lastSyncAt).toLocaleTimeString()"></span>
  </div>
  
  <!-- Skeleton loader -->
  <div x-show="skeletonVisible" class="animate-pulse">
    <!-- Votre UI de chargement -->
  </div>
  
  <!-- Table des impayés -->
  <table x-show="!skeletonVisible && !loading">
    <thead>
      <tr>
        <th @click="sortBy('numero')">Numéro <span x-text="filters.orderBy === 'numero' ? (filters.order === 'ASC' ? '↑' : '↓') : ''"></span></th>
        <th @click="sortBy('payeur_nom')">Payeur <span x-text="filters.orderBy === 'payeur_nom' ? (filters.order === 'ASC' ? '↑' : '↓') : ''"></span></th>
        <th @click="sortBy('montant')">Montant <span x-text="filters.orderBy === 'montant' ? (filters.order === 'ASC' ? '↑' : '↓') : ''"></span></th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody>
      <template x-for="impaye in paginatedImpayes" :key="impaye._id">
        <tr :class="{ 'bg-red-50': impaye.blackliste }">
          <td x-text="impaye.numero"></td>
          <td x-text="impaye.payeur_nom"></td>
          <td x-text="impaye.montant"></td>
          <td>
            <button 
              @click="updateImpaye(impaye._id, { 
                blackliste: !impaye.blackliste,
                date_blacklist: !impaye.blackliste ? new Date().toISOString() : null
              })"
              :class="impaye.blackliste ? 'bg-red-500' : 'bg-gray-500'"
              class="px-2 py-1 text-white rounded"
              x-text="impaye.blackliste ? 'Retirer' : 'Blacklister'">
            </button>
          </td>
        </tr>
      </template>
    </tbody>
  </table>
  
  <!-- Pagination -->
  <div x-show="totalPages > 1" class="flex gap-2">
    <button 
      @click="goToPage(currentPage - 1)"
      :disabled="currentPage === 1"
    >Précédent</button>
    
    <span x-text="currentPage + ' / ' + totalPages"></span>
    
    <button 
      @click="goToPage(currentPage + 1)"
      :disabled="currentPage === totalPages"
    >Suivant</button>
  </div>
</div>
```

## 📊 API du Store

### Propriétés d'état

| Propriété | Type | Description |
|-----------|------|-------------|
| `impayes` | Array | Liste complète des impayés (source de vérité) |
| `impayesFiltered` | Array | Liste filtrée pour affichage |
| `syncStatus` | String | `'initializing'`, `'connected'`, `'syncing'`, `'paused'`, `'error'`, `'offline'` |
| `lastSyncAt` | String | ISO date de dernière synchronisation |
| `loading` | Boolean | État de chargement |
| `error` | String | Message d'erreur si présent |

### Méthodes

| Méthode | Description |
|---------|-------------|
| `init()` | Initialiser PouchDB et démarrer la réplication |
| `loadFromLocal()` | Charger depuis PouchDB local (local-first) |
| `updateImpaye(id, changes)` | Mettre à jour un impayé (réplication auto) |
| `createImpaye(data)` | Créer un nouvel impayé |
| `deleteImpaye(id)` | Supprimer un impayé |
| `sortBy(column)` | Trier par colonne |
| `forceSync()` | Forcer une synchronisation manuelle |
| `destroy()` | Nettoyer les ressources |

## 🔄 Événements de Sync

Le store écoute les événements suivants:

```javascript
// Pour recevoir les notifications de sync
window.addEventListener('sync-notification', (e) => {
  console.log('Sync:', e.detail.message, e.detail.status);
});
```

## 🛠️ Design Documents (Vues)

Le workflow crée automatiquement les vues Mango suivantes:

| Vue | Description |
|-----|-------------|
| `by_statut` | Filtrer par statut (impaye/paye) |
| `by_date_echeance` | Trier par date d'échéance |
| `by_montant` | Trier par montant |
| `by_payeur` | Grouper par payeur |
| `stats_global` | Statistiques agrégées |

## 🚨 Gestion des Conflits

Les conflits sont gérés automatiquement avec la stratégie **last-write-wins**:

```javascript
// Dans la méthode handleConflicts()
const winner = allVersions.reduce((latest, current) => {
  const latestDate = new Date(latest.date_modification || latest._rev);
  const currentDate = new Date(current.date_modification || current._rev);
  return currentDate > latestDate ? current : latest;
});
```

## 📝 Migration depuis API REST

### Avant (API REST):
```javascript
// GET /api/impayes
const response = await fetch('/api/impayes?facture_soldee=0');
const data = await response.json();
```

### Après (PouchDB):
```javascript
// Query PouchDB local
const result = await this.db.query('impayes_views/by_statut', {
  key: 'impaye',
  include_docs: true
});
const impayes = result.rows.map(row => row.doc);
```

### Avant (PUT API):
```javascript
// PUT /api/impayes/:id
await fetch(`/api/impayes/${id}`, {
  method: 'PUT',
  body: JSON.stringify(changes)
});
```

### Après (PouchDB):
```javascript
// put() vers PouchDB local (réplication auto)
const doc = await this.db.get(id);
await this.db.put({ ...doc, ...changes, _rev: doc._rev });
```

## 🔧 Configuration avancée

### Authentification CouchDB

```javascript
const POUCHDB_CONFIG = {
  remoteUrl: 'https://couchdb.markidiags.com/adti_impayes',
  // Ajouter auth dans initReplication()
  remoteDb: new PouchDB(POUCHDB_CONFIG.remoteUrl, {
    auth: { username: 'user', password: 'pass' }
  })
};
```

### Options de réplication

```javascript
syncOptions: {
  live: true,      // Réplication continue
  retry: true,   // Retry automatique
  heartbeat: 10000,  // Ping toutes les 10s
  timeout: 30000,    // Timeout 30s
  
  // Filtrer les documents
  filter: function(doc) {
    return doc.type === 'impaye' && !doc._deleted;
  }
}
```

## 🧪 Tests

```javascript
// Tester la connexion
async function testPouchDB() {
  const db = new PouchDB('test');
  await db.put({ _id: 'test_doc', hello: 'world' });
  const doc = await db.get('test_doc');
  console.log('✅ PouchDB OK:', doc);
}

// Tester la réplication
async function testSync() {
  const local = new PouchDB('test');
  const remote = new PouchDB('http://localhost:5984/test');
  
  const sync = local.sync(remote, { live: true });
  sync.on('active', () => console.log('🔄 Sync active'));
  sync.on('paused', () => console.log('⏸️ Sync paused'));
  sync.on('error', (err) => console.error('❌ Sync error:', err));
}
```

## 📚 Ressources

- [Documentation PouchDB](https://pouchdb.com/guides/)
- [API CouchDB](https://docs.couchdb.org/en/stable/api/)
- [CouchDB Replication](https://docs.couchdb.org/en/stable/replication/intro.html)
- [PouchDB + Alpine.js Patterns](https://pouchdb.com/getting-started.html)

---

**Fichier créé**: `initial-load-pouchdb.js`
**Compatibilité**: Alpine.js 3.x + PouchDB 8.x + CouchDB 3.x
