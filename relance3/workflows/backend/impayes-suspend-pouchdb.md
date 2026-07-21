---
id: impayes-suspend-pouchdb
type: backend
description: Suspendre un impayé avec PouchDB/CouchDB - Gestion offline-first
---

# impayes-suspend-pouchdb : Suspendre un Impayé (Architecture PouchDB)

## Description

Suspendre un impayé (le "blacklister") en utilisant l'architecture **PouchDB/CouchDB** avec pattern **offline-first**.

Différences avec l'ancien workflow API REST:
- Pas d'endpoint `/api/impayes/:id/suspend` direct
- Le client PouchDB modifie localement, la réplication envoie à CouchDB
- Gestion des conflits via `_rev` et stratégies de merge
- État de suspension synchronisé automatiquement

---

## Architecture Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                         CLIENT                              │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐      │
│  │   Alpine    │───▶│   PouchDB   │───▶│   CouchDB   │      │
│  │   Button    │    │   Local     │    │   Remote    │      │
│  │ "Suspendre" │    │  (IndexedDB)│    │   (Server)  │      │
│  └─────────────┘    └─────────────┘    └─────────────┘      │
│                           │ Sync Live  │                    │
│                           │ (push)     │                    │
└───────────────────────────┼────────────┼────────────────────┘
                            │            │
                            ▼            ▼
                    ┌─────────────────────────┐
                    │   Trigger CouchDB       │
                    │   (optionnel)           │
                    │   - webhook             │
                    │   - changes feed        │
                    │   - validate_doc_update │
                    └─────────────────────────┘
```

---

## Étapes Workflow Frontend (PouchDB)

```javascript
/**
 * @action 1: Récupérer le document depuis PouchDB local
 * @checkpoint impaye-fetched-local
 * 
 * Utilise db.get() sur la base locale (lecture instantanée)
 */
const doc = await this.db.get(impayeId, { conflicts: true });
// Retourne: { _id, _rev, type, statut, is_suspended, ... }

/**
 * @action 2: Vérifier les conflits existants
 * @checkpoint conflicts-checked
 * 
 * Si _conflicts présent, résoudre avant modification
 */
if (doc._conflicts && doc._conflicts.length > 0) {
  await resolveConflict(this.db, impayeId);
  doc = await this.db.get(impayeId); // Re-fetch après résolution
}

/**
 * @action 3: Mettre à jour le document localement
 * @checkpoint local-update-ready
 * 
 * Prépare les champs de suspension
 */
const suspendedDoc = {
  ...doc,
  is_suspended: true,
  statut: 'suspended',
  blacklist_motif: motif,
  blacklist_raison: raison,
  suspended_at: new Date().toISOString(),
  suspended_by: currentUser.id,
  // IMPORTANT: Garder _rev pour le contrôle de concurrence
};

/**
 * @action 4: Sauvegarder dans PouchDB local
 * @checkpoint local-save-success
 * 
 * Écriture instantanée dans IndexedDB
 */
try {
  const response = await this.db.put(suspendedDoc);
  // response: { ok: true, id: "impaye_123", rev: "2-abc..." }
  
  console.log('[CHECKPOINT] impaye-suspended-locally', response);
} catch (err) {
  if (err.status === 409) {
    // Conflit de révision, récupérer latest et retry
    const latest = await this.db.get(impayeId);
    suspendedDoc._rev = latest._rev;
    const response = await this.db.put(suspendedDoc);
  }
}

/**
 * @action 5: Mettre à jour l'UI immédiatement (optimistic update)
 * @checkpoint ui-updated
 * 
 * Le document est déjà visible comme suspendu
 */
this.impayes = this.impayes.filter(i => i._id !== impayeId);

/**
 * @action 6: Écouter la confirmation de réplication
 * @checkpoint sync-confirmed (optionnel)
 * 
 * La réplication se fait automatiquement, mais on peut
 * écouter les événements pour afficher le statut
 */
this.db.replicate.to(remoteDB, { retry: true })
  .on('complete', (info) => {
    console.log('[CHECKPOINT] impaye-synced-to-server', info);
    // Afficher badge "Synchronisé"
  })
  .on('error', (err) => {
    console.error('[SYNC] Échec:', err);
    // Garder en file d'attente, retry automatique
  });
```

---

## Étapes Workflow Backend (CouchDB)

### Option 1: Validate Document Update (Recommended)

```javascript
// _design/impayes - validate_doc_update
{
  "validate_doc_update": `
    function(newDoc, oldDoc, userCtx) {
      // Vérifier permissions
      if (!userCtx.roles.includes('admin') && 
          !userCtx.roles.includes('agent')) {
        throw({ forbidden: 'Permission insuffisante' });
      }
      
      // Validation métier
      if (newDoc.is_suspended && !newDoc.blacklist_motif) {
        throw({ forbidden: 'Motif de suspension requis' });
      }
      
      // Log automatique
      if (newDoc.is_suspended && !oldDoc.is_suspended) {
        newDoc.suspension_history = oldDoc.suspension_history || [];
        newDoc.suspension_history.push({
          at: newDoc.suspended_at,
          by: newDoc.suspended_by,
          motif: newDoc.blacklist_motif
        });
      }
    }
  `
}
```

### Option 2: Changes Feed (Webhook)

```javascript
// backend-worker.js - Écoute les changements CouchDB
const changes = couchDb.changes({
  since: 'now',
  feed: 'continuous',
  filter: 'impayes/suspension_changes'
});

changes.on('change', async (change) => {
  const doc = await couchDb.get(change.id);
  
  if (doc.is_suspended && doc.suspended_at) {
    // Actions côté serveur:
    // 1. Annuler les relances programmées
    await cancelRelancesForImpaye(doc._id);
    
    // 2. Logger l'action
    await logSuspension(doc);
    
    // 3. Notifier les autres clients (si nécessaire)
    await notifyClients('impaye_suspended', doc);
  }
});
```

### Option 3: HTTP API (Compatibilité legacy)

```javascript
// routes.js - Si besoin d'un endpoint HTTP
app.post('/api/impayes/:id/suspend', async (req, res) => {
  // Cette API modifie directement CouchDB
  // Les clients PouchDB recevront la mise à jour via sync
  
  try {
    const doc = await couchDb.get(req.params.id);
    
    const updated = await couchDb.insert({
      ...doc,
      is_suspended: true,
      blacklist_motif: req.body.motif,
      suspended_at: new Date().toISOString(),
      suspended_by: req.user.id
    });
    
    // Les clients PouchDB synceront automatiquement
    res.json({ success: true, id: updated.id, rev: updated.rev });
    
  } catch (err) {
    res.status(409).json({ error: 'Conflit de révision', conflict: true });
  }
});
```

---

## Gestion des Conflits

```javascript
/**
 * Stratégie de résolution de conflits pour la suspension
 * Priorité: État suspendu > non suspendu (sécurité)
 */
async function resolveSuspensionConflict(db, impayeId) {
  const doc = await db.get(impayeId, { conflicts: true });
  
  // Récupérer toutes les révisions conflictuelles
  const conflicts = await Promise.all(
    doc._conflicts.map(rev => db.get(impayeId, { rev }))
  );
  
  // Fusion: si UNE version est suspendue, le document reste suspendu
  const isSuspended = [doc, ...conflicts].some(d => d.is_suspended);
  
  const merged = {
    ...doc,
    is_suspended: isSuspended,
    // Historique fusionné
    suspension_history: [
      ...(doc.suspension_history || []),
      ...(conflicts.flatMap(c => c.suspension_history || []))
    ]
  };
  
  // Supprimer les révisions conflictuelles
  for (const rev of doc._conflicts) {
    await db.remove(impayeId, rev);
  }
  
  // Sauvegarder la version fusionnée
  delete merged._conflicts;
  await db.put(merged);
  
  return merged;
}
```

---

## Design Document CouchDB

```javascript
// _design/impayes
{
  _id: '_design/impayes',
  
  // Vue pour les impayés suspendus
  views: {
    suspended: {
      map: "function(doc) { if(doc.is_suspended) emit(doc.suspended_at, doc); }"
    },
    by_motif: {
      map: "function(doc) { if(doc.is_suspended && doc.blacklist_motif) emit(doc.blacklist_motif, 1); }",
      reduce: "_count"
    }
  },
  
  // Filtre pour le changes feed
  filters: {
    suspension_changes: "function(doc, req) { return doc.is_suspended !== undefined; }"
  },
  
  // Validation des modifications
  validate_doc_update: "function(newDoc, oldDoc, userCtx) { /* ... */ }"
}
```

---

## Comparaison avec l'ancienne architecture

| Aspect | API REST (Avant) | PouchDB/CouchDB (Après) |
|--------|------------------|-------------------------|
| **Lecture** | `GET /api/impayes` (latence réseau) | `db.query()` (instantané, local) |
| **Écriture** | `PUT /api/impayes/:id` (requête HTTP) | `db.put()` (local, puis réplication) |
| **Offline** | Impossible (erreur réseau) | Fonctionne (sync en attente) |
| **Conflits** | Gérés par le serveur | Gérés côté client + serveur |
| **UX** | Loading spinner, latence | Instantané, optimistic updates |
| **Complexité** | Simple requêtes HTTP | Gestion sync + conflits |
| **Scalabilité** | Serveur centralisé | Réplication distribuée |

---

## Checkpoints

| Checkpoint | Description |
|------------|-------------|
| `impaye-fetched-local` | Document récupéré depuis PouchDB local |
| `conflicts-checked` | Vérification des conflits effectuée |
| `local-update-ready` | Document modifié, prêt pour sauvegarde |
| `local-save-success` | Document sauvegardé localement |
| `ui-updated` | Interface mise à jour (optimistic) |
| `impaye-synced-to-server` | Réplication vers CouchDB confirmée |

---

## Fichiers associés

- `../frontend/impayes-suspendus/initial-load-pouchdb.js` - Composant frontend
- `../frontend/impayes-suspendus/README-pouchdb.md` - Guide complet
