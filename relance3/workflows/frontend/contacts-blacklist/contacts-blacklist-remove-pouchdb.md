---
id: contacts-blacklist-remove-pouchdb
type: frontend
folder: specs/workflows/frontend/contacts-blacklist/
description: Retire un contact de la blacklist (PouchDB/CouchDB)
depends_on: [contacts-blacklist-load-pouchdb]
screen: contacts-blacklist
global: false
mockup_entry: specs/mockups/contacts-blacklist.html
couchdb_db: marki_contacts
doc_type: contact
---

# contacts-blacklist-remove : Retirer de la blacklist (PouchDB)

## Description

Retire un contact de la blacklist via PouchDB. Le contact recevra à nouveau les relances automatiques. La modification est faite localement et synchronisée vers CouchDB via réplication live.

## Architecture PouchDB

```
┌─────────────────┐     ┌─────────────┐     ┌───────────────┐
│   Alpine.js UI  │────▶│ PouchDB     │────▶│ CouchDB       │
│   (x-data)      │◀────│ Local       │◀────│ Remote        │
└─────────────────┘     └─────────────┘     └───────────────┘
       │
       ▼
  ┌────────────┐
  │ syncStatus │  idle | syncing | paused | error
  └────────────┘
```

## Règles PouchDB

| # | Règle | Implémentation |
|---|-------|----------------|
| 1 | PouchDB local + réplication live | `new PouchDB('marki_contacts')` + `sync()` |
| 2 | Remplacer appels API | `db.get()` + `db.put()` au lieu de `fetch()` |
| 3 | Sync bidirectionnelle | `db.sync(remoteDB, {live: true, retry: true})` |
| 4 | Gestion conflits | `{conflicts: true}` dans `db.get()` |
| 5 | Design documents | `_design/contacts` avec vues |
| 6 | Pattern local-first | Mise à jour locale → sync auto |
| 7 | Offline/online | Events `paused`/`active` |
| 8 | Structure Alpine.js | `x-data` préservée |
| 9 | Propriété `syncStatus` | `idle\|syncing\|paused\|error` |
| 10 | IDs CouchDB | `_id` et `_rev` obligatoires |

## Flow PouchDB

```javascript
/**
 * @action Confirmer l'action
 * @checkpoint unblacklist-confirm
 * Dialog: "Retirer [nom] de la blacklist ?"
 */

/**
 * @action Récupérer document PouchDB (RÈGLE #2, #10)
 * @checkpoint unblacklist-pouchdb-get
 * API: localDB.get(contactId, { conflicts: true })  (RÈGLE #4)
 * Retourne: { _id, _rev, is_blacklisted, ... }
 */

/**
 * @action Mettre à jour document (RÈGLE #6)
 * @checkpoint unblacklist-pouchdb-put
 * API: localDB.put({ ...doc, is_blacklisted: 0, _rev: doc._rev })
 * La réplication live sync vers CouchDB automatiquement (RÈGLE #3)
 */

/**
 * @action Gestion conflit si détecté (RÈGLE #4)
 * @checkpoint unblacklist-conflict-detected
 * Si doc._conflicts existe, appeler handleConflict()
 */

/**
 * @action Mettre à jour l'UI (RÈGLE #8)
 * @checkpoint unblacklist-complete
 * - Toast: "[nom] a été retiré de la blacklist"
 - Supprimer contact de this.contacts
 * - Mettre à jour compteur
 * - syncStatus = 'syncing' puis 'paused' quand sync fait (RÈGLE #9)
 */

/**
 * @action Erreur
 * @checkpoint unblacklist-error
 * Toast: "Erreur: [message]"
 * Gestion erreur 409 (conflit révision) (RÈGLE #10)
 */
```

## PouchDB Operations (RÈGLE #2)

### Lecture (avant modification)

```javascript
// RÈGLE #2: Utiliser db.get() au lieu d'API
// RÈGLE #4: Détecter les conflits avec conflicts: true
// RÈGLE #10: Récupérer _id et _rev
const doc = await this.localDB.get(contactId, { conflicts: true });

// Structure retournée:
// {
//   _id: "contact_123456",
//   _rev: "3-abc123",
//   _conflicts: ["2-xyz789"], // Si conflit détecté (RÈGLE #4)
//   type: "contact",
//   nom: "Lucas Petit",
//   is_blacklisted: 1,
//   ...
// }
```

### Écriture (mise à jour)

```javascript
// RÈGLE #6: Écriture locale d'abord
// RÈGLE #10: Inclure _id et _rev obligatoirement
const updatedDoc = {
  ...doc,
  is_blacklisted: 0,              // Changement: plus blacklisté
  unblacklisted_at: new Date().toISOString(),
  _id: doc._id,                   // RÈGLE #10
  _rev: doc._rev,                 // RÈGLE #10 (obligatoire)
  updated_at: new Date().toISOString()
};

// Suppression propriétés temporaires
// (ne pas inclure dans le doc à sauvegarder)
delete updatedDoc.id;              // Propriété Alpine.js mappée
delete updatedDoc.hasConflicts;   // Flag temporaire
delete updatedDoc._conflicts;      // Pas besoin de le garder

// RÈGLE #2: db.put() au lieu de fetch PUT
const result = await this.localDB.put(updatedDoc);

// result: { ok: true, id: "contact_123456", rev: "4-def456" }
```

### Synchronisation (RÈGLE #3)

```javascript
// La réplication live envoie vers CouchDB automatiquement
// Pas besoin d'appel explicite si sync live est active

// Si besoin de forcer une sync:
// await this.localDB.replicate.to(this.remoteDB);
```

## Implementation complète

```javascript
function contactsBlacklistRemoveManager() {
  return {
    // ───────────────────────────────────────────────
    // ÉTAT ALPINE.JS (RÈGLE #8)
    // ───────────────────────────────────────────────
    contacts: [],
    filteredContacts: [],
    loading: false,
    saving: false,
    error: null,
    
    // ───────────────────────────────────────────────
    // POUCHDB (RÈGLE #1)
    // ───────────────────────────────────────────────
    localDB: null,
    remoteDB: null,
    syncHandler: null,
    
    // ───────────────────────────────────────────────
    // SYNC STATUS (RÈGLE #9)
    // ───────────────────────────────────────────────
    syncStatus: 'idle',
    isOnline: navigator.onLine,
    
    get syncStatusLabel() {
      const labels = {
        idle: 'Initialisation...',
        syncing: 'Synchronisation...',
        paused: this.isOnline ? 'À jour' : 'Hors ligne',
        error: 'Erreur de sync'
      };
      return labels[this.syncStatus] || 'Inconnu';
    },
    
    // ───────────────────────────────────────────────
    // LIFECYCLE (RÈGLE #8)
    // ───────────────────────────────────────────────
    async init() {
      // RÈGLE #1: Initialiser PouchDB
      this.localDB = new PouchDB('marki_contacts');
      this.remoteDB = new PouchDB('https://admin:admin@dev.markidiags.com/data/marki_contacts');
      
      // RÈGLE #3: Démarrer réplication live
      this.startReplication();
      
      // RÈGLE #7: Écouter état réseau
      window.addEventListener('online', () => this.isOnline = true);
      window.addEventListener('offline', () => this.isOnline = false);
    },
    
    // ───────────────────────────────────────────────
    // REPLICATION (RÈGLE #3, #7, #9)
    // ───────────────────────────────────────────────
    startReplication() {
      this.syncHandler = this.localDB.sync(this.remoteDB, {
        live: true,
        retry: true
      })
      .on('active', () => this.syncStatus = 'syncing')
      .on('paused', (err) => this.syncStatus = err ? 'error' : 'paused')
      .on('error', () => this.syncStatus = 'error');
    },
    
    // ───────────────────────────────────────────────
    // REMOVE FROM BLACKLIST (RÈGLE #2, #6, #10)
    // ───────────────────────────────────────────────
    async removeFromBlacklist(contact) {
      // @checkpoint unblacklist-confirm
      const confirmed = confirm(
        `Retirer ${contact.nom} ${contact.prenom} de la blacklist ?\n\n` +
        `Le contact recevra à nouveau les relances automatiques.`
      );
      
      if (!confirmed) return;
      
      this.saving = true;
      console.log('[CHECKPOINT] unblacklist-pouchdb-get');
      
      try {
        // RÈGLE #2: Récupérer via PouchDB (pas d'API)
        // RÈGLE #4: Détecter conflits
        // RÈGLE #10: Récupérer _id et _rev
        const doc = await this.localDB.get(contact._id || contact.id, { 
          conflicts: true 
        });
        
        // RÈGLE #4: Gérer conflit si détecté
        if (doc._conflicts && doc._conflicts.length > 0) {
          console.log('[CHECKPOINT] unblacklist-conflict-detected');
          await this.handleConflict(doc._id, { is_blacklisted: 0 });
          return;
        }
        
        console.log('[CHECKPOINT] unblacklist-pouchdb-put');
        
        // RÈGLE #6: Mise à jour locale
        // RÈGLE #10: Inclure _id et _rev
        await this.localDB.put({
          ...doc,
          is_blacklisted: 0,
          unblacklisted_at: new Date().toISOString(),
          _id: doc._id,
          _rev: doc._rev
        });
        
        // @checkpoint unblacklist-complete
        console.log('[CHECKPOINT] unblacklist-complete');
        
        // RÈGLE #8: Mettre à jour UI
        this.contacts = this.contacts.filter(c => 
          (c._id || c.id) !== (contact._id || contact.id)
        );
        this.filteredContacts = this.filteredContacts.filter(c => 
          (c._id || c.id) !== (contact._id || contact.id)
        );
        
        // Toast
        if (typeof Alpine !== 'undefined' && Alpine.store('ui')) {
          Alpine.store('ui').addToast(
            `${contact.nom} ${contact.prenom} a été retiré de la blacklist`, 
            'success'
          );
        }
        
        // RÈGLE #9: Le syncStatus passera automatiquement à 'syncing' 
        // puis 'paused' quand la réplication sera faite
        
      } catch (error) {
        // @checkpoint unblacklist-error
        console.log('[CHECKPOINT] unblacklist-error:', error);
        
        // RÈGLE #10: Gestion erreur 409 (conflit révision)
        if (error.status === 409) {
          this.error = 'Conflit de version. Rechargez et réessayez.';
        } else {
          this.error = error.message;
        }
        
        if (typeof Alpine !== 'undefined' && Alpine.store('ui')) {
          Alpine.store('ui').addToast(this.error, 'error');
        }
        
      } finally {
        this.saving = false;
      }
    },
    
    // ───────────────────────────────────────────────
    // CONFLICT HANDLING (RÈGLE #4)
    // ───────────────────────────────────────────────
    async handleConflict(docId, updates) {
      const doc = await this.localDB.get(docId, { conflicts: true });
      const conflictRevs = doc._conflicts || [];
      
      if (conflictRevs.length === 0) return;
      
      // Récupérer versions en conflit
      const conflictingDocs = await Promise.all(
        conflictRevs.map(rev => this.localDB.get(docId, { rev }))
      );
      
      // Stratégie: garder is_blacklisted: 0 (priorité action utilisateur)
      const merged = {
        ...doc,
        ...updates,
        _conflict_resolved_at: new Date().toISOString()
      };
      
      // Supprimer révisions conflictuelles
      for (const rev of conflictRevs) {
        await this.localDB.remove(docId, rev);
      }
      
      // Sauvegarder version fusionnée
      await this.localDB.put({
        ...merged,
        _rev: doc._rev
      });
      
      if (typeof Alpine !== 'undefined' && Alpine.store('ui')) {
        Alpine.store('ui').addToast('Conflit résolu', 'warning');
      }
    }
  };
}
```

## UI avec Indicateur Sync (RÈGLE #9)

```html
<div x-data="contactsBlacklistRemoveManager()" x-init="init()">
  
  <!-- Indicateur de sync (RÈGLE #9) -->
  <div class="flex items-center gap-2 text-sm mb-4">
    <span class="w-2 h-2 rounded-full" 
          :class="syncStatus === 'syncing' ? 'bg-blue-500 animate-pulse' : 
                  syncStatus === 'error' ? 'bg-red-500' : 
                  isOnline ? 'bg-green-500' : 'bg-yellow-500'">
    </span>
    <span x-text="syncStatusLabel"></span>
  </div>
  
  <!-- Liste des contacts -->
  <template x-for="contact in contacts" :key="contact._id || contact.id">
    <div class="flex items-center justify-between p-4 border">
      <div>
        <span x-text="contact.nom + ' ' + contact.prenom"></span>
        <span class="text-red-600 text-sm">(Blacklisted)</span>
      </div>
      
      <button @click="removeFromBlacklist(contact)" 
              :disabled="saving"
              class="text-green-600 hover:underline disabled:opacity-50">
        <span x-show="!saving">Retirer de la blacklist</span>
        <span x-show="saving">Traitement...</span>
      </button>
    </div>
  </template>
  
</div>
```

## Design Document (RÈGLE #5)

```javascript
// À créer dans PouchDB pour les requêtes
const designDoc = {
  _id: '_design/contacts',
  views: {
    by_blacklist: {
      map: function(doc) {
        if (doc.type === 'contact' && doc.is_blacklisted === 1) {
          emit(doc._id, doc);
        }
      }.toString()
    },
    all_contacts: {
      map: function(doc) {
        if (doc.type === 'contact') {
          emit(doc._id, doc);
        }
      }.toString()
    }
  }
};
```

## Comparaison Avant/Après

| Aspect | Avant (API) | Après (PouchDB) |
|--------|-------------|-----------------|
| **Lecture** | `fetch('/api/contacts/{id}')` | `localDB.get(id, {conflicts: true})` (RÈGLE #2) |
| **Écriture** | `fetch PUT /api/contacts/{id}` | `localDB.put({...doc, _rev})` (RÈGLE #2, #6) |
| **ID** | `contact.id` (numérique) | `contact._id` (string CouchDB) (RÈGLE #10) |
| **Sync** | Manuelle (refresh page) | Live automatique (RÈGLE #3) |
| **Offline** | Erreur | Queue différée (RÈGLE #7) |
| **Conflits** | Ignorés | Détectés et gérés (RÈGLE #4) |

## Checkpoints

| Checkpoint | Description |
|------------|-------------|
| `unblacklist-confirm` | Dialog de confirmation affiché |
| `unblacklist-pouchdb-get` | Document récupéré depuis PouchDB local |
| `unblacklist-conflict-detected` | Conflit détecté sur le document |
| `unblacklist-pouchdb-put` | Document mis à jour en local |
| `unblacklist-complete` | Contact retiré de la liste UI, toast affiché |
| `unblacklist-error` | Erreur lors de l'opération (409 ou autre) |

## Notes

- **RÈGLE #6**: La mise à jour est immédiate en local. La réplication vers CouchDB se fait en arrière-plan.
- **RÈGLE #7**: Si hors ligne, l'opération reste en local et sync dès que la connexion revient.
- **RÈGLE #10**: Toujours utiliser `contact._id` (pas `contact.id`) pour les opérations PouchDB.
- **RÈGLE #4**: Le flag `hasConflicts` peut être affiché dans l'UI pour alerter l'utilisateur.
