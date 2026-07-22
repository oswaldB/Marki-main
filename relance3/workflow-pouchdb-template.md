# Workflow Adapté PouchDB/CouchDB

**Workflow** : `{nom-workflow}`  
**Écran** : `{nom-ecran}.html`  
**Pattern** : Local-First avec réplication live  
**Version** : PouchDB 8.0.1 + CouchDB 3.x

---

## Règles d'Architecture

| # | Règle | Description | Implémentation |
|---|-------|-------------|----------------|
| 1 | **PouchDB local + réplication live** | Database locale + sync automatique | `new PouchDB()` + `db.sync(remoteDB, {live: true, retry: true})` |
| 2 | **Remplacer appels API** | `db.get`, `db.put`, `db.query`, `db.find` au lieu de fetch | Pas de `fetch()` vers backend |
| 3 | **Sync bidirectionnelle** | Changes push (local→remote) et pull (remote→local) | `db.sync()` ou `db.replicate.to/from()` |
| 4 | **Gestion conflits** | `conflicts: true` sur toutes les requêtes | Détection `_conflicts` + résolution manuelle |
| 5 | **Design documents** | Vues Mango CouchDB pour requêtes performantes | `_design/` avec map/reduce |
| 6 | **Pattern local-first** | Lecture locale, écriture locale, réplication auto | Jamais d'appel direct à CouchDB |
| 7 | **Gestion offline/online** | Events `paused`, `active`, `navigator.onLine` | Indicateur visuel + queue différée |
| 8 | **Structure Alpine.js** | `x-data` avec méthodes, computed, lifecycle | `init()`, `destroy()` |
| 9 | **Propriété `syncStatus`** | États: `idle`, `syncing`, `paused`, `error` | Badge visuel + tooltip |
| 10 | **IDs CouchDB** | Utilisation `_id` et `_rev` obligatoires | Mapping `id: doc._id`, `rev: doc._rev` |

---

## Configuration CouchDB

```javascript
const COUCHDB_CONFIG = {
  // URL du serveur CouchDB (avec auth si nécessaire)
  url: 'https://admin:admin@dev.markidiags.com/data',
  
  // Nom de la base de données
  dbName: 'marki_{collection}',
  
  // Options de réplication
  options: {
    live: true,        // Réplication continue (RÈGLE #1, #3)
    retry: true,       // Reconnexion automatique (RÈGLE #3)
    heartbeat: 10000,  // Ping toutes les 10 secondes
    timeout: 30000,    // Timeout après 30 secondes
    batch_size: 100,   // Nombre de docs par batch
    batches_limit: 5   // Limite de batches en parallèle
  },
  
  // Options MangoDB (PouchDB Find)
  findOptions: {
    limit: 1000,
    skip: 0
  }
};
```

---

## Design Documents (RÈGLE #5)

Les vues Mango doivent être créées avant utilisation :

```javascript
const DESIGN_DOCS = [
  {
    _id: '_design/{collection}',
    views: {
      // Vue principale: tous les documents par type
      by_type: {
        map: function(doc) {
          if (doc.type === '{type}') {
            emit(doc._id, doc);
          }
        }.toString()
      },
      
      // Vue par statut pour filtrage
      by_statut: {
        map: function(doc) {
          if (doc.type === '{type}' && doc.statut) {
            emit(doc.statut, doc);
          }
        }.toString()
      },
      
      // Vue par date pour calendriers
      by_date: {
        map: function(doc) {
          if (doc.type === '{type}' && doc.date_{champ}) {
            emit(doc.date_{champ}, doc);
          }
        }.toString()
      },
      
      // Vue par relation (clé étrangère)
      by_{relation}: {
        map: function(doc) {
          if (doc.type === '{type}' && doc.{relation}_id) {
            emit(doc.{relation}_id, doc);
          }
        }.toString()
      },
      
      // Compteur par statut (reduce)
      count_by_statut: {
        map: function(doc) {
          if (doc.type === '{type}' && doc.statut) {
            emit(doc.statut, 1);
          }
        }.toString(),
        reduce: '_sum'
      }
    }
  },
  
  // Index MangoDB pour db.find() (RÈGLE #2)
  {
    _id: '_design/idx_{collection}',
    language: 'query',
    indexes: {
      'idx-statut-date': {
        fields: ['type', 'statut', 'date_{champ}']
      },
      'idx-relation': {
        fields: ['type', '{relation}_id']
      }
    }
  }
];
```

---

## Alpine.js x-data Structure (RÈGLE #8)

```javascript
function {workflow}PouchDBManager() {
  return {
    // ───────────────────────────────────────────────
    // ÉTAT DE BASE (Alpine.js)
    // ───────────────────────────────────────────────
    
    // Données métier
    items: [],
    selectedItem: null,
    editingItem: null,
    
    // États UI
    loading: false,
    saving: false,
    error: null,
    
    // ───────────────────────────────────────────────
    // POUCHDB - BASES DE DONNÉES (RÈGLE #1)
    // ───────────────────────────────────────────────
    
    localDB: null,    // PouchDB local
    remoteDB: null,   // CouchDB distant
    syncHandler: null, // Handler pour cancel sync
    
    // ───────────────────────────────────────────────
    // SYNC STATUS (RÈGLE #9)
    // ───────────────────────────────────────────────
    
    syncStatus: 'idle',   // idle | syncing | paused | error | complete
    isOnline: navigator.onLine,
    lastSync: null,
    
    // ───────────────────────────────────────────────
    // COMPUTED PROPERTIES
    // ───────────────────────────────────────────────
    
    get syncStatusClass() {
      const classes = {
        idle: 'bg-gray-400',
        syncing: 'bg-blue-500 animate-pulse',
        paused: this.isOnline ? 'bg-green-500' : 'bg-yellow-500',
        error: 'bg-red-500',
        complete: 'bg-green-500'
      };
      return classes[this.syncStatus] || classes.idle;
    },
    
    get syncStatusLabel() {
      const labels = {
        idle: 'Initialisation...',
        syncing: 'Synchronisation...',
        paused: this.isOnline ? 'À jour' : 'Hors ligne',
        error: 'Erreur de sync',
        complete: 'Synchronisé'
      };
      return labels[this.syncStatus] || 'Inconnu';
    },
    
    get syncStatusIcon() {
      const icons = {
        idle: '⏳',
        syncing: '🔄',
        paused: this.isOnline ? '✅' : '⚠️',
        error: '❌',
        complete: '✅'
      };
      return icons[this.syncStatus] || '❓';
    },
    
    // ───────────────────────────────────────────────
    // LIFECYCLE
    // ───────────────────────────────────────────────
    
    async init() {
      console.log('[CHECKPOINT] wf-{workflow}-init');
      
      // Initialiser PouchDB (RÈGLE #1)
      await this.initPouchDB();
      
      // Créer les design documents (RÈGLE #5)
      await this.createDesignDocs();
      
      // Démarrer la réplication (RÈGLE #3)
      await this.startReplication();
      
      // Écouter les changements réseau (RÈGLE #7)
      this.setupNetworkListeners();
      
      // Charger les données initiales (RÈGLE #6)
      await this.loadData();
      
      console.log('[CHECKPOINT] wf-{workflow}-ready');
    },
    
    destroy() {
      // Arrêter proprement la réplication
      if (this.syncHandler) {
        this.syncHandler.cancel();
      }
      // Supprimer les listeners
      window.removeEventListener('online', this.handleOnline);
      window.removeEventListener('offline', this.handleOffline);
    },
    
    // ───────────────────────────────────────────────
    // POUCHDB INITIALIZATION (RÈGLE #1)
    // ───────────────────────────────────────────────
    
    async initPouchDB() {
      // Base locale (IndexedDB)
      this.localDB = new PouchDB(COUCHDB_CONFIG.dbName);
      
      // Base distante (CouchDB)
      this.remoteDB = new PouchDB(
        `${COUCHDB_CONFIG.url}/${COUCHDB_CONFIG.dbName}`
      );
      
      // Vérifier la connexion
      try {
        await this.remoteDB.info();
        this.isOnline = true;
      } catch (err) {
        this.isOnline = false;
        console.warn('CouchDB inaccessible, mode offline');
      }
      
      console.log('[CHECKPOINT] wf-{workflow}-pouchdb-ready');
    },
    
    // ───────────────────────────────────────────────
    // DESIGN DOCUMENTS SETUP (RÈGLE #5)
    // ───────────────────────────────────────────────
    
    async createDesignDocs() {
      for (const designDoc of DESIGN_DOCS) {
        try {
          // Vérifier si le design doc existe
          const existing = await this.localDB.get(designDoc._id);
          // Mettre à jour si différent
          if (JSON.stringify(existing.views) !== JSON.stringify(designDoc.views)) {
            await this.localDB.put({
              ...designDoc,
              _rev: existing._rev  // RÈGLE #10
            });
          }
        } catch (err) {
          if (err.status === 404) {
            // Créer le design doc
            await this.localDB.put(designDoc);
          }
        }
      }
      
      // Créer les index MangoDB pour db.find()
      try {
        await this.localDB.createIndex({
          index: { fields: ['type', 'statut', 'date_{champ}'] },
          name: 'idx-statut-date'
        });
      } catch (err) {
        console.warn('Index déjà existant ou erreur:', err);
      }
      
      console.log('[CHECKPOINT] wf-{workflow}-design-docs-created');
    },
    
    // ───────────────────────────────────────────────
    // REPLICATION & SYNC (RÈGLE #3, #7)
    // ───────────────────────────────────────────────
    
    async startReplication() {
      this.syncStatus = 'syncing';
      
      // Sync bidirectionnelle (RÈGLE #3)
      this.syncHandler = this.localDB.sync(this.remoteDB, {
        live: true,      // Continue en arrière-plan
        retry: true,     // Reconnexion automatique
        heartbeat: COUCHDB_CONFIG.options.heartbeat,
        timeout: COUCHDB_CONFIG.options.timeout,
        batch_size: COUCHDB_CONFIG.options.batch_size,
        batches_limit: COUCHDB_CONFIG.options.batches_limit
      })
      .on('change', (info) => {
        // Changements reçus ou envoyés
        if (info.direction === 'pull') {
          console.log('[CHECKPOINT] wf-{workflow}-data-pulled', info.change.docs.length);
          // Rafraîchir si des changements externes
          this.loadData();
        }
        if (info.direction === 'push') {
          console.log('[CHECKPOINT] wf-{workflow}-data-pushed', info.change.docs.length);
        }
      })
      .on('paused', (err) => {
        // Sync en pause (attente ou hors ligne)
        this.syncStatus = err ? 'error' : 'paused';
        if (err) {
          console.warn('Sync paused:', err);
        }
      })
      .on('active', () => {
        // Sync reprend
        this.syncStatus = 'syncing';
        this.isOnline = true;
        console.log('[CHECKPOINT] wf-{workflow}-sync-active');
      })
      .on('denied', (err) => {
        // Document rejeté (permissions)
        console.error('Sync denied:', err);
        this.syncStatus = 'error';
      })
      .on('complete', (info) => {
        // Sync terminée (si live: false)
        this.syncStatus = 'complete';
        this.lastSync = new Date();
        console.log('[CHECKPOINT] wf-{workflow}-sync-complete');
      })
      .on('error', (err) => {
        // Erreur de réplication
        this.syncStatus = 'error';
        this.isOnline = false;
        console.error('Sync error:', err);
        Alpine.store('ui')?.addToast?.('Erreur de synchronisation', 'error');
      });
      
      console.log('[CHECKPOINT] wf-{workflow}-sync-started');
    },
    
    // ───────────────────────────────────────────────
    // NETWORK LISTENERS (RÈGLE #7)
    // ───────────────────────────────────────────────
    
    setupNetworkListeners() {
      this.handleOnline = () => {
        this.isOnline = true;
        console.log('[CHECKPOINT] wf-{workflow}-online');
        // Forcer une sync
        if (this.syncHandler) {
          this.syncHandler.resume();
        }
      };
      
      this.handleOffline = () => {
        this.isOnline = false;
        this.syncStatus = 'paused';
        console.log('[CHECKPOINT] wf-{workflow}-offline');
      };
      
      window.addEventListener('online', this.handleOnline);
      window.addEventListener('offline', this.handleOffline);
    },
    
    // ───────────────────────────────────────────────
    // DATA OPERATIONS (RÈGLE #2, #6, #10)
    // ───────────────────────────────────────────────
    
    async loadData() {
      console.log('[CHECKPOINT] wf-{workflow}-data-loading');
      this.loading = true;
      
      try {
        // Option 1: Requête Mango (db.query) - Performances optimales
        const result = await this.localDB.query('{collection}/by_type', {
          include_docs: true,
          conflicts: true  // RÈGLE #4: Détecter les conflits
        });
        
        // Mapper avec _id et _rev (RÈGLE #10)
        this.items = result.rows.map(row => ({
          ...row.doc,
          id: row.doc._id,
          rev: row.doc._rev,
          hasConflicts: !!(row.doc._conflicts && row.doc._conflicts.length > 0),
          conflictCount: row.doc._conflicts?.length || 0
        }));
        
        // Option 2: Requête MangoDB (db.find) - Pour filtres complexes
        // const result = await this.localDB.find({
        //   selector: {
        //     type: '{type}'
        //   },
        //   sort: [{ _id: 'asc' }]
        // });
        // this.items = result.docs;
        
        console.log('[CHECKPOINT] wf-{workflow}-data-loaded', this.items.length);
      } catch (err) {
        console.error('Erreur chargement:', err);
        this.error = err.message;
      } finally {
        this.loading = false;
      }
    },
    
    async loadByStatut(statut) {
      const result = await this.localDB.query('{collection}/by_statut', {
        key: statut,
        include_docs: true,
        conflicts: true  // RÈGLE #4
      });
      
      return result.rows.map(row => ({
        ...row.doc,
        id: row.doc._id,
        rev: row.doc._rev
      }));
    },
    
    async loadByDateRange(startDate, endDate) {
      const result = await this.localDB.query('{collection}/by_date', {
        startkey: startDate.toISOString(),
        endkey: endDate.toISOString(),
        include_docs: true,
        conflicts: true  // RÈGLE #4
      });
      
      return result.rows.map(row => ({
        ...row.doc,
        id: row.doc._id,
        rev: row.doc._rev
      }));
    },
    
    async getItem(id) {
      // Lecture depuis PouchDB local (RÈGLE #6)
      const doc = await this.localDB.get(id, { conflicts: true });  // RÈGLE #4
      
      return {
        ...doc,
        id: doc._id,
        rev: doc._rev,
        hasConflicts: !!(doc._conflicts && doc._conflicts.length > 0)
      };
    },
    
    async createItem(data) {
      console.log('[CHECKPOINT] wf-{workflow}-create-init');
      this.saving = true;
      
      try {
        // Générer ID CouchDB (RÈGLE #10)
        const id = `{type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const doc = {
          _id: id,  // RÈGLE #10
          type: '{type}',
          ...data,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: Alpine.store('auth')?.user?.id || 'anonymous'
        };
        
        // Écriture locale (RÈGLE #6) - la réplication live sync vers CouchDB
        const result = await this.localDB.put(doc);
        
        console.log('[CHECKPOINT] wf-{workflow}-create-local-done', result);
        
        // Rafraîchir la liste
        await this.loadData();
        
        Alpine.store('ui')?.addToast?.('Créé avec succès', 'success');
        
        return { id: result.id, rev: result.rev, ...doc };
      } catch (err) {
        console.error('Erreur création:', err);
        this.error = err.message;
        Alpine.store('ui')?.addToast?.(err.message, 'error');
        throw err;
      } finally {
        this.saving = false;
      }
    },
    
    async updateItem(id, updates) {
      console.log('[CHECKPOINT] wf-{workflow}-update-init', id);
      this.saving = true;
      
      try {
        // Récupérer le document avec sa révision (RÈGLE #10)
        const doc = await this.localDB.get(id, { conflicts: true });  // RÈGLE #4
        
        // Gérer les conflits avant mise à jour
        if (doc._conflicts && doc._conflicts.length > 0) {
          console.warn('[CHECKPOINT] wf-{workflow}-conflict-detected');
          await this.handleConflict(id, updates);
          return;
        }
        
        const updatedDoc = {
          ...doc,
          ...updates,
          _id: doc._id,      // RÈGLE #10
          _rev: doc._rev,    // RÈGLE #10
          updated_at: new Date().toISOString()
        };
        
        // Nettoyer les propriétés temporaires
        delete updatedDoc.id;
        delete updatedDoc.rev;
        delete updatedDoc.hasConflicts;
        delete updatedDoc.conflictCount;
        
        // Écriture locale (RÈGLE #6)
        const result = await this.localDB.put(updatedDoc);
        
        console.log('[CHECKPOINT] wf-{workflow}-update-local-done', result);
        
        // Rafraîchir
        await this.loadData();
        
        Alpine.store('ui')?.addToast?.('Modifications sauvegardées', 'success');
        
        return result;
      } catch (err) {
        if (err.status === 409) {
          // Conflit de révision (RÈGLE #10)
          console.error('[CHECKPOINT] wf-{workflow}-revision-conflict');
          await this.handleConflict(id, updates);
        } else {
          console.error('Erreur mise à jour:', err);
          this.error = err.message;
          Alpine.store('ui')?.addToast?.(err.message, 'error');
        }
        throw err;
      } finally {
        this.saving = false;
      }
    },
    
    async deleteItem(id) {
      console.log('[CHECKPOINT] wf-{workflow}-delete-init', id);
      
      try {
        // Récupérer avec révision (RÈGLE #10)
        const doc = await this.localDB.get(id, { conflicts: true });  // RÈGLE #4
        
        // Suppression locale (RÈGLE #6)
        const result = await this.localDB.remove(doc._id, doc._rev);
        
        console.log('[CHECKPOINT] wf-{workflow}-delete-local-done');
        
        // Rafraîchir
        await this.loadData();
        
        Alpine.store('ui')?.addToast?.('Supprimé avec succès', 'success');
        
        return result;
      } catch (err) {
        console.error('Erreur suppression:', err);
        this.error = err.message;
        Alpine.store('ui')?.addToast?.(err.message, 'error');
        throw err;
      }
    },
    
    // ───────────────────────────────────────────────
    // CONFLICT HANDLING (RÈGLE #4)
    // ───────────────────────────────────────────────
    
    async handleConflict(docId, localChanges) {
      console.log('[CHECKPOINT] wf-{workflow}-conflict-handling', docId);
      
      try {
        // Récupérer le document avec toutes les révisions conflictuelles
        const doc = await this.localDB.get(docId, { conflicts: true });
        const conflictRevs = doc._conflicts || [];
        
        if (conflictRevs.length === 0) return;
        
        // Récupérer toutes les versions en conflit
        const conflictingDocs = await Promise.all(
          conflictRevs.map(rev => this.localDB.get(docId, { rev }))
        );
        
        console.log('Versions en conflit:', conflictingDocs.length);
        
        // Stratégie de fusion: priorité aux données locales les plus récentes
        const merged = this.mergeConflictVersions(doc, conflictingDocs, localChanges);
        
        // Supprimer les révisions conflictuelles
        for (const rev of conflictRevs) {
          await this.localDB.remove(docId, rev);
        }
        
        // Sauvegarder la version fusionnée
        const result = await this.localDB.put({
          ...merged,
          _id: docId,
          _rev: doc._rev,
          _conflicts_resolved: new Date().toISOString()
        });
        
        Alpine.store('ui')?.addToast?.('Conflit résolu automatiquement', 'warning');
        
        return result;
      } catch (err) {
        console.error('Erreur gestion conflit:', err);
        Alpine.store('ui')?.addToast?.('Conflit nécessite une résolution manuelle', 'error');
        throw err;
      }
    },
    
    mergeConflictVersions(currentDoc, conflictingDocs, localChanges) {
      // Stratégie personnalisée de fusion
      // Par défaut: prendre les valeurs locales, mais conserver l'historique
      return {
        ...currentDoc,
        ...localChanges,
        _conflict_history: [
          ...(currentDoc._conflict_history || []),
          ...conflictingDocs.map(d => ({
            date: d.updated_at || d.created_at,
            data: { ...d }
          }))
        ]
      };
    },
    
    // ───────────────────────────────────────────────
    // BULK OPERATIONS
    // ───────────────────────────────────────────────
    
    async bulkCreate(docs) {
      const docsWithIds = docs.map(data => ({
        _id: `{type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: '{type}',
        ...data,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));
      
      const result = await this.localDB.bulkDocs(docsWithIds);
      await this.loadData();
      return result;
    },
    
    async bulkUpdate(updates) {
      // Récupérer tous les documents
      const ids = updates.map(u => u.id);
      const docs = await this.localDB.allDocs({
        keys: ids,
        include_docs: true
      });
      
      // Mettre à jour avec nouvelles données
      const updatedDocs = docs.rows.map((row, i) => ({
        ...row.doc,
        ...updates[i].data,
        _rev: row.doc._rev,  // RÈGLE #10
        updated_at: new Date().toISOString()
      }));
      
      const result = await this.localDB.bulkDocs(updatedDocs);
      await this.loadData();
      return result;
    },
    
    async bulkDelete(ids) {
      const docs = await this.localDB.allDocs({
        keys: ids,
        include_docs: true
      });
      
      const toDelete = docs.rows.map(row => ({
        _id: row.doc._id,
        _rev: row.doc._rev,  // RÈGLE #10
        _deleted: true
      }));
      
      const result = await this.localDB.bulkDocs(toDelete);
      await this.loadData();
      return result;
    },
    
    // ───────────────────────────────────────────────
    // QUERY METHODS (db.find - RÈGLE #2)
    // ───────────────────────────────────────────────
    
    async findWithFilter(selector, options = {}) {
      const result = await this.localDB.find({
        selector,
        sort: options.sort || [{ _id: 'asc' }],
        limit: options.limit || 1000,
        skip: options.skip || 0
      });
      
      return result.docs.map(doc => ({
        ...doc,
        id: doc._id,
        rev: doc._rev
      }));
    },
    
    async searchByText(field, text) {
      // Recherche textuelle simplifiée (pour recherche avancée, utiliser couchdb-lucene)
      const allDocs = await this.localDB.allDocs({ include_docs: true });
      return allDocs.rows
        .map(r => r.doc)
        .filter(doc => 
          doc.type === '{type}' && 
          doc[field]?.toLowerCase().includes(text.toLowerCase())
        )
        .map(doc => ({ ...doc, id: doc._id, rev: doc._rev }));
    }
  };
}
```

---

## HTML Template (RÈGLE #8, #9)

```html
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{Nom Écran} - PouchDB</title>
  
  <!-- Tailwind CSS -->
  <script src="https://cdn.tailwindcss.com"></script>
  
  <!-- PouchDB -->
  <script src="https://cdn.jsdelivr.net/npm/pouchdb@8.0.1/dist/pouchdb.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/pouchdb@8.0.1/dist/pouchdb.find.min.js"></script>
  
  <!-- Alpine.js -->
  <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>
</head>
<body class="bg-gray-100">
  
  <div x-data="{workflow}PouchDBManager()" x-init="init()" x-on:beforeunload.window="destroy()">
    
    <!-- HEADER avec indicateur de sync (RÈGLE #9) -->
    <header class="bg-white shadow-sm px-6 py-4">
      <div class="flex items-center justify-between">
        <h1 class="text-xl font-bold">{Nom Écran}</h1>
        
        <!-- Indicateur de synchronisation (RÈGLE #9) -->
        <div class="flex items-center gap-4">
          <!-- Statut réseau (RÈGLE #7) -->
          <div class="flex items-center gap-2 text-sm">
            <span class="w-2 h-2 rounded-full" 
                  :class="isOnline ? 'bg-green-500' : 'bg-red-500'"></span>
            <span x-text="isOnline ? 'En ligne' : 'Hors ligne'"></span>
          </div>
          
          <!-- Statut sync (RÈGLE #9) -->
          <div class="flex items-center gap-2 px-3 py-1 rounded-full text-sm text-white transition-all"
               :class="syncStatusClass">
            <span class="w-2 h-2 rounded-full bg-white"
                  :class="{ 'animate-pulse': syncStatus === 'syncing' }"></span>
            <span x-text="syncStatusIcon"></span>
            <span x-text="syncStatusLabel"></span>
          </div>
        </div>
      </div>
    </header>
    
    <!-- MAIN CONTENT -->
    <main class="p-6">
      
      <!-- Loading state -->
      <div x-show="loading" class="text-center py-12">
        <div class="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
        <p class="mt-4 text-gray-600">Chargement...</p>
      </div>
      
      <!-- Error state -->
      <div x-show="error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
        <p x-text="error"></p>
        <button @click="error = null; loadData()" class="text-sm underline mt-2">
          Réessayer
        </button>
      </div>
      
      <!-- Data table -->
      <div x-show="!loading" class="bg-white rounded-lg shadow">
        <div class="p-4 border-b flex justify-between items-center">
          <h2 class="font-semibold">Liste des items</h2>
          <button @click="createItem({ /* data */ })" 
                  :disabled="saving"
                  class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50">
            <span x-show="!saving">+ Nouveau</span>
            <span x-show="saving">Enregistrement...</span>
          </button>
        </div>
        
        <table class="w-full">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-2 text-left">ID</th>
              <th class="px-4 py-2 text-left">Nom</th>
              <th class="px-4 py-2 text-left">Statut</th>
              <th class="px-4 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            <template x-for="item in items" :key="item.id">
              <tr class="border-t hover:bg-gray-50" 
                  :class="{ 'bg-yellow-50': item.hasConflicts }">
                <td class="px-4 py-2 text-sm font-mono" x-text="item.id"></td>
                <td class="px-4 py-2" x-text="item.name || item.nom || '-'">
                  <!-- Badge conflit (RÈGLE #4) -->
                  <span x-show="item.hasConflicts" 
                        class="ml-2 px-2 py-0.5 text-xs bg-yellow-500 text-white rounded"
                        title="Conflit détecté - Résolution nécessaire">
                    ⚠ Conflit
                  </span>
                </td>
                <td class="px-4 py-2">
                  <span class="px-2 py-1 rounded text-sm"
                        :class="{
                          'bg-green-100 text-green-800': item.statut === 'actif',
                          'bg-gray-100 text-gray-800': item.statut === 'inactif'
                        }"
                        x-text="item.statut"></span>
                </td>
                <td class="px-4 py-2 space-x-2">
                  <button @click="selectedItem = item" class="text-blue-600 hover:underline">
                    Voir
                  </button>
                  <button @click="updateItem(item.id, { statut: 'archivé' })" 
                          class="text-orange-600 hover:underline">
                    Archiver
                  </button>
                  <button @click="deleteItem(item.id)" 
                          class="text-red-600 hover:underline">
                    Supprimer
                  </button>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
        
        <div x-show="items.length === 0 && !loading" class="p-8 text-center text-gray-500">
          Aucun élément trouvé
        </div>
      </div>
      
      <!-- Debug info (optionnel) -->
      <div class="mt-8 p-4 bg-gray-800 text-green-400 font-mono text-xs rounded">
        <p><strong>Sync Status:</strong> <span x-text="syncStatus"></span></p>
        <p><strong>Online:</strong> <span x-text="isOnline"></span></p>
        <p><strong>Items:</strong> <span x-text="items.length"></span></p>
        <p><strong>Last Sync:</strong> <span x-text="lastSync || 'Jamais'"></span></p>
      </div>
      
    </main>
    
  </div>
  
  <!-- Script du workflow -->
  <script src="{workflow}-pouchdb.js"></script>
  
</body>
</html>
```

---

## Checkpoints

| Checkpoint | Description |
|------------|-------------|
| `wf-{workflow}-init` | Initialisation du workflow |
| `wf-{workflow}-pouchdb-ready` | PouchDB initialisé |
| `wf-{workflow}-design-docs-created` | Design documents créés/mis à jour |
| `wf-{workflow}-sync-started` | Réplication démarrée |
| `wf-{workflow}-sync-active` | Sync active (changements) |
| `wf-{workflow}-data-loading` | Début chargement données |
| `wf-{workflow}-data-loaded` | Données chargées (count) |
| `wf-{workflow}-data-pulled` | Données reçues du serveur (count) |
| `wf-{workflow}-data-pushed` | Données envoyées au serveur (count) |
| `wf-{workflow}-create-init` | Début création |
| `wf-{workflow}-create-local-done` | Création locale terminée |
| `wf-{workflow}-update-init` | Début mise à jour |
| `wf-{workflow}-update-local-done` | Mise à jour locale terminée |
| `wf-{workflow}-delete-init` | Début suppression |
| `wf-{workflow}-delete-local-done` | Suppression locale terminée |
| `wf-{workflow}-conflict-detected` | Conflit détecté |
| `wf-{workflow}-conflict-handling` | Résolution conflit |
| `wf-{workflow}-revision-conflict` | Erreur 409 (conflit révision) |
| `wf-{workflow}-online` | Connexion réseau rétablie |
| `wf-{workflow}-offline` | Perte connexion réseau |
| `wf-{workflow}-sync-complete` | Sync terminée (si non-live) |
| `wf-{workflow}-ready` | Workflow prêt |

---

## Règles Checklist

- [x] **RÈGLE #1** : PouchDB local + réplication live vers CouchDB
- [x] **RÈGLE #2** : Remplacement des appels API par `db.get`, `db.put`, `db.query`, `db.find`
- [x] **RÈGLE #3** : Sync bidirectionnelle avec `db.sync()` ou `replicate.to/from()`
- [x] **RÈGLE #4** : Gestion des conflits avec `conflicts: true` sur toutes les requêtes
- [x] **RÈGLE #5** : Design documents pour vues Mango (`_design/`)
- [x] **RÈGLE #6** : Pattern local-first (lecture locale, écriture locale, sync auto)
- [x] **RÈGLE #7** : Gestion offline/online avec events `paused`/`active`
- [x] **RÈGLE #8** : Structure Alpine.js `x-data` préservée
- [x] **RÈGLE #9** : Propriété `syncStatus` avec états `idle|syncing|paused|error`
- [x] **RÈGLE #10** : Utilisation systématique de `_id` et `_rev` CouchDB

---

## Dépendances

```html
<!-- PouchDB Core -->
<script src="https://cdn.jsdelivr.net/npm/pouchdb@8.0.1/dist/pouchdb.min.js"></script>

<!-- Plugin Find pour requêtes Mango -->
<script src="https://cdn.jsdelivr.net/npm/pouchdb@8.0.1/dist/pouchdb.find.min.js"></script>

<!-- Alpine.js -->
<script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>
```

---

## Notes d'Implémentation

1. **Local-First** : Toutes les lectures/écritures passent par `localDB`. La réplication se charge du reste.
2. **IDs** : Toujours utiliser `_id` CouchDB (pas d'auto-incrément). Format recommandé: `{type}_{timestamp}_{random}`
3. **Révisions** : Ne jamais oublier `_rev` lors des mises à jour. Récupérer le document d'abord.
4. **Conflits** : Activer `conflicts: true` sur toutes les requêtes de lecture pour détection précoce.
5. **Index** : Créer des index MangoDB pour les requêtes fréquentes (champs `type`, `statut`, dates).
6. **Batch** : Pour bulk operations, utiliser `bulkDocs()` plutôt que N appels `put()` séparés.
