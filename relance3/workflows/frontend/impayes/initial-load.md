---
id: impayes-initial-load
type: frontend
folder: specs/workflows/frontend/impayes/
description: Charger la liste paginée des factures impayées depuis PouchDB avec filtres et tri
depends_on: [auth-check]
screen: impayes
global: false
mockup_entry: specs/mockups/impayes.html
---

# impayes-initial-load : Chargement initial Liste Impayés (PouchDB)

## Description

Charger la liste des factures impayées depuis **PouchDB local** avec pagination, filtres par défaut et options de tri.

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
 * @action Initialiser l'état de la page avec filtres par défaut
 * @checkpoint state-initialized, page=1, filters vides, tri par date échéance DESC
 */

/**
 * @action Afficher le skeleton loader du tableau
 * @checkpoint skeleton-shown, lignes de chargement visibles
 */

/**
 * @action Récupérer les impayés via PouchDB
 * @checkpoint impayes-fetched, données locales chargées
 * 
 * Query:
 * const result = await db.allDocs({
 *   startkey: 'facture:',
 *   endkey: 'facture:\ufff0',
 *   include_docs: true
 * });
 * 
 * Filtrage côté client:
 * const impayes = result.rows
 *   .map(row => row.doc)
 *   .filter(f => f.reste_a_payer > 0 && f.statut === 'impaye');
 */

/**
 * @action Configurer le listener pour les changements temps réel
 * @checkpoint changes-listener-active, recalcul auto sur modifications
 * 
 * Code:
 * db.changes({ since: 'now', live: true, include_docs: true })
 *   .on('change', () => this.loadImpayes());
 */

/**
 * @action Calculer les statistiques côté frontend depuis les impayés chargés
 * @checkpoint stats-calculated, compteurs total/aReparer calculés
 * 
 * Calcul:
 * const total = impayes.length;
 * const montantTotal = impayes.reduce((s, f) => s + f.reste_a_payer, 0);
 */

/**
 * @action Stocker les impayés dans le store Alpine
 * @checkpoint impayes-stored, store.impayes contient les données
 */

/**
 * @action Rendre le tableau avec les données réelles
 * @checkpoint table-rendered, lignes de factures affichées avec montants formatés
 */

/**
 * @action Mettre à jour la pagination (totalPages, etc.)
 * @checkpoint pagination-updated, contrôles de pagination actifs
 */
```

## PouchDB Operations

### Charger les impayés

```javascript
async loadImpayes() {
  this.loading = true;
  
  try {
    const result = await db.allDocs({
      startkey: 'facture:',
      endkey: 'facture:\ufff0',
      include_docs: true
    });
    
    // Filtrer les impayés côté client
    let impayes = result.rows
      .map(row => row.doc)
      .filter(f => f.reste_a_payer > 0 && f.statut === 'impaye')
      .sort((a, b) => new Date(b.date_echeance) - new Date(a.date_echeance));
    
    // Pagination côté client
    const start = (this.currentPage - 1) * this.perPage;
    const end = start + this.perPage;
    this.impayes = impayes.slice(start, end);
    this.totalPages = Math.ceil(impayes.length / this.perPage);
    
    // Calcul des stats
    this.stats = {
      total: impayes.length,
      montantTotal: impayes.reduce((s, f) => s + f.reste_a_payer, 0)
    };
    
  } catch (error) {
    console.error('Erreur chargement impayés:', error);
    this.error = error.message;
  } finally {
    this.loading = false;
  }
}
```

### Live Sync

```javascript
// Recalculer automatiquement sur changements
db.changes({
  since: 'now',
  live: true,
  include_docs: true
}).on('change', (change) => {
  if (change.doc.type === 'facture') {
    // Vérifier si c'est un impayé
    if (change.doc.reste_a_payer > 0 && change.doc.statut === 'impaye') {
      this.loadImpayes();
    }
  }
});
```

### Option: Mango Query

```javascript
const result = await db.find({
  selector: {
    type: { $eq: 'facture' },
    reste_a_payer: { $gt: 0 },
    statut: { $eq: 'impaye' }
  },
  sort: [{ date_echeance: 'desc' }]
});

this.impayes = result.docs;
```

## Structure des documents PouchDB (facture)

```javascript
{
  "_id": "facture:550e8400-...",
  "_rev": "1-abc123...",
  "type": "facture",
  "id": "F123",
  "nfacture": "F-2024-001",
  "date_echeance": "2024-01-15",
  "montant_total": 2500.00,
  "reste_a_payer": 1500.00,
  "statut": "impaye",
  "contact_id": "contact:..."
}
```

## Mockups de référence

- `specs/mockups/impayes.html`

---

## Migration depuis l'ancienne API

| Aspect | Avant (API) | Après (PouchDB) |
|--------|-------------|-----------------|
| Source | `GET /api/impayes?facture_soldee=0&statut=impaye` | PouchDB local |
| Filtrage | Côté serveur | Côté client |
| Tri | `order_by` paramètre | `sort()` côté client |
| Pagination | `limit`/`offset` | `slice()` côté client |
| Stats | `GET /api/dashboard/stats` | Calcul côté client |
| Temps réel | Polling | `db.changes()` |
| Latence | ~200-500ms | ~10-50ms (local) |
| Offline | ❌ Impossible | ✅ Fonctionne offline |
