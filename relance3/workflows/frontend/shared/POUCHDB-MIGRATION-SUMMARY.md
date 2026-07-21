# Récapitulatif Migration PouchDB/CouchDB

Ce répertoire contient les fichiers nécessaires pour adapter les workflows frontend à l'architecture PouchDB local-first avec réplication CouchDB.

## 📁 Fichiers créés

| Fichier | Description | Utilisation |
|---------|-------------|-------------|
| `workflow-pouchdb-template.js` | Template complet de workflow PouchDB | Copier et adapter pour chaque workflow |
| `GUIDE-ADAPTATION-POUCHDB.md` | Guide détaillé de migration | Référence pour la migration |
| `example-pouchdb-integration.html` | Exemple HTML complet | Voir l'intégration avec Alpine.js |
| `relances-initial-load-pouchdb.js` | Exemple réel: workflow relances | Référence concrète d'adaptation |

## 🔗 Liens vers fichiers existants

| Fichier | Description |
|---------|-------------|
| `pouchdb-service.js` | Service PouchDB partagé (singleton) |
| `../contacts/contacts-load-all-pouchdb.js` | Exemple: chargement contacts |
| `../contacts/contacts-create-edit-pouchdb.js` | Exemple: CRUD contacts |
| `../contacts/POUCHDB-README.md` | Documentation spécifique contacts |

## 🏗️ Architecture

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│   Frontend      │ ◄─────► │   PouchDB       │ ◄─────► │   CouchDB       │
│   (Alpine.js)   │         │   (IndexedDB)   │  Sync   │   (Serveur)     │
└─────────────────┘         └─────────────────┘  Live   └─────────────────┘
        │                           │                           │
        │                           │                           │
   Lectures                   Écritures                     Autres
   (local)                    (local → remote)              clients
```

## 🚀 Utilisation rapide

### 1. Dans le HTML

```html
<!-- Dépendances -->
<script src="https://cdn.jsdelivr.net/npm/pouchdb@8.0.1/dist/pouchdb.min.js"></script>

<!-- Optionnel: service partagé -->
<script src="shared/pouchdb-service.js"></script>

<!-- Votre workflow adapté -->
<script src="workflows/votre-workflow-pouchdb.js"></script>
```

### 2. Alpine.js x-data

```html
<div x-data="votreWorkflowPouchDBManager()" x-init="init()">
  <!-- Indicateur de sync -->
  <div class="flex items-center">
    <span :class="syncStatusClass"></span>
    <span x-text="syncStatusLabel"></span>
  </div>
  
  <!-- Votre contenu -->
</div>
```

### 3. Workflow adapté (structure)

```javascript
function votreWorkflowPouchDBManager() {
  return {
    // === DONNÉES ===
    items: [],
    
    // === SYNCHRONISATION ===
    syncStatus: 'initial',
    isOnline: navigator.onLine,
    lastSync: null,
    
    // === POUCHDB ===
    localDB: null,
    remoteDB: null,
    syncHandler: null,
    
    // === INITIALISATION ===
    async init() {
      // 1. Initialiser PouchDB
      this.localDB = new PouchDB('nom_db');
      this.remoteDB = new PouchDB(`${URL}/${DB_NAME}`);
      
      // 2. Créer design docs
      await this.ensureDesignDocs();
      
      // 3. Configurer réplication
      await this.setupReplication();
      
      // 4. Charger données
      await this.loadItems();
      
      // 5. Écouteurs réseau
      this.setupNetworkListeners();
    },
    
    // === RÉPLICATION ===
    async setupReplication() {
      this.syncHandler = this.localDB.sync(this.remoteDB, {
        live: true,
        retry: true
      })
      .on('change', (info) => { /* ... */ })
      .on('paused', () => { /* ... */ })
      .on('active', () => { /* ... */ })
      .on('error', (err) => { /* ... */ });
    },
    
    // === CRUD ===
    async createItem(data) {
      const doc = {
        _id: `item_${Date.now()}_${random}`,
        type: 'item',
        ...data,
        createdAt: new Date().toISOString()
      };
      return await this.localDB.put(doc);
    },
    
    async updateItem(id, updates) {
      const doc = await this.localDB.get(id);
      return await this.localDB.put({
        ...doc,
        ...updates,
        updatedAt: new Date().toISOString()
      });
    },
    
    async deleteItem(id) {
      const doc = await this.localDB.get(id);
      return await this.localDB.remove(doc);
    }
  };
}
```

## 📝 Checklist Migration

Pour chaque workflow à migrer:

- [ ] Copier le template `workflow-pouchdb-template.js`
- [ ] Adapter la configuration CouchDB (URL, nom DB)
- [ ] Créer les design documents (vues) nécessaires
- [ ] Remplacer les appels API REST par des opérations PouchDB
- [ ] Ajouter l'état `syncStatus` et `isOnline`
- [ ] Ajouter les indicateurs visuels de synchronisation
- [ ] Gérer les conflits de réplication
- [ ] Ajouter la gestion offline/online
- [ ] Tester le chargement initial depuis PouchDB local
- [ ] Tester la création offline + sync
- [ ] Tester la résolution de conflits

## 🔄 Mapping API → PouchDB

| Ancienne API | Nouveau PouchDB |
|--------------|-----------------|
| `fetch('/api/items')` | `db.allDocs()` ou `db.query()` |
| `fetch('/api/items/:id')` | `db.get(id)` |
| `POST /api/items` | `db.put(doc)` |
| `PUT /api/items/:id` | `db.get(id)` + `db.put(doc)` |
| `DELETE /api/items/:id` | `db.get(id)` + `db.remove(doc)` |
| `GET /api/items?filter=x` | `db.find({ selector: { status: 'x' }})` |

## 🎨 Indicateurs de Sync

```html
<!-- Status indicator -->
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

<!-- Libellé -->
<span x-text="syncStatusLabel"></span>

<!-- Pendent changes -->
<span x-show="pendingChanges > 0" x-text="pendingChanges + ' en attente'"></span>
```

## ⚡ Checkpoints PouchDB

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

## 🔧 Débogage

```javascript
// Activer les logs PouchDB
PouchDB.debug.enable('pouchdb:api');

// Voir les changements en temps réel
this.localDB.changes({ since: 'now', live: true })
  .on('change', console.log);

// Stats de la base
const info = await this.localDB.info();
console.log(info);

// Vérifier les conflits
const conflicts = await this.localDB.allDocs({ conflicts: true });
console.log(conflicts.rows.filter(r => r.value.conflicts));
```

## 📚 Ressources

- [PouchDB API Reference](https://pouchdb.com/api.html)
- [CouchDB HTTP API](https://docs.couchdb.org/en/stable/api/index.html)
- [CouchDB Design Documents](https://docs.couchdb.org/en/stable/ddocs/ddocs.html)
- [Mango Queries](https://docs.couchdb.org/en/stable/api/database/find.html)

## ✅ Exemples de Workflows Migrés

| Workflow | Fichier | Statut |
|----------|---------|--------|
| contacts-load-all | `../contacts/contacts-load-all-pouchdb.js` | ✅ Complet |
| contacts-create-edit | `../contacts/contacts-create-edit-pouchdb.js` | ✅ Complet |
| relances-initial-load | `../relances/relances-initial-load-pouchdb.js` | ✅ Complet |

## 🎯 Prochaines étapes

1. **Sélectionner un workflow** à migrer depuis `workflows.md`
2. **Copier le template** et adapter la configuration
3. **Créer les design documents** pour les vues nécessaires
4. **Remplacer les appels API** par des opérations PouchDB
5. **Ajouter l'indicateur de sync** dans le HTML
6. **Tester** offline/online et résolution de conflits
