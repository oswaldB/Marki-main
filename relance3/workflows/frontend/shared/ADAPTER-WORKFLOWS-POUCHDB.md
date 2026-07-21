# Adapter les Workflows pour PouchDB/CouchDB

Guide pour transformer n'importe quel workflow existant vers l'architecture PouchDB local-first.

## Différences clés

| Avant (API REST) | Après (PouchDB) |
|-----------------|-----------------|
| `fetch('/api/contacts')` | `db.allDocs()` ou `db.query()` |
| `POST /api/contacts` | `db.put(doc)` puis sync |
| `PUT /api/contacts/1` | `db.get(id)` puis `db.put(doc)` |
| `DELETE /api/contacts/1` | `db.get(id)` puis `db.remove(doc)` |
| Gestion d'erreur HTTP | Gestion des conflits 409 |
| Online-only | Offline-first avec sync |

## Pattern de migration

### 1. Avant (API REST)

```javascript
function workflowOld() {
  return {
    contacts: [],
    loading: false,
    error: null,
    
    async loadContacts() {
      this.loading = true;
      try {
        const res = await fetch('/api/contacts');
        this.contacts = await res.json();
      } catch (err) {
        this.error = err.message;
      }
      this.loading = false;
    },
    
    async createContact(data) {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      return await res.json();
    }
  };
}
```

### 2. Après (PouchDB)

```javascript
function workflowPouchDB() {
  return {
    contacts: [],
    loading: false,
    error: null,
    
    // État PouchDB
    syncStatus: 'initial',
    isOnline: navigator.onLine,
    dbService: null,
    
    async init() {
      // Initialiser le service partagé
      this.dbService = await PouchDBService.getInstance({
        url: 'https://serveur.com/data',
        dbName: 'marki_contacts'
      });
      
      // S'abonner aux changements
      this.dbService.on('change', () => this.loadContacts());
      
      // Charger les données initiales
      await this.loadContacts();
    },
    
    async loadContacts() {
      this.loading = true;
      try {
        // Depuis PouchDB local, pas d'appel réseau
        const result = await this.dbService.allDocs();
        this.contacts = result.rows.map(r => r.doc);
      } catch (err) {
        this.error = err.message;
      }
      this.loading = false;
    },
    
    async createContact(data) {
      // Écriture locale + sync automatique
      const result = await this.dbService.create(data);
      return result;
    }
  };
}
```

## Utilisation du Service Partagé

### Import dans le HTML

```html
<script src="shared/pouchdb-service.js"></script>
<script src="https://cdn.jsdelivr.net/npm/pouchdb@8.0.1/dist/pouchdb.min.js"></script>
```

### Initialisation dans le workflow

```javascript
async init() {
  this.dbService = await PouchDBService.getInstance({
    url: COUCHDB_CONFIG.url,
    dbName: 'marki_impayes' // Adapter selon le workflow
  });
  
  // Créer les vues nécessaires
  await this.setupDesignDocs();
  
  // Charger les données
  await this.loadData();
}
```

### Mappage des opérations API → PouchDB

| Opération API | PouchDB équivalent | Exemple |
|---------------|-------------------|---------|
| `GET /api/items` | `dbService.allDocs()` | `const { rows } = await db.allDocs({ include_docs: true })` |
| `GET /api/items/:id` | `dbService.read(id)` | `const doc = await db.get('item_123')` |
| `GET /api/items?filter=x` | `dbService.find(selector)` | `db.find({ selector: { statut: 'actif' }})` |
| `POST /api/items` | `dbService.create(doc)` | `db.create({ nom: 'Test' })` |
| `PUT /api/items/:id` | `dbService.update(id, updates)` | `db.update('item_123', { nom: 'New' })` |
| `DELETE /api/items/:id` | `dbService.delete(id)` | `db.delete('item_123')` |
| `GET /api/items/stats` | `dbService.view(design, view)` | `db.query('stats/by_month')` |

## Gestion des IDs

CouchDB utilise des IDs string. Adopter une convention:

```javascript
// Format: {collection}_{timestamp}_{random}
const id = `contact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Ou avec préfixe explicite
const id = `impaye_${factureId}_${clientId}`;
```

## Gestion des erreurs

### Avant
```javascript
try {
  const res = await fetch('/api/contacts');
  if (!res.ok) throw new Error('HTTP ' + res.status);
} catch (err) {
  this.error = err.message;
}
```

### Après
```javascript
try {
  await db.put(doc);
} catch (err) {
  if (err.status === 409) {
    // Conflit - recharger et fusionner
    await this.handleConflict(doc._id);
  } else {
    this.error = err.message;
  }
}
```

## Indicateurs de sync UI

```html
<!-- Dans le template -->
<div class="flex items-center">
  <span 
    class="w-3 h-3 rounded-full mr-2"
    :class="{
      'bg-green-500': syncStatus === 'complete',
      'bg-blue-500 animate-pulse': syncStatus === 'syncing',
      'bg-yellow-500': syncStatus === 'paused' && isOnline,
      'bg-orange-500': !isOnline,
      'bg-red-500': syncStatus === 'error'
    }"
  ></span>
  
  <span x-text="syncStatusLabel"></span>
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

## Checkpoints PouchDB

Ajouter aux workflows migrés:

```javascript
/**
 * @action Charger les données depuis PouchDB
 * @checkpoint wf-load-pouchdb-local
 * @checkpoint wf-load-design-docs-ready
 * @checkpoint wf-load-sync-active
 * @checkpoint wf-load-data-rendered
 */
```

## Exemple complet: Migration impayes-load

### Avant (REST)
```javascript
// workflows/frontend/impayes/initial-load.md
async loadImpayes() {
  const res = await fetch('/api/impayes?statut=impaye');
  const data = await res.json();
  this.impayes = data.impayes;
}
```

### Après (PouchDB)
```javascript
// workflows/frontend/impayes/initial-load-pouchdb.js
async loadImpayes() {
  // Utiliser une vue Mango si besoin de filtrer
  const result = await this.dbService.find({
    selector: { 
      type: 'impaye',
      statut: 'impaye'
    }
  });
  
  this.impayes = result.docs;
}
```

## Liste des workflows à migrer

Priorité par complexité:

1. ✅ **contacts-load-all** - Liste simple avec relations
2. ✅ **contacts-create-edit** - CRUD complet
3. **impayes-initial-load** - Liste avec filtres
4. **impayes-save-note** - Mise à jour partielle
5. **relances-list** - Liste avec statuts
6. **relances-validate** - Update avec workflow métier
7. **sequences-list** - Configuration statique
8. **dashboard-kpis** - Agrégations (utiliser vues CouchDB)

## Tests après migration

### Scénarios critiques:

1. **Chargement initial** - Les données s'affichent depuis PouchDB
2. **Création offline** - Document créé, sync dès que online
3. **Conflit** - Deux clients modifient le même doc
4. **Reprise après crash** - PouchDB garde les données
5. **Sync continue** - Changements remote apparaissent localement

## Commandes utiles

```javascript
// Vider le cache PouchDB (debug)
await db.destroy();

// Voir les changements en temps réel
db.changes({ since: 'now', live: true }).on('change', console.log);

// Forcer une réplication
await db.replicate.to(remoteDB);
await db.replicate.from(remoteDB);

// Stats
console.log(await db.info());
```

## Ressources

- [PouchDB API](https://pouchdb.com/api.html)
- [CouchDB Mango Queries](https://docs.couchdb.org/en/stable/api/database/find.html)
- [Service partagé](./pouchdb-service.js)
