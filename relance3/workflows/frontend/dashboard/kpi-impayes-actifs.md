---
id: dashboard-kpi-impayes-actifs
type: frontend
folder: specs/workflows/frontend/dashboard/
description: Calculer et afficher le nombre de factures échues (date d'échéance dépassée) via PouchDB
depends_on: [auth-check]
screen: dashboard
global: false
mockup_entry: specs/mockups/dashboard.html
---

# KPI Impayés Actifs (Factures Échues) - PouchDB

## Description

Calculer le nombre de factures dont la date d'échéance est dépassée (factures échues) depuis **PouchDB local** et afficher la valeur dans la card KPI.

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
 * @action Récupérer les factures depuis PouchDB
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
 * @action Filtrer les factures où date_echeance < NOW() ET reste_a_payer > 0
 * @checkpoint factures-filtered, tableau filtré des factures échues non payées
 * 
 * Calcul:
 * const now = new Date();
 * const facturesEchues = result.rows
 *   .map(row => row.doc)
 *   .filter(f => {
 *     const dateEcheance = new Date(f.date_echeance);
 *     return dateEcheance < now && f.reste_a_payer > 0;
 *   });
 */

/**
 * @action Compter le nombre de factures échues
 * @checkpoint count-calculated, nombre total de factures échues
 * 
 * Calcul:
 * const count = facturesEchues.length;
 */

/**
 * @action Mettre à jour l'état Alpine.js kpis.impayesActifs
 * @checkpoint state-updated, valeur affichée dans la card KPI
 */

/**
 * @action Afficher le label "factures échues" sous le nombre
 * @checkpoint label-visible, texte "factures échues" affiché
 */
```

## PouchDB Operations

### Récupérer et compter les factures échues

```javascript
async calculateImpayesActifs() {
  const result = await db.allDocs({
    startkey: 'facture:',
    endkey: 'facture:\ufff0',
    include_docs: true
  });
  
  const now = new Date();
  
  // Filtrer les factures échues avec reste à payer
  const facturesEchues = result.rows
    .map(row => row.doc)
    .filter(f => {
      const dateEcheance = new Date(f.date_echeance);
      return dateEcheance < now && f.reste_a_payer > 0;
    });
  
  // Mettre à jour le KPI
  this.kpis.impayesActifs = facturesEchues.length;
  
  // Option: stocker les détails pour affichage
  this.facturesEchuesDetails = facturesEchues.map(f => ({
    ...f,
    jours_echus: Math.floor((now - new Date(f.date_echeance)) / (1000 * 60 * 60 * 24))
  }));
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
    const now = new Date();
    const dateEcheance = new Date(change.doc.date_echeance);
    const isEchue = dateEcheance < now;
    const isImpayee = change.doc.reste_a_payer > 0;
    
    if (isEchue && isImpayee) {
      // Recalculer le KPI
      this.calculateImpayesActifs();
    }
  }
});
```

### Option: Mango Query avec pouchdb-find

```javascript
// Alternative avec pouchdb-find (nécessite index)
const today = new Date().toISOString().substring(0, 10);

const result = await db.find({
  selector: {
    type: { $eq: 'facture' },
    reste_a_payer: { $gt: 0 },
    date_echeance: { $lt: today }
  }
});

this.kpis.impayesActifs = result.docs.length;
```

### Créer l'index Mango (optionnel)

```javascript
// Créer un index pour optimiser les requêtes
await db.createIndex({
  index: {
    fields: ['type', 'reste_a_payer', 'date_echeance']
  },
  name: 'idx-factures-echues'
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

const now = new Date();

// Filtrage et comptage
this.kpis.impayesActifs = result.rows
  .map(row => row.doc)
  .filter(f => {
    const dateEcheance = new Date(f.date_echeance);
    return dateEcheance < now && f.reste_a_payer > 0;
  })
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
  "date_echeance": "2024-01-15",
  "reste_a_payer": 1500.00,
  "montant_total": 2500.00,
  "contact_id": "contact:..."
}
```

## Interface utilisateur

| Élément | Sélecteur | Action |
|---------|-----------|--------|
| Valeur KPI | `[x-text="kpis.impayesActifs"]` | Afficher le nombre |
| Label | `<p class="text-xs text-slate-400">` | Afficher "factures échues" |
| Tooltip | `.fa-info-circle[title]` | Hover = "Factures dont la date d'échéance est dépassée" |

## Error Handling

| Cas | Comportement |
|-----|--------------|
| PouchDB non disponible | Afficher "—" ou message d'erreur |
| Empty | Afficher "0" si aucune facture échue |

---

## Migration depuis l'ancienne API

| Aspect | Avant (API) | Après (PouchDB) |
|--------|-------------|-----------------|
| Source données | `GET /api/factures?date_echeance_lt=now&reste_a_payer_gt=0` | PouchDB local |
| Filtrage | Côté serveur | Côté client (date + reste) |
| Réponse | `{ data: [...], meta: { total: N } }` | `filter(...).length` |
| Mise à jour | Rechargement manuel | Temps réel via `db.changes()` |
| Latence | ~100-300ms | ~5-20ms (local) |
| Offline | ❌ Impossible | ✅ Fonctionne offline |
