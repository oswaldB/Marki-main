---
id: sequences-create-pouchdb
type: frontend
folder: workflows/frontend/sequences/
description: Créer une séquence avec PouchDB (local-first + sync CouchDB)
depends_on: [pouchdb-init]
screen: sequences
global: false
sync_mode: live
---

# create-sequence-pouchdb : Création de Séquence (Local-First)

## Description

Version PouchDB du workflow `create-sequence`. Architecture local-first avec réplication live vers CouchDB.

### Principes Clés

- **Local-First** : Toutes les lectures depuis PouchDB local (instantané)
- **Écritures locales** : `db.put()` en local, réplication async vers CouchDB
- **Sync bidirectionnelle** : Live sync avec gestion des conflits
- **Offline-First** : Fonctionne sans connexion, sync au retour online
- **Conflits** : Résolution automatique LWW (Last Write Wins)

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

## Étapes du Workflow

```javascript
/**
 * @action Initialiser PouchDB et la réplication CouchDB
 * @checkpoint pouchdb-initialized
 * 
 * - Création instance PouchDB local
 * - Configuration sync live vers CouchDB
 * - Setup listeners 'active'/'paused'/'change'/'error'
 */

/**
 * @action Créer les index Mango (_design docs)
 * @checkpoint mango-indexes-created
 * 
 * - Index sur type_sequence, actif, created_at
 * - Index sur nom pour recherche
 * - Index sur ordre pour tri
 */

/**
 * @action Valider les données du formulaire
 * @checkpoint validation-passed
 */

/**
 * @action Préparer le document CouchDB avec _id
 * @checkpoint document-prepared
 * 
 * Format ID: sequence_<timestamp>_<random>
 * Ajout propriétés _id, _rev, type, timestamps
 */

/**
 * @action Écrire en local PouchDB via db.put()
 * @checkpoint sequence-created-local
 * 
 * Écriture instantanée, pas d'attente réseau
 * Le document est immédiatement disponible en lecture
 */

/**
 * @action Mettre à jour l'UI avec les données locales
 * @checkpoint ui-updated-local
 * 
 * Ajout dans Alpine.store('sequences')
 * Fermeture modal
 * Notification succès
 */

/**
 * @action Réplication automatique vers CouchDB (arrière-plan)
 * @checkpoint sync-queued
 * 
 * La réplication live s'occupe de propager les changements
 * L'utilisateur n'attend pas la confirmation réseau
 */

/**
 * @action Gérer les conflits si erreur 409
 * @checkpoint conflict-resolved
 * 
 * Stratégie: LWW avec fusion des données
 * Suppression des révisions conflictuelles
 */
```

## Modèle de Données CouchDB

```json
{
  "_id": "sequence_1721581200000_a3f9b2",
  "_rev": "1-abc123def456",
  "type": "sequence",
  "nom": "Séquence Relance Standard",
  "type_sequence": "relances",
  "actif": true,
  "emails": [],
  "validation_obligatoire": false,
  "ordre": 0,
  "created_at": "2026-07-21T14:00:00Z",
  "updated_at": "2026-07-21T14:00:00Z",
  "_local": false
}
```

## Store Alpine : syncStatus

```javascript
Alpine.store('sync', {
  status: 'connecting' | 'syncing' | 'synced' | 'offline' | 'error',
  lastSync: Date | null,
  pendingChanges: number,
  error: string | null,
  isOnline: boolean,
  isSyncing: boolean
})
```

## API PouchDB vs REST

| Opération | REST API | PouchDB |
|-----------|----------|---------|
| Créer | `POST /api/sequences` | `db.put(doc)` |
| Lire | `GET /api/sequences/:id` | `db.get(id)` |
| Liste | `GET /api/sequences` | `db.find({selector})` |
| Modifier | `PUT /api/sequences/:id` | `db.put(doc)` avec `_rev` |
| Supprimer | `DELETE /api/sequences/:id` | `db.remove(doc)` |

## Gestion des États de Sync

| Événement | Status UI | Action |
|-----------|-----------|--------|
| `active` | "syncing" | Indicateur de sync visible |
| `paused` (sans err) | "synced" | Dernière sync: now |
| `paused` (avec err) | "offline" | Mode offline détecté |
| `change` | - | Mettre à jour pendingChanges |
| `error` | "error" | Toast d'erreur |

## Fichiers

```
workflows/frontend/sequences/
├── create-sequence-pouchdb.js    # Implémentation (ce fichier)
└── create-sequence-pouchdb.md      # Documentation
```

## Utilisation dans HTML

```html
<div x-data="sequencesPagePouchDB()" x-init="init()">
  <!-- Indicateur de sync -->
  <div x-show="isSyncing" class="sync-indicator">
    <span>Sync...</span>
  </div>
  
  <div x-show="!isOnline" class="offline-badge">
    Mode hors ligne
  </div>

  <!-- Bouton création -->
  <button @click="openNewSequenceModal()" 
          :disabled="!isOnline">
    Nouvelle Séquence
  </button>

  <!-- Modal -->
  <div x-show="showNewSequenceModal">
    <form @submit.prevent="createSequence()">
      <input x-model="newSequence.nom" required>
      <select x-model="newSequence.type_sequence">
        <option value="relances">Relances</option>
        <option value="suivi">Suivi</option>
      </select>
      <button type="submit" :disabled="loading">
        <span x-show="!loading">Créer (local)</span>
        <span x-show="loading">Création...</span>
      </button>
    </form>
  </div>
</div>

<!-- Scripts -->
<script src="https://cdn.jsdelivr.net/npm/pouchdb@8.0.1/dist/pouchdb.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/pouchdb@8.0.1/dist/pouchdb.find.min.js"></script>
<script type="module" src="create-sequence-pouchdb.js"></script>
```

## Dépendances

```html
<!-- PouchDB Core -->
<script src="https://cdn.jsdelivr.net/npm/pouchdb@8.0.1/dist/pouchdb.min.js"></script>

<!-- Plugin pouchdb-find pour Mango queries -->
<script src="https://cdn.jsdelivr.net/npm/pouchdb@8.0.1/dist/pouchdb.find.min.js"></script>
```

## Configuration

```javascript
// Variables d'environnement
window.env = {
  COUCHDB_URL: 'http://localhost:5984/sequences',
  COUCHDB_USER: 'admin',
  COUCHDB_PASS: 'password'
};
```

## Notes

- **Pas d'UUID côté client** : Les IDs sont générés avec timestamp + random
- **Conflits résolus auto** : Stratégie LWW sur updated_at
- **Real-time** : Changes feed pour màj temps réel de l'UI
- **Offline** : Toutes les opérations fonctionnent sans réseau
- **Eventual consistency** : Les données peuvent différer temporairement entre devices
