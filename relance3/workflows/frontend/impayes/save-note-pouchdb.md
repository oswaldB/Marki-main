# Workflow: Sauvegarder une note (PouchDB Version)

## Description

Version PouchDB du workflow `save-note`. Architecture **local-first** avec réplication live vers CouchDB.

### Principes Clés

| Principe | Implémentation |
|----------|----------------|
| **Local-First** | Toutes les lectures depuis PouchDB local (IndexedDB) |
| **Écritures locales** | `db.put()` en local, réplication async vers CouchDB |
| **Sync bidirectionnelle** | Live sync avec gestion des conflits |
| **Offline-First** | Fonctionne sans connexion, sync au retour online |
| **Conflits résolus** | Stratégie LWW (Last Write Wins) avec fusion des notes |

## Architecture

```
┌─────────────────┐     put()     ┌─────────────────┐
│  Alpine.js UI   │ ─────────────▶ │   PouchDB       │
│                 │               │   (IndexedDB)   │
│  x-data         │ ◀───────────── │                 │
│  syncStatus     │    get()      │  Local-First    │
└─────────────────┘               └────────┬────────┘
                                         │
                    ┌────────────────────┘
                    │ replicate.to/from()
                    ▼
           ┌─────────────────┐
           │   CouchDB       │
           │   (HTTP)        │
           └─────────────────┘
```

## Différences avec l'API REST

| Aspect | REST API | PouchDB |
|--------|----------|---------|
| ID | `id: "imp_001"` | `_id: "impaye_imp_001"` |
| Version | Pas de version | `_rev: "1-abc123def456"` |
| Lecture | `GET /api/impayes/:id` | `db.get(id, {conflicts: true})` |
| Écriture | `PUT /api/impayes/:id` | `db.put(doc)` avec `_rev` |
| Latence | Réseau (~100-500ms) | Local (~1-5ms) |
| Offline | Échec | Succès + sync différée |

## Modèle de Données CouchDB

### Document Impayé
```json
{
  "_id": "impaye_001",
  "_rev": "3-abc123def456",
  "type": "impaye",
  "dossier": "ADTI-2026-001",
  "payeur_id": "payer_123",
  "payeur_nom": "ACME Corp",
  "montant": 15000.00,
  "reste": 15000.00,
  "is_suspended": false,
  "blacklist_motif": null,
  "notes": [
    {
      "_id": "note_1721581200000_a3f9b2",
      "content": "Client contacté par téléphone",
      "created_by": "user_001",
      "created_by_name": "Marie Martin",
      "created_at": "2026-07-21T14:00:00Z",
      "type": "note"
    }
  ],
  "created_at": "2026-07-01T09:00:00Z",
  "updated_at": "2026-07-21T14:30:00Z"
}
```

## États de Synchronisation

```javascript
// Store Alpine: syncStatus
{
  status: 'initializing' | 'connecting' | 'online' | 'offline' | 'syncing' | 'synced' | 'error',
  lastSync: '2026-07-21T14:30:00Z',
  pendingChanges: 0,
  error: null,
  isOnline: true,
  isSyncing: false
}
```

| Événement | Status UI | Indicateur |
|-----------|-----------|--------------|
| `active` | "syncing" | Spinner visible |
| `paused` (sans err) | "synced" | ✅ Dernière sync: now |
| `paused` (avec err) | "offline" | ⚠️ Mode hors ligne |
| `change` | - | Compteur changes |
| `error` | "error" | ❌ Toast erreur |

## Gestion des Conflits

### Détection
```javascript
const doc = await db.get(id, { conflicts: true });
if (doc._conflicts && doc._conflicts.length > 0) {
  // Conflits détectés
}
```

### Résolution (Stratégie LWW)
1. Récupérer toutes les révisions conflictuelles
2. Sélectionner la plus récente (basé sur `updated_at`)
3. Fusionner les notes pour ne pas perdre de données
4. Supprimer les révisions conflictuelles
5. Sauvegarder la version gagnante

### Conflits de Révision (409)
```javascript
try {
  await db.put(doc);
} catch (err) {
  if (err.status === 409) {
    // Récupérer la dernière révision et réessayer
    const latest = await db.get(doc._id);
    doc._rev = latest._rev;
    await db.put(doc);
  }
}
```

## Index Mango (_design documents)

```javascript
// Index sur type pour filtrer les impayés
await db.createIndex({
  index: {
    fields: ['type'],
    name: 'idx-type',
    ddoc: 'impayes-indexes'
  }
});

// Index sur updated_at pour le tri
await db.createIndex({
  index: {
    fields: ['updated_at'],
    name: 'idx-updated',
    ddoc: 'impayes-indexes'
  }
});

// Index sur is_suspended
await db.createIndex({
  index: {
    fields: ['is_suspended'],
    name: 'idx-suspended',
    ddoc: 'impayes-indexes'
  }
});
```

## Utilisation dans HTML

```html
<div x-data="impayesPagePouchDB()" x-init="init()">
  
  <!-- Indicateur de sync -->
  <div class="sync-indicator" :class="syncStatus.status">
    <template x-if="syncStatus.isSyncing">
      <span>🔄 Sync en cours...</span>
    </template>
    <template x-if="syncStatus.status === 'offline'">
      <span>⚠️ Mode hors ligne</span>
    </template>
    <template x-if="syncStatus.status === 'synced'">
      <span>✅ Synchronisé</span>
    </template>
  </div>

  <!-- Liste des impayés -->
  <template x-for="impaye in impayes" :key="impaye._id">
    <div class="impaye-card">
      <span x-text="impaye.dossier"></span>
      <button @click="openNoteModal(impaye)">
        Ajouter note
      </button>
    </div>
  </template>

  <!-- Modal Notes -->
  <div x-show="showNoteModal" class="modal">
    <h3>Nouvelle note</h3>
    
    <!-- Affichage des notes existantes -->
    <div class="notes-list">
      <template x-for="note in sortedNotes" :key="note._id">
        <div class="note">
          <p x-text="note.content"></p>
          <small x-text="note.created_by_name + ' - ' + note.created_at"></small>
        </div>
      </template>
    </div>

    <!-- Formulaire nouvelle note -->
    <textarea 
      x-model="noteContent" 
      placeholder="Votre note..."
      :disabled="loading || !syncStatus.isOnline">
    </textarea>
    
    <button 
      @click="saveNote(selectedImpaye._id, noteContent)"
      :disabled="loading || !noteContent.trim()">
      <span x-show="!loading">Sauvegarder (local)</span>
      <span x-show="loading">Sauvegarde...</span>
    </button>
    
    <button @click="closeNoteModal()">Annuler</button>
  </div>
</div>

<!-- Dépendances -->
<script src="https://cdn.jsdelivr.net/npm/pouchdb@8.0.1/dist/pouchdb.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/pouchdb@8.0.1/dist/pouchdb.find.min.js"></script>
<script type="module" src="save-note-pouchdb.js"></script>
```

## Dépendances

```html
<!-- PouchDB Core -->
<script src="https://cdn.jsdelivr.net/npm/pouchdb@8.0.1/dist/pouchdb.min.js"></script>

<!-- Plugin pouchdb-find pour Mango queries -->
<script src="https://cdn.jsdelivr.net/npm/pouchdb@8.0.1/dist/pouchdb.find.min.js"></script>
```

## Configuration CouchDB

### CORS (obligatoire pour le navigateur)
```bash
curl -X PUT http://admin:password@localhost:5984/_config/httpd/enable_cors -d '"true"'
curl -X PUT http://admin:password@localhost:5984/_config/cors/origins -d '"*"'
curl -X PUT http://admin:password@localhost:5984/_config/cors/credentials -d '"true"'
curl -X PUT http://admin:password@localhost:5984/_config/cors/methods -d '"GET, PUT, POST, DELETE, OPTIONS"'
curl -X PUT http://admin:password@localhost:5984/_config/cors/headers -d '"accept, authorization, content-type, origin, referer"'
```

### Créer la base
```bash
curl -X PUT http://admin:password@localhost:5984/impayes
```

## Points d'attention

### ⚠️ IDs CouchDB
- Toujours utiliser `_id` (pas `id`)
- Préfixer par le type: `impaye_`, `note_`, `payer_`, etc.
- Format: `{type}_{timestamp}_{random}`

### ⚠️ Révisions (_rev)
- Toujours inclure `_rev` lors des mises à jour
- Le `_rev` change à chaque modification
- Erreur 409 si `_rev` obsolète

### ⚠️ Taille de la base locale
- Utiliser `auto_compaction: true`
- Limiter `revs_limit: 50`
- Nettoyer les attachments si non nécessaires

### ⚠️ Permissions CouchDB
- Configurer `_security` document
- Utiliser auth JWT ou basic
- CORS obligatoire pour navigateur

## Fichiers

```
workflows/frontend/impayes/
├── save-note.md                    # Documentation originale
├── save-note-pouchdb.md            # Documentation PouchDB (ce fichier)
└── save-note-pouchdb.js            # Implémentation PouchDB
```

## Comparaison Code

### Avant (REST API)
```javascript
async saveNote(impayeId, content) {
  const response = await fetch(`/api/impayes/${impayeId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notes: updatedNotes })
  });
  const data = await response.json();
  // Attente réseau obligatoire
}
```

### Après (PouchDB)
```javascript
async saveNote(impayeId, content) {
  const doc = await this.localDB.get(impayeId, { conflicts: true });
  // Gérer conflits si nécessaire...
  
  const putResult = await this.localDB.put({
    ...doc,
    notes: updatedNotes,
    _rev: doc._rev  // Important!
  });
  // Instantané! La sync se fait en arrière-plan
}
```

## Notes

- **Pas d'UUID côté client** : Les IDs sont générés avec timestamp + random
- **Conflits résolus auto** : Stratégie LWW sur `updated_at` avec fusion des notes
- **Real-time** : Changes feed pour màj temps réel de l'UI
- **Offline** : Toutes les opérations fonctionnent sans réseau
- **Eventual consistency** : Les données peuvent différer temporairement entre devices
