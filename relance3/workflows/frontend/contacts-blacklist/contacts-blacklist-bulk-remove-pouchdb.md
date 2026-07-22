---
id: contacts-blacklist-bulk-remove-pouchdb
type: frontend
folder: specs/workflows/frontend/contacts-blacklist/
description: Retire plusieurs contacts de la blacklist via PouchDB (local-first, sync CouchDB)
depends_on: [contacts-blacklist-load-pouchdb]
screen: contacts-blacklist
global: false
mockup_entry: specs/mockups/contacts-blacklist.html
---

# contacts-blacklist-bulk-remove-pouchdb : Retirer en masse de la blacklist (PouchDB)

## Description

Permet de retirer plusieurs contacts de la blacklist simultanément via **PouchDB local-first** avec réplication live vers CouchDB.

### Principes Clés

| Principe | Implémentation |
|----------|----------------|
| **Local-First** | Écritures dans PouchDB local (IndexedDB), instantanées |
| **Sync Live** | Réplication bidirectionnelle automatique avec CouchDB |
| **Bulk Operations** | `db.bulkDocs()` pour mises à jour par lots |
| **Gestion Conflits** | Détection via `conflicts: true`, résolution LWW |
| **Offline-First** | Fonctionne sans connexion, sync au retour online |
| **Real-time UI** | Changes feed pour mise à jour temps réel de la liste |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Alpine.js UI                                │
│  x-data: contactsBlacklistPage()                                │
│  ├─ selectedContacts: []                                        │
│  ├─ syncStatus: {status, lastSync, pendingChanges}             │
│  └─ bulkUnblacklist()                                           │
└──────────────────────┬──────────────────────────────────────────┘
                       │ bulkDocs([{_id, _rev, blacklist: false}])
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                     PouchDB Local                                │
│  Database: "contacts" (IndexedDB)                               │
│  ├─ bulkDocs(docs) → Écriture instantanée                       │
│  ├─ changes({live: true}) → Écoute changements                  │
│  └─ createIndex() → Mango queries sur blacklist                 │
└──────────────────────┬──────────────────────────────────────────┘
                       │ replicate.to() / replicate.from()
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                     CouchDB Server                              │
│  Database: http://localhost:5984/contacts                       │
│  ├─ _design/contacts-indexes → Vues Mango                       │
│  └─ _security → Permissions lecture/écriture                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Modèle de Données CouchDB

### Document Contact
```json
{
  "_id": "contact_payer_123",
  "_rev": "5-abc123def456",
  "type": "contact",
  "payeur_id": "payer_123",
  "nom": "ACME Corporation",
  "email": "contact@acme.com",
  "telephone": "+33123456789",
  "blacklist": true,
  "blacklist_motif": "Retard paiement répété",
  "blacklist_date": "2026-07-15T10:00:00Z",
  "blacklist_by": "user_001",
  "created_at": "2026-01-15T09:00:00Z",
  "updated_at": "2026-07-21T14:30:00Z"
}
```

### Document Contact (Après unblacklist)
```json
{
  "_id": "contact_payer_123",
  "_rev": "6-xyz789abc012",
  "type": "contact",
  "payeur_id": "payer_123",
  "nom": "ACME Corporation",
  "email": "contact@acme.com",
  "telephone": "+33123456789",
  "blacklist": false,
  "blacklist_motif": null,
  "blacklist_date": null,
  "blacklist_by": null,
  "unblacklist_date": "2026-07-21T14:30:00Z",
  "unblacklist_by": "user_001",
  "unblacklist_reason": "Paiement reçu",
  "created_at": "2026-01-15T09:00:00Z",
  "updated_at": "2026-07-21T14:30:00Z"
}
```

---

## États de Synchronisation (syncStatus)

```javascript
{
  status: 'idle' | 'syncing' | 'paused' | 'error' | 'offline',
  lastSync: '2026-07-21T14:30:00Z',
  pendingChanges: 0,
  direction: null | 'push' | 'pull' | 'both',
  error: null | { message: string, code: number },
  isOnline: boolean,
  isSyncing: boolean
}
```

### Mapping Événements PouchDB → syncStatus

| Événement PouchDB | syncStatus | Description |
|-------------------|------------|-------------|
| `sync.active` | `syncing` | Réplication en cours |
| `sync.paused` (sans err) | `idle` | Sync complétée |
| `sync.paused` (avec err) | `error` | Erreur réseau/CouchDB |
| `sync.change` | `syncing` | Changements détectés |
| `sync.error` | `error` | Erreur critique |
| `navigator.offline` | `offline` | Perte connexion |
| `navigator.online` | `connecting` | Retour connexion |

---

## Design Documents (Mango Indexes)

### Index sur blacklist
```javascript
await contactsDB.createIndex({
  index: {
    fields: ['blacklist'],
    name: 'idx-blacklist',
    ddoc: 'contacts-indexes'
  }
});
```

### Index sur updated_at (pour le tri)
```javascript
await contactsDB.createIndex({
  index: {
    fields: ['updated_at'],
    name: 'idx-updated',
    ddoc: 'contacts-indexes'
  }
});
```

### Index composé blacklist + updated_at
```javascript
await contactsDB.createIndex({
  index: {
    fields: ['blacklist', 'updated_at'],
    name: 'idx-blacklist-updated',
    ddoc: 'contacts-indexes'
  }
});
```

---

## Flow PouchDB

```javascript
/**
 * @action Sélectionner plusieurs contacts
 * @checkpoint bulk-selection-changed
 * State: { 
 *   selectedContacts: ['contact_payer_001', 'contact_payer_002'],
 *   syncStatus: { status: 'idle' }
 * }
 * UI: Cases à cocher sur chaque card avec x-model
 */

/**
 * @action Confirmer l'action en masse
 * @checkpoint bulk-unblacklist-confirm
 * Dialog: "Retirer X contacts de la blacklist ?"
 * Validation: syncStatus.status !== 'offline'
 */

/**
 * @action Récupérer documents avec révisions
 * @checkpoint bulk-fetch-docs
 * PouchDB: db.allDocs({keys: selectedContacts, include_docs: true})
 * Retourne: [{_id, _rev, ...doc}, ...]
 */

/**
 * @action Détecter et résoudre conflits
 * @checkpoint bulk-conflicts-check
 * PouchDB: db.get(id, {conflicts: true}) pour chaque doc
 * Stratégie: LWW (Last Write Wins) avec fusion des historiques
 */

/**
 * @action Écrire en bulk dans PouchDB local
 * @checkpoint bulk-unblacklist-local-write
 * PouchDB: db.bulkDocs(updatedDocs)
 * Instantané: Pas d'attente réseau
 * Retour: [{ok: true, id, rev}, ...]
 */

/**
 * @action Sync vers CouchDB (background)
 * @checkpoint bulk-unblacklist-sync-started
 * Events: sync.active → sync.paused
 * La sync se fait automatiquement via la réplication live
 */

/**
 * @action Mettre à jour l'UI via changes feed
 * @checkpoint bulk-unblacklist-complete
 * PouchDB: changes({live: true, since: 'now'})
 * La liste se met à jour automatiquement
 */
```

---

## Implementation Alpine.js x-data

```javascript
// frontend/app/contacts-blacklist/js/contacts-blacklist-bulk-remove-pouchdb.js

import PouchDB from 'pouchdb-browser';
import PouchDBFind from 'pouchdb-find';

PouchDB.plugin(PouchDBFind);

export function contactsBlacklistPage() {
  return {
    // ─── Data ───
    contacts: [],
    selectedContacts: [],
    loading: false,
    error: null,
    showBulkConfirmModal: false,
    showUnblacklistReasonModal: false,
    unblacklistReason: '',
    
    // ─── PouchDB ───
    localDB: null,
    remoteDB: null,
    syncHandler: null,
    changesHandler: null,
    
    // ─── Sync Status ───
    syncStatus: {
      status: 'idle',      // idle | syncing | paused | error | offline
      lastSync: null,
      pendingChanges: 0,
      direction: null,
      error: null,
      isOnline: navigator.onLine,
      isSyncing: false
    },
    
    // ─── Configuration ───
    couchDBUrl: 'http://localhost:5984/contacts',
    
    // ─── Initialization ───
    async init() {
      await this.initPouchDB();
      await this.setupIndexes();
      await this.setupSync();
      await this.setupNetworkListeners();
      await this.loadBlacklistedContacts();
      this.setupChangesListener();
    },
    
    /**
     * @checkpoint pouchdb-init
     * Initialize les connexions PouchDB local et remote
     */
    async initPouchDB() {
      try {
        // DB locale
        this.localDB = new PouchDB('contacts', {
          auto_compaction: true,
          revs_limit: 50
        });
        
        // DB remote (CouchDB)
        this.remoteDB = new PouchDB(this.couchDBUrl, {
          auth: {
            username: 'admin',
            password: 'password'
          }
        });
        
        console.log('[PouchDB] Initialisé');
      } catch (err) {
        console.error('[PouchDB] Erreur init:', err);
        this.error = 'Erreur initialisation base de données';
      }
    },
    
    /**
     * @checkpoint mango-indexes-created
     * Crée les index Mango pour les requêtes
     */
    async setupIndexes() {
      try {
        // Index sur blacklist
        await this.localDB.createIndex({
          index: {
            fields: ['blacklist'],
            name: 'idx-blacklist',
            ddoc: 'contacts-indexes'
          }
        });
        
        // Index sur updated_at
        await this.localDB.createIndex({
          index: {
            fields: ['updated_at'],
            name: 'idx-updated',
            ddoc: 'contacts-indexes'
          }
        });
        
        // Index composé
        await this.localDB.createIndex({
          index: {
            fields: ['blacklist', 'updated_at'],
            name: 'idx-blacklist-updated',
            ddoc: 'contacts-indexes'
          }
        });
        
        console.log('[PouchDB] Index Mango créés');
      } catch (err) {
        console.error('[PouchDB] Erreur index:', err);
      }
    },
    
    /**
     * @checkpoint sync-setup
     * Configure la réplication live bidirectionnelle
     */
    async setupSync() {
      if (!this.localDB || !this.remoteDB) return;
      
      // Sync bidirectionnelle avec gestion des conflits
      this.syncHandler = this.localDB.sync(this.remoteDB, {
        live: true,
        retry: true,
        conflicts: true,
        include_docs: true
      });
      
      // Événement: changement actif
      this.syncHandler.on('active', () => {
        console.log('[Sync] Active');
        this.syncStatus.status = 'syncing';
        this.syncStatus.isSyncing = true;
        this.syncStatus.direction = 'both';
      });
      
      // Événement: pause (sync complétée ou erreur)
      this.syncHandler.on('paused', (err) => {
        console.log('[Sync] Paused', err ? '(avec erreur)' : '');
        if (err) {
          this.syncStatus.status = 'error';
          this.syncStatus.error = { 
            message: err.message || 'Erreur de synchronisation',
            code: err.status || 500
          };
        } else {
          this.syncStatus.status = 'idle';
          this.syncStatus.lastSync = new Date().toISOString();
          this.syncStatus.error = null;
        }
        this.syncStatus.isSyncing = false;
      });
      
      // Événement: changement reçu
      this.syncHandler.on('change', (info) => {
        console.log('[Sync] Change:', info);
        this.syncStatus.pendingChanges = info.change?.pending || 0;
        
        // Mettre à jour la direction
        if (info.direction === 'push') {
          this.syncStatus.direction = 'push';
        } else if (info.direction === 'pull') {
          this.syncStatus.direction = 'pull';
        }
      });
      
      // Événement: erreur
      this.syncHandler.on('error', (err) => {
        console.error('[Sync] Erreur:', err);
        this.syncStatus.status = 'error';
        this.syncStatus.error = { 
          message: err.message || 'Erreur de synchronisation',
          code: err.status || 500
        };
        this.syncStatus.isSyncing = false;
      });
    },
    
    /**
     * @checkpoint network-listeners
     * Écoute les événements online/offline du navigateur
     */
    setupNetworkListeners() {
      window.addEventListener('online', () => {
        console.log('[Network] Online');
        this.syncStatus.isOnline = true;
        this.syncStatus.status = 'connecting';
        // La reconnexion se fait automatiquement (retry: true)
      });
      
      window.addEventListener('offline', () => {
        console.log('[Network] Offline');
        this.syncStatus.isOnline = false;
        this.syncStatus.status = 'offline';
      });
    },
    
    /**
     * @checkpoint changes-listener
     * Écoute les changements pour mise à jour temps réel
     */
    setupChangesListener() {
      if (!this.localDB) return;
      
      this.changesHandler = this.localDB.changes({
        since: 'now',
        live: true,
        include_docs: true,
        conflicts: true
      }).on('change', (change) => {
        console.log('[Changes] Changement détecté:', change.id);
        
        // Mettre à jour le contact dans la liste locale
        const index = this.contacts.findIndex(c => c._id === change.id);
        if (index !== -1) {
          if (change.deleted) {
            // Document supprimé
            this.contacts.splice(index, 1);
          } else {
            // Document mis à jour
            this.contacts[index] = change.doc;
            
            // Si plus blacklisté, retirer de la sélection
            if (!change.doc.blacklist && this.selectedContacts.includes(change.id)) {
              this.selectedContacts = this.selectedContacts.filter(id => id !== change.id);
            }
          }
        }
        
        // Gérer les conflits si présents
        if (change.doc._conflicts) {
          this.resolveConflict(change.id, change.doc);
        }
      }).on('error', (err) => {
        console.error('[Changes] Erreur:', err);
      });
    },
    
    /**
     * @checkpoint load-blacklisted
     * Charge les contacts blacklistés via Mango query
     */
    async loadBlacklistedContacts() {
      this.loading = true;
      
      try {
        // Query Mango sur l'index blacklist
        const result = await this.localDB.find({
          selector: {
            blacklist: true
          },
          sort: [{ updated_at: 'desc' }]
        });
        
        this.contacts = result.docs;
        console.log(`[PouchDB] ${this.contacts.length} contacts blacklistés chargés`);
      } catch (err) {
        console.error('[PouchDB] Erreur chargement:', err);
        this.error = 'Erreur chargement des contacts';
      } finally {
        this.loading = false;
      }
    },
    
    // ─── Bulk Operations ───
    
    /**
     * @checkpoint bulk-unblacklist-confirm
     * Ouvre le modal de confirmation
     */
    confirmBulkUnblacklist() {
      if (this.selectedContacts.length === 0) {
        Alpine.store('ui').addToast('Aucun contact sélectionné', 'warning');
        return;
      }
      
      if (!this.syncStatus.isOnline) {
        Alpine.store('ui').addToast('Mode hors ligne - les modifications seront synchronisées plus tard', 'warning');
      }
      
      this.showBulkConfirmModal = true;
    },
    
    /**
     * @checkpoint bulk-unblacklist-api-called → bulk-unblacklist-local-write
     * Retire les contacts sélectionnés de la blacklist
     */
    async bulkUnblacklist() {
      this.loading = true;
      this.error = null;
      
      try {
        // 1. Récupérer les documents avec leurs révisions
        const response = await this.localDB.allDocs({
          keys: this.selectedContacts,
          include_docs: true,
          conflicts: true
        });
        
        // 2. Préparer les documents mis à jour
        const user = Alpine.store('auth').user;
        const now = new Date().toISOString();
        
        const updatedDocs = response.rows.map(row => {
          const doc = row.doc;
          
          // Vérifier s'il y a des conflits
          if (row.value.conflicts) {
            console.warn(`[Conflit] Document ${doc._id} a des conflits`);
          }
          
          return {
            ...doc,
            _id: doc._id,
            _rev: doc._rev,
            blacklist: false,
            blacklist_motif: null,
            blacklist_date: null,
            blacklist_by: null,
            unblacklist_date: now,
            unblacklist_by: user?.id || 'unknown',
            unblacklist_reason: this.unblacklistReason || 'Retiré en masse',
            updated_at: now
          };
        });
        
        // 3. Vérifier les documents non trouvés
        const notFound = response.rows.filter(row => !row.doc);
        if (notFound.length > 0) {
          console.error('[Bulk] Documents non trouvés:', notFound.map(r => r.key));
        }
        
        // 4. Écriture bulk dans PouchDB local (INSTANTANÉ)
        const bulkResult = await this.localDB.bulkDocs(updatedDocs);
        console.log('[PouchDB] Bulk update result:', bulkResult);
        
        // 5. Analyser les résultats
        const success = bulkResult.filter(r => r.ok);
        const errors = bulkResult.filter(r => !r.ok);
        
        // 6. Gérer les erreurs 409 (conflits de révision)
        const conflicts = errors.filter(e => e.status === 409);
        if (conflicts.length > 0) {
          console.warn('[Conflits] Documents avec erreur 409:', conflicts);
          // Résolution automatique des conflits
          for (const conflict of conflicts) {
            await this.resolveRevisionConflict(conflict.id, updatedDocs.find(d => d._id === conflict.id));
          }
        }
        
        // 7. Mettre à jour la liste locale immédiatement
        this.contacts = this.contacts.filter(c => 
          !this.selectedContacts.includes(c._id)
        );
        
        // 8. Réinitialiser la sélection
        this.selectedContacts = [];
        this.unblacklistReason = '';
        this.showBulkConfirmModal = false;
        this.showUnblacklistReasonModal = false;
        
        // 9. Notification
        Alpine.store('ui').addToast(
          `${success.length} contact(s) retiré(s) de la blacklist`,
          'success'
        );
        
        // 10. La sync vers CouchDB se fait automatiquement en background
        if (!this.syncStatus.isOnline) {
          Alpine.store('ui').addToast(
            'Modifications en attente de synchronisation',
            'info'
          );
        }
        
      } catch (err) {
        console.error('[PouchDB] Erreur bulk unblacklist:', err);
        this.error = err.message;
        Alpine.store('ui').addToast(err.message, 'error');
      } finally {
        this.loading = false;
      }
    },
    
    /**
     * @checkpoint remove-all-unblacklist
     * Retire TOUS les contacts de la blacklist
     */
    async removeAllFromBlacklist() {
      if (!confirm('Retirer tous les contacts de la blacklist ?')) return;
      
      this.loading = true;
      
      try {
        // 1. Récupérer tous les contacts blacklistés
        const result = await this.localDB.find({
          selector: { blacklist: true }
        });
        
        if (result.docs.length === 0) {
          Alpine.store('ui').addToast('Aucun contact dans la blacklist', 'info');
          return;
        }
        
        // 2. Préparer les mises à jour
        const user = Alpine.store('auth').user;
        const now = new Date().toISOString();
        
        const updatedDocs = result.docs.map(doc => ({
          ...doc,
          _id: doc._id,
          _rev: doc._rev,
          blacklist: false,
          blacklist_motif: null,
          blacklist_date: null,
          blacklist_by: null,
          unblacklist_date: now,
          unblacklist_by: user?.id || 'unknown',
          unblacklist_reason: 'Retiré tous (action admin)',
          updated_at: now
        }));
        
        // 3. Écriture bulk
        const bulkResult = await this.localDB.bulkDocs(updatedDocs);
        
        // 4. Mettre à jour la liste
        this.contacts = [];
        this.selectedContacts = [];
        
        Alpine.store('ui').addToast(
          `${updatedDocs.length} contact(s) retiré(s) de la blacklist`,
          'success'
        );
        
      } catch (err) {
        console.error('[PouchDB] Erreur remove all:', err);
        Alpine.store('ui').addToast(err.message, 'error');
      } finally {
        this.loading = false;
      }
    },
    
    // ─── Gestion des Conflits ───
    
    /**
     * @checkpoint conflict-resolution
     * Résout un conflit de révision (409)
     */
    async resolveRevisionConflict(docId, updatedDoc) {
      try {
        // Récupérer la dernière révision
        const latest = await this.localDB.get(docId);
        
        // Réessayer avec la nouvelle révision
        await this.localDB.put({
          ...updatedDoc,
          _rev: latest._rev
        });
        
        console.log(`[Conflit] Résolu pour ${docId}`);
      } catch (err) {
        console.error(`[Conflit] Échec résolution pour ${docId}:`, err);
      }
    },
    
    /**
     * @checkpoint conflict-merge
     * Résout un conflit CouchDB (_conflicts présent)
     * Stratégie: LWW (Last Write Wins) avec fusion des historiques
     */
    async resolveConflict(docId, currentDoc) {
      try {
        if (!currentDoc._conflicts || currentDoc._conflicts.length === 0) return;
        
        console.log(`[Conflit] Résolution pour ${docId}`);
        
        // Récupérer toutes les révisions conflictuelles
        const conflicts = await Promise.all(
          currentDoc._conflicts.map(rev => 
            this.localDB.get(docId, { rev })
          )
        );
        
        // Ajouter le document courant
        const allVersions = [currentDoc, ...conflicts];
        
        // Sélectionner la version la plus récente (LWW)
        const winner = allVersions.reduce((latest, current) => {
          return new Date(current.updated_at) > new Date(latest.updated_at) 
            ? current 
            : latest;
        });
        
        // Fusionner les historiques de blacklist si nécessaire
        const mergedHistory = this.mergeBlacklistHistory(allVersions);
        
        // Sauvegarder la version gagnante
        const winningDoc = {
          ...winner,
          _rev: currentDoc._rev,
          blacklist_history: mergedHistory
        };
        
        await this.localDB.put(winningDoc);
        
        // Supprimer les révisions conflictuelles
        await Promise.all(
          currentDoc._conflicts.map(rev => 
            this.localDB.remove(docId, rev)
          )
        );
        
        console.log(`[Conflit] Résolu pour ${docId}, gagnant: ${winner._rev}`);
      } catch (err) {
        console.error(`[Conflit] Erreur résolution pour ${docId}:`, err);
      }
    },
    
    /**
     * Fusionne les historiques de blacklist de toutes les versions
     */
    mergeBlacklistHistory(versions) {
      const history = [];
      
      versions.forEach(version => {
        if (version.blacklist_history) {
          history.push(...version.blacklist_history);
        }
        // Ajouter l'état actuel
        if (version.blacklist !== undefined) {
          history.push({
            blacklist: version.blacklist,
            date: version.updated_at,
            by: version.updated_by || version.blacklist_by || version.unblacklist_by
          });
        }
      });
      
      // Dedupliquer et trier par date
      return [...new Map(history.map(h => [h.date, h])).values()]
        .sort((a, b) => new Date(a.date) - new Date(b.date));
    },
    
    // ─── UI Helpers ───
    
    /**
     * @checkpoint bulk-selection-changed
     * Toggle la sélection d'un contact
     */
    toggleContactSelection(contactId) {
      const index = this.selectedContacts.indexOf(contactId);
      if (index === -1) {
        this.selectedContacts.push(contactId);
      } else {
        this.selectedContacts.splice(index, 1);
      }
    },
    
    /**
     * Toggle tous les contacts
     */
    toggleSelectAll() {
      if (this.selectedContacts.length === this.contacts.length) {
        this.selectedContacts = [];
      } else {
        this.selectedContacts = this.contacts.map(c => c._id);
      }
    },
    
    /**
     * Ferme les modals
     */
    closeModals() {
      this.showBulkConfirmModal = false;
      this.showUnblacklistReasonModal = false;
      this.unblacklistReason = '';
    },
    
    /**
     * @checkpoint component-cleanup
     * Nettoyage lors de la destruction du composant
     */
    destroy() {
      if (this.syncHandler) {
        this.syncHandler.cancel();
      }
      if (this.changesHandler) {
        this.changesHandler.cancel();
      }
      if (this.localDB) {
        this.localDB.close();
      }
    }
  };
}
```

---

## Utilisation dans HTML

```html
<!-- contacts-blacklist.html -->
<div x-data="contactsBlacklistPage()" x-init="init()" @beforeunload="destroy()">
  
  <!-- Indicateur de Sync -->
  <div class="sync-indicator" 
       :class="syncStatus.status"
       :title="`Dernière sync: ${syncStatus.lastSync || 'Jamais'}`">
    
    <!-- Idle -->
    <template x-if="syncStatus.status === 'idle'">
      <span class="sync-idle">✅ Synchronisé</span>
    </template>
    
    <!-- Syncing -->
    <template x-if="syncStatus.status === 'syncing'">
      <span class="sync-active">
        <span class="spinner"></span>
        Sync en cours...
        <span x-text="syncStatus.direction === 'push' ? '↑' : syncStatus.direction === 'pull' ? '↓' : '↕'"></span>
      </span>
    </template>
    
    <!-- Paused (erreur) -->
    <template x-if="syncStatus.status === 'error'">
      <span class="sync-error" @click="error && console.log(error)">
        ❌ Erreur sync
        <span x-text="syncStatus.error?.message"></span>
      </span>
    </template>
    
    <!-- Offline -->
    <template x-if="syncStatus.status === 'offline'">
      <span class="sync-offline">⚠️ Mode hors ligne</span>
    </template>
    
    <!-- Pending changes indicator -->
    <span x-show="syncStatus.pendingChanges > 0" 
          class="pending-badge"
          x-text="syncStatus.pendingChanges + ' en attente'">
    </span>
  </div>
  
  <!-- Header avec actions bulk -->
  <div class="bulk-actions" x-show="contacts.length > 0">
    <label class="select-all">
      <input type="checkbox" 
             :checked="selectedContacts.length === contacts.length && contacts.length > 0"
             @change="toggleSelectAll()">
      Tout sélectionner
    </label>
    
    <div class="selected-count" x-show="selectedContacts.length > 0">
      <span x-text="selectedContacts.length"></span> contact(s) sélectionné(s)
    </div>
    
    <button 
      class="btn btn-primary"
      @click="confirmBulkUnblacklist()"
      :disabled="selectedContacts.length === 0 || loading"
      x-show="selectedContacts.length > 0">
      <span x-show="!loading">Retirer de la blacklist</span>
      <span x-show="loading">Traitement...</span>
    </button>
    
    <button 
      class="btn btn-danger"
      @click="removeAllFromBlacklist()"
      :disabled="loading || contacts.length === 0">
      Retirer tout
    </button>
  </div>
  
  <!-- Liste des contacts -->
  <div class="contacts-list">
    <template x-for="contact in contacts" :key="contact._id">
      <div class="contact-card" :class="{ 'selected': selectedContacts.includes(contact._id) }">
        <input type="checkbox" 
               :value="contact._id"
               :checked="selectedContacts.includes(contact._id)"
               @change="toggleContactSelection(contact._id)">
        
        <div class="contact-info">
          <h4 x-text="contact.nom"></h4>
          <p x-text="contact.email"></p>
          <small>
            Blacklisté le <span x-text="contact.blacklist_date"></span>
            par <span x-text="contact.blacklist_by"></span>
          </small>
          <small x-show="contact.blacklist_motif" x-text="`Motif: ${contact.blacklist_motif}`"></small>
        </div>
        
        <div class="contact-rev" title="Révision CouchDB">
          <small x-text="contact._rev?.split('-')[0]"></small>
        </div>
      </div>
    </template>
  </div>
  
  <!-- Modal Confirmation Bulk -->
  <div x-show="showBulkConfirmModal" class="modal-overlay" @click.self="closeModals()">
    <div class="modal">
      <h3>Confirmer le retrait</h3>
      <p>
        Retirer <strong x-text="selectedContacts.length"></strong> contact(s) de la blacklist ?
      </p>
      
      <div class="form-group" x-show="syncStatus.isOnline">
        <label>Motif (optionnel):</label>
        <textarea x-model="unblacklistReason" 
                  placeholder="Raison du retrait..."
                  rows="3"></textarea>
      </div>
      
      <div class="offline-warning" x-show="!syncStatus.isOnline">
        ⚠️ Mode hors ligne. Les modifications seront synchronisées lors du retour en ligne.
      </div>
      
      <div class="modal-actions">
        <button @click="closeModals()" :disabled="loading">Annuler</button>
        <button @click="bulkUnblacklist()" 
                class="btn-primary"
                :disabled="loading">
          <span x-show="!loading">Confirmer</span>
          <span x-show="loading">Traitement...</span>
        </button>
      </div>
    </div>
  </div>
  
  <!-- Toast Notifications -->
  <div class="toast-container">
    <template x-for="toast in $store.ui.toasts" :key="toast.id">
      <div :class="`toast toast-${toast.type}`" x-text="toast.message"></div>
    </template>
  </div>
</div>

<!-- Dépendances -->
<script src="https://cdn.jsdelivr.net/npm/pouchdb@8.0.1/dist/pouchdb.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/pouchdb@8.0.1/dist/pouchdb.find.min.js"></script>
<script type="module" src="contacts-blacklist-bulk-remove-pouchdb.js"></script>
```

---

## Dépendances

```html
<!-- PouchDB Core + Plugin Find -->
<script src="https://cdn.jsdelivr.net/npm/pouchdb@8.0.1/dist/pouchdb.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/pouchdb@8.0.1/dist/pouchdb.find.min.js"></script>
```

### Package.json (si build)
```json
{
  "dependencies": {
    "pouchdb-browser": "^8.0.1",
    "pouchdb-find": "^8.0.1"
  }
}
```

---

## Configuration CouchDB Requise

### 1. CORS (obligatoire pour navigateur)
```bash
curl -X PUT http://admin:password@localhost:5984/_config/httpd/enable_cors -d '"true"'
curl -X PUT http://admin:password@localhost:5984/_config/cors/origins -d '"*"'
curl -X PUT http://admin:password@localhost:5984/_config/cors/credentials -d '"true"'
curl -X PUT http://admin:password@localhost:5984/_config/cors/methods -d '"GET, PUT, POST, DELETE, OPTIONS"'
curl -X PUT http://admin:password@localhost:5984/_config/cors/headers -d '"accept, authorization, content-type, origin, referer, if-match"'
```

### 2. Créer la base contacts
```bash
curl -X PUT http://admin:password@localhost:5984/contacts
```

### 3. Sécurité (optionnel)
```bash
# Configurer les permissions
curl -X PUT http://admin:password@localhost:5984/contacts/_security \
  -H 'Content-Type: application/json' \
  -d '{
    "admins": { "names": ["admin"], "roles": [] },
    "members": { "names": [], "roles": ["user"] }
  }'
```

---

## Comparaison REST vs PouchDB

| Aspect | REST API | PouchDB |
|--------|----------|---------|
| Endpoint | `POST /api/contacts/bulk-unblacklist` | `db.bulkDocs()` local |
| Latence | 200-500ms (réseau) | 1-5ms (local) |
| Offline | Échec | Succès + sync différée |
| Gestion erreurs | HTTP status | Exceptions JS |
| Conflits | Gestion serveur | Détection + résolution client |
| Real-time | Polling | Changes feed temps réel |
| IDs | `id: "contact_123"` | `_id: "contact_123"` |
| Version | Pas de version | `_rev: "5-abc..."` |
| Bulk | Custom endpoint | `bulkDocs()` natif |

---

## Points d'Attention

### ⚠️ IDs CouchDB
- Toujours utiliser `_id` (pas `id`)
- Format recommandé: `contact_{payeur_id}` ou `contact_{timestamp}_{random}`
- Les IDs sont immuables après création

### ⚠️ Révisions (_rev)
- **OBLIGATOIRE** pour toute mise à jour
- Format: `{generation}-{hash}` (ex: `5-abc123def456`)
- Incrémentée à chaque modification
- Erreur **409 Conflict** si `_rev` obsolète

### ⚠️ Bulk Operations
- `bulkDocs()` est atomique par document (pas transaction globale)
- Certains documents peuvent réussir, d'autres échouer
- Toujours vérifier le tableau de résultats

### ⚠️ Conflits
- Détection: `db.get(id, { conflicts: true })`
- Types:
  - **409**: Conflit de révision (même doc modifié en parallèle)
  - CouchDB: Mêmes données modifiées sur plusieurs devices
- Résolution: Stratégie LWW ou fusion manuelle

### ⚠️ Sync Bidirectionnelle
- `sync()` = `replicate.to()` + `replicate.from()`
- `retry: true` pour reconnexion automatique
- Annuler le handler à la destruction du composant

### ⚠️ Taille Base Locale
- `auto_compaction: true` pour nettoyer automatiquement
- `revs_limit: 50` pour limiter l'historique des révisions
- Surveiller la taille IndexedDB dans DevTools

---

## Fichiers

```
workflows/frontend/contacts-blacklist/
├── contacts-blacklist-bulk-remove.md           # Documentation originale (REST)
├── contacts-blacklist-bulk-remove-pouchdb.md   # Documentation PouchDB (ce fichier)
└── contacts-blacklist-bulk-remove-pouchdb.js   # Implémentation
```

---

## Checkpoints de Validation

| Checkpoint | Description | Test |
|------------|-------------|------|
| `pouchdb-init` | Initialisation PouchDB | `localDB` et `remoteDB` définis |
| `mango-indexes-created` | Index créés | `idx-blacklist`, `idx-updated` existent |
| `sync-setup` | Sync configurée | Événements `active`/`paused` reçus |
| `network-listeners` | Écoute online/offline | Déconnexion → `status: 'offline'` |
| `changes-listener` | Changes feed actif | Modification CouchDB → UI mise à jour |
| `load-blacklisted` | Chargement initial | `contacts` peuplé avec docs `blacklist: true` |
| `bulk-selection-changed` | Sélection multiple | `selectedContacts` contient les IDs |
| `bulk-unblacklist-confirm` | Modal ouvert | `showBulkConfirmModal = true` |
| `bulk-fetch-docs` | Documents récupérés | `allDocs()` retourne les révisions |
| `bulk-conflicts-check` | Conflits vérifiés | `_conflicts` vérifié sur chaque doc |
| `bulk-unblacklist-local-write` | Écriture bulk | `bulkDocs()` retourne `{ok: true}` |
| `bulk-unblacklist-sync-started` | Sync lancée | Événement `sync.active` reçu |
| `bulk-unblacklist-complete` | UI mise à jour | Contacts retirés de la liste |
| `conflict-resolution` | Conflit 409 résolu | Réessai avec nouvelle `_rev` |
| `conflict-merge` | Conflit CouchDB résolu | `_conflicts` supprimés |
| `component-cleanup` | Nettoyage | `sync.cancel()` et `db.close()` appelés |

---

## Notes

- **Pattern "Optimistic UI"**: La liste est mise à jour immédiatement après `bulkDocs()`, avant la sync vers CouchDB
- **Eventual Consistency**: Les données peuvent différer temporairement entre devices
- **Conflict-free Replicated Data Type (CRDT)**: Les historiques de blacklist permettent une fusion sémantique
- **Audit Trail**: Les champs `unblacklist_date`, `unblacklist_by`, `unblacklist_reason` conservent l'historique
