# Guide d'Adaptation des Workflows vers PouchDB/CouchDB

Ce guide explique comment adapter n'importe quel workflow existant pour utiliser PouchDB avec réplication CouchDB en temps réel.

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Alpine.js  │◄───►│  PouchDB    │◄───►│  CouchDB    │
│   (UI)      │     │ (IndexedDB) │ Sync│  (Serveur)  │
└─────────────┘     └─────────────┘     └─────────────┘
      │                     │
  Lectures              Écritures
  (local)           (local→remote)
```

## Pattern Local-First

1. **Lectures** : Toujours depuis PouchDB local (pas d'appel réseau)
2. **Écritures** : Vers PouchDB local, qui réplique automatiquement vers CouchDB
3. **Synchronisation** : Bidirectionnelle et continue (`db.sync()`)
4. **Offline** : L'application fonctionne normalement hors ligne

---

## Étapes d'Adaptation

### Étape 1 : Ajouter les dépendances HTML

```html
<!-- Dans le head ou avant vos scripts -->
<script src="https://cdn.jsdelivr.net/npm/pouchdb@8.0.1/dist/pouchdb.min.js"></script>
<script src="shared/pouchdb-service.js"></script> <!-- Optionnel: service partagé -->
```

### Étape 2 : Configuration CouchDB

```javascript
const COUCHDB_CONFIG = {
  url: 'https://admin:password@serveur.com:5984',
  dbName: 'marki_impayes', // Adapter selon le workflow
  options: {
    live: true,      // Réplication continue
    retry: true,     // Retry automatique sur erreur
    heartbeat: 10000 // Ping toutes les 10s
  }
};
```

### Étape 3 : Design Documents (vues CouchDB)

```javascript
const DESIGN_DOCS = [
  {
    _id: '_design/impayes',
    views: {
      all: {
        map: function(doc) {
          if (doc.type === 'impaye') {
            emit(doc._id, doc);
          }
        }.toString()
      },
      by_statut: {
        map: function(doc) {
          if (doc.type === 'impaye' && doc.statut) {
            emit(doc.statut, doc);
          }
        }.toString()
      },
      by_payeur: {
        map: function(doc) {
          if (doc.type === 'impaye' && doc.payeurId) {
            emit(doc.payeurId, doc);
          }
        }.toString()
      }
    }
  },
  {
    _id: '_design/impayes_stats',
    views: {
      stats: {
        map: function(doc) {
          if (doc.type === 'impaye') {
            emit('total', 1);
            if (doc.statut === 'impaye') emit('actifs', 1);
            if (doc.statut === 'suspendu') emit('suspendus', 1);
            if (doc.montantRestant > 0) emit('avec_reste', 1);
          }
        }.toString(),
        reduce: '_count'
      }
    }
  }
];
```

### Étape 4 : États PouchDB dans Alpine.js

Ajouter à l'objet retourné par `x-data` :

```javascript
function impayesManager() {
  return {
    // === DONNÉES ===
    impayes: [],
    filteredImpayes: [],
    
    // === SYNCHRONISATION ===
    syncStatus: 'initial', // 'initial' | 'syncing' | 'paused' | 'error' | 'complete'
    isOnline: navigator.onLine,
    lastSync: null,
    pendingChanges: 0,
    conflicts: [],
    
    // === ÉTAT UI ===
    loading: true,
    saving: false,
    error: null,
    
    // === INSTANCES POUCHDB ===
    localDB: null,
    remoteDB: null,
    syncHandler: null,
    
    // ... reste du workflow
  };
}
```

### Étape 5 : Méthode d'initialisation

```javascript
async init() {
  console.log('[CHECKPOINT] wf-init');
  this.loading = true;
  
  try {
    // Initialiser PouchDB local
    this.localDB = new PouchDB(COUCHDB_CONFIG.dbName);
    
    // Initialiser PouchDB remote (CouchDB)
    const remoteUrl = `${COUCHDB_CONFIG.url}/${COUCHDB_CONFIG.dbName}`;
    this.remoteDB = new PouchDB(remoteUrl, { skip_setup: true });
    
    // Créer les design documents si nécessaire
    await this.ensureDesignDocs();
    
    // Configurer la réplication
    await this.setupReplication();
    
    // Charger les données initiales
    await this.loadImpayes();
    
    // Écouteurs réseau
    this.setupNetworkListeners();
    
    this.loading = false;
    
  } catch (err) {
    console.error('[CHECKPOINT] wf-error', err);
    this.error = err.message;
    this.loading = false;
  }
}
```

### Étape 6 : Créer les Design Documents

```javascript
async ensureDesignDocs() {
  for (const doc of DESIGN_DOCS) {
    try {
      const existing = await this.localDB.get(doc._id);
      // Mettre à jour si les vues ont changé
      if (JSON.stringify(existing.views) !== JSON.stringify(doc.views)) {
        await this.localDB.put({
          ...doc,
          _rev: existing._rev
        });
      }
    } catch (err) {
      if (err.status === 404) {
        await this.localDB.put(doc);
      }
    }
  }
}
```

### Étape 7 : Configuration Réplication Live

```javascript
async setupReplication() {
  this.syncHandler = this.localDB.sync(this.remoteDB, {
    live: COUCHDB_CONFIG.options.live,
    retry: COUCHDB_CONFIG.options.retry,
    heartbeat: COUCHDB_CONFIG.options.heartbeat
  })
  .on('change', (info) => {
    this.pendingChanges = info.change?.pending || 0;
    // Recharger si des changements arrivent du serveur
    if (info.direction === 'pull') {
      this.loadImpayes();
    }
  })
  .on('paused', (err) => {
    this.syncStatus = err ? 'error' : 'paused';
    this.lastSync = new Date().toISOString();
  })
  .on('active', () => {
    this.syncStatus = 'syncing';
    this.isOnline = true;
  })
  .on('error', (err) => {
    this.syncStatus = 'error';
    this.isOnline = false;
  });
}
```

### Étape 8 : Charger les Données (Local-First)

**AVANT (API REST)** :
```javascript
async loadImpayes() {
  const res = await fetch('/api/impayes');
  const data = await res.json();
  this.impayes = data.impayes;
}
```

**APRÈS (PouchDB)** :
```javascript
async loadImpayes() {
  try {
    // Utiliser la vue Mango pour récupérer les impayés
    const result = await this.localDB.query('impayes/by_statut', {
      key: 'impaye',
      include_docs: true,
      conflicts: true // Détecter les conflits
    });
    
    this.impayes = result.rows.map(row => ({
      ...row.doc,
      id: row.doc._id // Alias pour compatibilité
    }));
    
    // Détecter les conflits
    this.conflicts = result.rows
      .filter(row => row.doc._conflicts?.length > 0)
      .map(row => ({
        id: row.doc._id,
        rev: row.doc._rev,
        conflictRevs: row.doc._conflicts
      }));
    
  } catch (err) {
    console.error('Erreur chargement:', err);
    // Fallback: allDocs
    const result = await this.localDB.allDocs({ include_docs: true });
    this.impayes = result.rows
      .filter(r => r.doc.type === 'impaye')
      .map(r => r.doc);
  }
}
```

### Étape 9 : Opérations CRUD

**CRÉER** :
```javascript
async createImpaye(data) {
  const doc = {
    _id: `impaye_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: 'impaye',
    ...data,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  const result = await this.localDB.put(doc);
  // La sync est automatique via setupReplication
  
  return { success: true, id: result.id, rev: result.rev };
}
```

**METTRE À JOUR** :
```javascript
async updateImpaye(id, updates) {
  const doc = await this.localDB.get(id);
  
  const updated = {
    ...doc,
    ...updates,
    updatedAt: new Date().toISOString()
  };
  
  try {
    const result = await this.localDB.put(updated);
    return { success: true, rev: result.rev };
  } catch (err) {
    if (err.status === 409) {
      // Conflit détecté
      return this.handleConflict(id, updates);
    }
    throw err;
  }
}
```

**SUPPRIMER** :
```javascript
async deleteImpaye(id) {
  const doc = await this.localDB.get(id);
  await this.localDB.remove(doc);
  // La sync est automatique
  return { success: true };
}
```

### Étape 10 : Gestion des Conflits

```javascript
async handleConflict(docId, localUpdates) {
  const doc = await this.localDB.get(docId, { conflicts: true });
  const conflictRevs = doc._conflicts || [];
  
  // Récupérer les versions en conflit
  const conflictingDocs = await Promise.all(
    conflictRevs.map(rev => this.localDB.get(docId, { rev }))
  );
  
  // Stratégie: fusionner ou prendre la dernière version
  const merged = {
    ...doc,
    ...localUpdates,
    _conflicts: undefined
  };
  
  // Supprimer les révisions en conflit
  for (const rev of conflictRevs) {
    await this.localDB.remove(docId, rev);
  }
  
  // Sauvegarder le document fusionné
  merged._rev = doc._rev;
  await this.localDB.put(merged);
  
  return { success: true, resolved: true };
}
```

### Étape 11 : Indicateur de Sync dans le HTML

```html
<!-- Indicateur de statut de synchronisation -->
<div class="flex items-center space-x-2" x-data="impayesManager()" x-init="init()">
  <span 
    class="w-3 h-3 rounded-full"
    :class="{
      'bg-green-500': syncStatus === 'complete',
      'bg-blue-500 animate-pulse': syncStatus === 'syncing',
      'bg-yellow-500': syncStatus === 'paused' && isOnline,
      'bg-orange-500': !isOnline,
      'bg-red-500': syncStatus === 'error'
    }"
  ></span>
  
  <span class="text-sm text-gray-600" x-text="syncStatusLabel"></span>
  
  <!-- Nombre de changements en attente -->
  <span x-show="pendingChanges > 0" 
        class="text-xs bg-gray-200 px-2 py-1 rounded"
        x-text="pendingChanges + ' en attente'"></span>
</div>
```

```javascript
get syncStatusLabel() {
  if (!this.isOnline) return 'Hors ligne';
  const labels = {
    syncing: 'Synchronisation...',
    paused: 'À jour',
    error: 'Erreur sync',
    complete: 'Synchronisé'
  };
  return labels[this.syncStatus] || '...';
}
```

### Étape 12 : Écouteurs Réseau

```javascript
setupNetworkListeners() {
  window.addEventListener('online', async () => {
    console.log('[NETWORK] En ligne');
    this.isOnline = true;
    
    // Redémarrer la réplication
    if (this.syncHandler) {
      this.syncHandler.cancel();
    }
    await this.setupReplication();
    
    // Synchroniser les changements en attente
    await this.forceSync();
  });
  
  window.addEventListener('offline', () => {
    console.log('[NETWORK] Hors ligne');
    this.isOnline = false;
  });
}
```

---

## Mapping des Opérations API → PouchDB

| Opération API | PouchDB équivalent |
|---------------|-------------------|
| `GET /api/items` | `db.query('view/all')` ou `db.allDocs()` |
| `GET /api/items/:id` | `db.get(id)` |
| `GET /api/items?filter=x` | `db.find({ selector: { status: 'x' }})` |
| `POST /api/items` | `db.put(doc)` avec `_id` généré |
| `PUT /api/items/:id` | `db.get(id)` puis `db.put(doc)` |
| `DELETE /api/items/:id` | `db.get(id)` puis `db.remove(doc)` |
| `GET /api/stats` | `db.query('stats/view', { reduce: true })` |

---

## Structure des Documents CouchDB

```javascript
{
  // ID CouchDB obligatoire
  _id: "impaye_1234567890_abc",
  
  // Révision CouchDB (auto-générée)
  _rev: "1-abc123def456",
  
  // Type pour filtrage
  type: "impaye",
  
  // Données métier
  numeroFacture: "FAC-2024-001",
  montant: 1500.00,
  montantRestant: 1500.00,
  statut: "impaye",
  payeurId: "contact_123",
  
  // Métadonnées
  createdAt: "2024-01-15T10:30:00Z",
  updatedAt: "2024-01-15T10:30:00Z",
  
  // Conflits (si présents)
  _conflicts: ["2-oldrev", "3-otherrev"]
}
```

---

## Gestion des IDs

CouchDB utilise des IDs string. Conventions recommandées :

```javascript
// Format: {collection}_{timestamp}_{random}
const id = `impaye_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Ou avec préfixe explicite
const id = `contact_${clientId}_${Date.now()}`;

// Ou UUID simple
const id = PouchDB.utils.uuid(); // Si disponible
```

---

## Exemple Complet Adapté: Impayes Load

```javascript
function impayesPouchDBManager() {
  return {
    // === DONNÉES ===
    impayes: [],
    filteredImpayes: [],
    currentPage: 1,
    pageSize: 50,
    totalCount: 0,
    
    // === SYNCHRONISATION ===
    syncStatus: 'initial',
    isOnline: navigator.onLine,
    lastSync: null,
    
    // === ÉTAT UI ===
    loading: true,
    error: null,
    
    // === POUCHDB ===
    localDB: null,
    remoteDB: null,
    syncHandler: null,
    
    // === INITIALISATION ===
    async init() {
      this.loading = true;
      
      // Initialiser PouchDB
      this.localDB = new PouchDB('marki_impayes');
      this.remoteDB = new PouchDB(`${COUCHDB_URL}/marki_impayes`);
      
      // Design docs
      await this.ensureDesignDocs();
      
      // Réplication
      await this.setupReplication();
      
      // Charger données
      await this.loadImpayes();
      
      // Réseau
      this.setupNetworkListeners();
      
      this.loading = false;
    },
    
    // === DESIGN DOCS ===
    async ensureDesignDocs() {
      const designDocs = [
        {
          _id: '_design/impayes',
          views: {
            by_statut: {
              map: function(doc) {
                if (doc.type === 'impaye' && doc.statut) {
                  emit(doc.statut, doc);
                }
              }.toString()
            },
            by_payeur: {
              map: function(doc) {
                if (doc.type === 'impaye' && doc.payeurId) {
                  emit(doc.payeurId, doc);
                }
              }.toString()
            }
          }
        }
      ];
      
      for (const doc of designDocs) {
        try {
          const existing = await this.localDB.get(doc._id);
          await this.localDB.put({ ...doc, _rev: existing._rev });
        } catch (err) {
          if (err.status === 404) {
            await this.localDB.put(doc);
          }
        }
      }
    },
    
    // === RÉPLICATION ===
    async setupReplication() {
      this.syncHandler = this.localDB.sync(this.remoteDB, {
        live: true,
        retry: true
      })
      .on('change', (info) => {
        if (info.direction === 'pull') this.loadImpayes();
      })
      .on('paused', () => this.syncStatus = 'paused')
      .on('active', () => this.syncStatus = 'syncing')
      .on('error', () => this.syncStatus = 'error');
    },
    
    // === CHARGEMENT ===
    async loadImpayes() {
      try {
        const result = await this.localDB.query('impayes/by_statut', {
          key: 'impaye',
          include_docs: true
        });
        
        this.impayes = result.rows.map(r => ({
          ...r.doc,
          id: r.doc._id
        }));
        
        this.totalCount = this.impayes.length;
        this.applyFilters();
        
      } catch (err) {
        // Fallback allDocs
        const result = await this.localDB.allDocs({ include_docs: true });
        this.impayes = result.rows
          .filter(r => r.doc.type === 'impaye')
          .map(r => ({ ...r.doc, id: r.doc._id }));
      }
    },
    
    // === CRUD ===
    async createImpaye(data) {
      const doc = {
        _id: `impaye_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'impaye',
        ...data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      await this.localDB.put(doc);
      return { success: true };
    },
    
    async updateImpaye(id, updates) {
      const doc = await this.localDB.get(id);
      await this.localDB.put({
        ...doc,
        ...updates,
        updatedAt: new Date().toISOString()
      });
      return { success: true };
    },
    
    async suspendImpaye(id, motif) {
      return this.updateImpaye(id, { 
        statut: 'suspendu', 
        motifSuspension: motif 
      });
    },
    
    // === FILTRES ===
    applyFilters() {
      // Pagination + filtres
      const start = (this.currentPage - 1) * this.pageSize;
      this.filteredImpayes = this.impayes.slice(start, start + this.pageSize);
    },
    
    // === RÉSEAU ===
    setupNetworkListeners() {
      window.addEventListener('online', () => {
        this.isOnline = true;
        this.setupReplication();
      });
      window.addEventListener('offline', () => {
        this.isOnline = false;
      });
    }
  };
}
```

---

## Checkpoints PouchDB

Dans les workflows adaptés, utiliser ces checkpoints :

```javascript
/**
 * @checkpoint wf-pouchdb-init
 * @checkpoint wf-pouchdb-db-ready
 * @checkpoint wf-pouchdb-design-docs-ready
 * @checkpoint wf-pouchdb-sync-active
 * @checkpoint wf-pouchdb-data-loaded
 * @checkpoint wf-pouchdb-conflict-detected
 * @checkpoint wf-pouchdb-conflict-resolved
 * @checkpoint wf-pouchdb-offline
 * @checkpoint wf-pouchdb-online
 */
```

---

## Débogage

```javascript
// Activer les logs PouchDB
PouchDB.debug.enable('pouchdb:api');

// Voir les changements en temps réel
this.localDB.changes({ since: 'now', live: true })
  .on('change', console.log);

// Stats de la base
const info = await this.localDB.info();
console.log(info); // { doc_count, update_seq, ... }

// Vérifier les conflits
const conflicts = await this.localDB.allDocs({ conflicts: true });
console.log(conflicts.rows.filter(r => r.value.conflicts));
```

---

## Bonnes Pratiques

1. **Toujours utiliser `_rev`** lors des mises à jour
2. **Gérer les conflits** explicitement pour les données critiques
3. **Utiliser des IDs significatifs** pour faciliter le débogage
4. **Indexer les champs fréquemment recherchés** via des vues Mango
5. **Limiter la taille des documents** (< 1MB)
6. **Nettoyer régulièrement** avec `db.compact()`
7. **Ne jamais exposer les credentials admin** côté client en production
8. **Utiliser HTTPS** obligatoirement
9. **Limiter les permissions** via documents `_security` CouchDB

---

## Ressources

- [PouchDB API Reference](https://pouchdb.com/api.html)
- [CouchDB HTTP API](https://docs.couchdb.org/en/stable/api/index.html)
- [Mango Queries](https://docs.couchdb.org/en/stable/api/database/find.html)
- [Réplication CouchDB](https://docs.couchdb.org/en/stable/replication/protocol.html)
