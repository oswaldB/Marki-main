---
id: impayes-suspendus-initial-load
type: frontend
folder: specs/workflows/frontend/impayes-suspendus/
description: Charger la liste des factures suspendues depuis PouchDB avec motifs et dates
depends_on: [auth-check]
screen: impayes-suspendus
global: false
mockup_entry: specs/mockups/impayes-suspendus.html
---

# impayes-suspendus-initial-load : Chargement initial Impayés Suspendus (PouchDB)

## Description

Charger la liste des factures mises en attente (suspendues) depuis **PouchDB local** avec leurs motifs et informations de suspension.

Les données sont synchronisées automatiquement avec CouchDB distant.

## Étapes

```javascript
/**
 * @action Initialiser PouchDB et configurer le sync
 * @checkpoint pouchdb-initialized, base factures prête
 * 
 * Code:
 * this.db = new PouchDB('marki-factures');
 * this.db.sync(remoteUrl, { live: true, retry: true });
 */

/**
 * @action Initialiser les filtres par défaut
 * @checkpoint state-initialized, filters.motif=''
 */

/**
 * @action Afficher le skeleton loader
 * @checkpoint skeleton-shown, tableau en état de chargement
 */

/**
 * @action Récupérer les factures suspendues depuis PouchDB
 * @checkpoint suspendus-fetched, liste des factures en attente reçue
 * 
 * Query:
 * const result = await db.allDocs({
 *   startkey: 'facture:',
 *   endkey: 'facture:\ufff0',
 *   include_docs: true
 * });
 * const suspendus = result.rows
 *   .map(row => row.doc)
 *   .filter(f => f.is_suspended === true);
 */

/**
 * @action Configurer le listener pour les changements temps réel
 * @checkpoint changes-listener-active, mises à jour automatiques
 * 
 * Code:
 * db.changes({ since: 'now', live: true, include_docs: true })
 *   .on('change', (change) => { 
 *     if (change.doc.is_suspended) this.addOrUpdateSuspendu(change.doc);
 *   });
 */

/**
 * @action Extraire les motifs uniques des factures suspendues
 * @checkpoint motifs-extracted, options de filtrage calculées côté client
 * 
 * **Note** : Pas de table `suspension-motifs`. Les motifs sont extraits 
 * des champs `suspension_motif` des factures suspendues elles-mêmes.
 */

/**
 * @action Stocker les données dans le store
 * @checkpoint data-stored, facturesSuspendues et motifs enregistrés
 */

/**
 * @action Rendre le tableau avec les badges de statut
 * @checkpoint table-rendered, colonnes motif/date/option réactivation visibles
 */
```

## PouchDB Operations

### Chargement initial

```javascript
async loadFacturesSuspendues() {
  this.loading = true;
  
  try {
    // Récupérer toutes les factures depuis PouchDB
    const result = await db.allDocs({
      startkey: 'facture:',
      endkey: 'facture:\ufff0',
      include_docs: true
    });
    
    // Filtrer les suspendues côté client
    this.facturesSuspendues = result.rows
      .map(row => row.doc)
      .filter(f => f.is_suspended === true)
      .sort((a, b) => new Date(b.suspended_at) - new Date(a.suspended_at));
    
    // Extraire les motifs uniques pour le filtre
    this.motifsUniques = [...new Set(
      this.facturesSuspendues
        .map(f => f.suspension_motif)
        .filter(m => m) // Exclure null/undefined
    )];
    
  } catch (error) {
    console.error('Erreur chargement factures suspendues:', error);
    this.error = error.message;
  } finally {
    this.loading = false;
  }
}
```

### Live Sync (temps réel)

```javascript
// Écouter les changements sur les factures
db.changes({
  since: 'now',
  live: true,
  include_docs: true
}).on('change', (change) => {
  if (change.doc.type === 'facture') {
    if (change.doc.is_suspended) {
      // Ajouter ou mettre à jour dans la liste
      const index = this.facturesSuspendues.findIndex(f => f._id === change.doc._id);
      if (index >= 0) {
        this.facturesSuspendues[index] = change.doc;
      } else {
        this.facturesSuspendues.unshift(change.doc);
      }
    } else {
      // Retirer de la liste si plus suspendue
      this.facturesSuspendues = this.facturesSuspendues.filter(f => f._id !== change.doc._id);
    }
  }
});
```

### Option: Mango Query

```javascript
const result = await db.find({
  selector: {
    type: { $eq: 'facture' },
    is_suspended: { $eq: true }
  },
  sort: [{ suspended_at: 'desc' }]
});

this.facturesSuspendues = result.docs;
```

## Structure des documents PouchDB

```javascript
{
  "_id": "facture:550e8400-...",
  "_rev": "2-abc123...",
  "type": "facture",
  "id": "F123",
  "nfacture": "F-2024-001",
  "is_suspended": true,
  "suspension_motif": "Client en vacances",
  "suspended_at": "2024-01-15T10:30:00Z",
  "unsuspended_at": null,
  "statut": "suspendue",
  "contact_id": "contact:...",
  "payeur_nom": "ACME Corporation"
}
```

## Mockups de référence

- `specs/mockups/impayes-suspendus.html`

---

## Migration depuis l'ancienne API

| Aspect | Avant (API) | Après (PouchDB) |
|--------|-------------|-----------------|
| Endpoint | `GET /api/impayes?is_suspended=true` | `db.allDocs()` + filtrage côté client |
| Filtrage | Backend `db.search()` | Côté client sur `is_suspended` |
| Motifs | Extraits côté serveur | Extraits côté client avec `new Set()` |
| Temps réel | Polling | `db.changes()` |
| Latence | ~200-500ms | ~10-50ms (local) |
| Offline | ❌ Impossible | ✅ Fonctionne offline |
