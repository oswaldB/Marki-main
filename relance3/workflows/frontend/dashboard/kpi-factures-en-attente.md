---
id: dashboard-kpi-factures-en-attente
type: frontend
folder: specs/workflows/frontend/dashboard/
description: Calculer et afficher le nombre de factures en attente (reste à payer > 0) via PouchDB
depends_on: [auth-check]
screen: dashboard
global: false
mockup_entry: specs/mockups/dashboard.html
---

# KPI Factures en Attente - PouchDB

## Description

Calculer le nombre de factures ayant un reste à payer supérieur à 0 depuis **PouchDB local** et afficher la valeur dans la card KPI.

## Étapes

```javascript
/**
 * @action Configurer le listener PouchDB pour les changements
 * @checkpoint changes-listener-active, écoute temps réel activée
 * 
 * Code:
 * db.changes({ since: 'now', live: true, include_docs: true })
 *   .on('change', (change) => { recalculer si facture modifiée });
 */

/**
 * @action Récupérer toutes les factures depuis PouchDB
 * @checkpoint factures-fetched, données locales chargées
 * 
 * Query:
 * const result = await db.allDocs({
 *   startkey: 'facture:',
 *   endkey: 'facture:\ufff0',
 *   include_docs: true
 * });
 */

/**
 * @action Filtrer les factures où reste_a_payer > 0
 * @checkpoint factures-filtered, tableau filtré des factures en attente
 * 
 * Calcul:
 * const facturesEnAttente = result.rows
 *   .map(row => row.doc)
 *   .filter(f => f.reste_a_payer > 0);
 */

/**
 * @action Compter le nombre de factures filtrées
 * @checkpoint count-calculated, nombre total calculé
 * 
 * Calcul:
 * const count = facturesEnAttente.length;
 */

/**
 * @action Mettre à jour l'état Alpine.js kpis.facturesEnAttente
 * @checkpoint state-updated, valeur affichée dans la card KPI
 */

/**
 * @action Afficher le tooltip au hover sur l'icône info
 * @checkpoint tooltip-visible, tooltip "Factures avec reste à payer > 0" affiché
 */
```

## PouchDB Operations

### Récupérer et compter les factures en attente

```javascript
async calculateFacturesEnAttente() {
  const result = await db.allDocs({
    startkey: 'facture:',
    endkey: 'facture:\ufff0',
    include_docs: true
  });
  
  // Filtrer les factures avec reste à payer > 0
  const facturesEnAttente = result.rows
    .map(row => row.doc)
    .filter(f => f.reste_a_payer > 0);
  
  // Mettre à jour le KPI
  this.kpis.facturesEnAttente = facturesEnAttente.length;
}
```

### Live Sync (mise à jour temps réel)

```javascript
// Recalculer automatiquement sur changements
db.changes({
  since: 'now',
  live: true,
  include_docs: true
}).on('change', (change) => {
  if (change.doc.type === 'facture') {
    // Vérifier si le reste_a_payer a changé
    const newReste = change.doc.reste_a_payer;
    const oldReste = change._deleted ? 0 : (change._rev.startsWith('1-') ? 0 : change.doc._reste_a_payer);
    
    if (newReste > 0 || oldReste > 0) {
      // Recalculer le KPI
      this.calculateFacturesEnAttente();
    }
  }
});
```

### Option: Mango Query avec pouchdb-find

```javascript
// Alternative avec pouchdb-find (nécessite index)
const result = await db.find({
  selector: {
    type: { $eq: 'facture' },
    reste_a_payer: { $gt: 0 }
  }
});

this.kpis.facturesEnAttente = result.docs.length;
```

### Créer l'index Mango (optionnel)

```javascript
// Créer un index pour optimiser les requêtes
await db.createIndex({
  index: {
    fields: ['type', 'reste_a_payer']
  },
  name: 'idx-factures-reste'
});
```

## Calcul Frontend

```javascript
// Récupération des données depuis PouchDB
const result = await db.allDocs({
  startkey: 'facture:',
  endkey: 'facture:\ufff0',
  include_docs: true
});

// Mise à jour du KPI
this.kpis.facturesEnAttente = result.rows
  .map(row => row.doc)
  .filter(f => f.reste_a_payer > 0)
  .length;
```

## Structure des documents PouchDB (facture)

```javascript
{
  "_id": "facture:550e8400-...",
  "_rev": "1-abc123...",
  "type": "facture",
  "id": "F123",
  "nfacture": "F-2024-001",
  "reste_a_payer": 1500.00,
  "montant_total": 2500.00,
  "contact_id": "contact:..."
}
```

## Interface utilisateur

| Élément | Sélecteur | Action |
|---------|-----------|--------|
| Valeur KPI | `[x-text="kpis.facturesEnAttente"]` | Afficher le nombre |
| Tooltip | `.fa-info-circle[title]` | Hover = afficher explication |

## Error Handling

| Cas | Comportement |
|-----|--------------|
| PouchDB non disponible | Afficher "—" ou message d'erreur |
| Pas de factures | Afficher "0" |

---

## Migration depuis l'ancienne API

| Aspect | Avant (API) | Après (PouchDB) |
|--------|-------------|-----------------|
| Source données | `GET /api/factures?reste_a_payer_gt=0` | PouchDB local |
| Réponse | `{ data: [...], meta: { total: N } }` | `result.rows.filter(...).length` |
| Mise à jour | Rechargement manuel | Temps réel via `db.changes()` |
| Latence | ~100-300ms | ~5-20ms (local) |
| Offline | ❌ Impossible | ✅ Fonctionne offline |
