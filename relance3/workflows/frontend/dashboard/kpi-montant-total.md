---
id: dashboard-kpi-montant-total
type: frontend
folder: specs/workflows/frontend/dashboard/
description: Calculer et afficher le montant HT total des factures en attente via PouchDB
depends_on: [auth-check]
screen: dashboard
global: false
mockup_entry: specs/mockups/dashboard.html
---

# KPI Montant Total (HT) - PouchDB

## Description

Calculer le montant HT total de toutes les factures ayant un reste à payer supérieur à 0 depuis **PouchDB local** et afficher la valeur formatée dans la card KPI.

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
 * @action Filtrer et extraire les montants HT des factures en attente
 * @checkpoint montants-extracted, tableau des montants HT
 * 
 * Calcul:
 * const factures = result.rows
 *   .map(row => row.doc)
 *   .filter(f => f.reste_a_payer > 0);
 * 
 * const montantsHT = factures.map(f => f.montant_ht || f.montant_total);
 */

/**
 * @action Calculer la somme totale des montants HT
 * @checkpoint total-calculated, montant total calculé
 * 
 * Calcul:
 * const totalHT = montantsHT.reduce((sum, m) => sum + m, 0);
 */

/**
 * @action Formater le montant en devise EUR
 * @checkpoint amount-formatted, montant formaté avec symbole €
 * 
 * Format:
 * new Intl.NumberFormat('fr-FR', {
 *   style: 'currency',
 *   currency: 'EUR'
 * }).format(totalHT);
 */

/**
 * @action Mettre à jour l'état Alpine.js kpis.montantTotal
 * @checkpoint state-updated, valeur formatée affichée
 */

/**
 * @action Afficher le label "HT · DSO: 42 jours"
 * @checkpoint label-visible, indicateur HT et DSO affiché
 */
```

## PouchDB Operations

### Récupérer et calculer le montant total

```javascript
async calculateMontantTotal() {
  const result = await db.allDocs({
    startkey: 'facture:',
    endkey: 'facture:\ufff0',
    include_docs: true
  });
  
  // Filtrer les factures avec reste à payer et calculer le total
  const totalHT = result.rows
    .map(row => row.doc)
    .filter(f => f.reste_a_payer > 0)
    .reduce((sum, f) => {
      // Priorité au montant HT, fallback sur montant_total
      const montant = f.montant_ht || f.montant_total || 0;
      return sum + montant;
    }, 0);
  
  // Mettre à jour le KPI
  this.kpis.montantTotal = totalHT;
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
    // Vérifier si le montant ou reste_a_payer a changé
    const montantChanged = change.doc.montant_ht || change.doc.montant_total;
    const resteChanged = change.doc.reste_a_payer;
    
    if (montantChanged || resteChanged) {
      // Recalculer le KPI
      this.calculateMontantTotal();
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
  },
  fields: ['montant_ht', 'montant_total', 'reste_a_payer']
});

const totalHT = result.docs.reduce((sum, f) => {
  const montant = f.montant_ht || f.montant_total || 0;
  return sum + montant;
}, 0);

this.kpis.montantTotal = totalHT;
```

## Calcul Frontend

```javascript
// Récupération des données depuis PouchDB
const result = await db.allDocs({
  startkey: 'facture:',
  endkey: 'facture:\ufff0',
  include_docs: true
});

// Calcul du montant HT total
const totalHT = result.rows
  .map(row => row.doc)
  .filter(f => f.reste_a_payer > 0)
  .reduce((sum, f) => {
    const montant = f.montant_ht || f.montant_total || 0;
    return sum + montant;
  }, 0);

// Mise à jour du KPI
this.kpis.montantTotal = totalHT;
```

## Structure des documents PouchDB (facture)

```javascript
{
  "_id": "facture:550e8400-...",
  "_rev": "1-abc123...",
  "type": "facture",
  "id": "F123",
  "montant_ht": 1250.00,
  "montant_total": 1500.00,
  "reste_a_payer": 1500.00,
  "contact_id": "contact:..."
}
```

## Formatage

```javascript
formatMoney(amount) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}
```

## Interface utilisateur

| Élément | Sélecteur | Action |
|---------|-----------|--------|
| Valeur KPI | `[x-text="formatMoney(kpis.montantTotal)"]` | Afficher "128 500,00 €" |
| Label | `<p class="text-xs text-slate-400">` | Afficher "HT · DSO: 42 jours" |
| Tooltip | `.fa-info-circle[title]` | Hover = "Montant HT total des factures" |

## Error Handling

| Cas | Comportement |
|-----|--------------|
| PouchDB non disponible | Afficher "—" ou message d'erreur |

---

## Migration depuis l'ancienne API

| Aspect | Avant (API) | Après (PouchDB) |
|--------|-------------|-----------------|
| Source données | `GET /api/factures?reste_a_payer_gt=0` | PouchDB local |
| Réponse | `{ data: [...], meta: { sum_montant_ht: N } }` | `reduce()` côté client |
| Somme | Calculée par backend | Calculée par frontend |
| Mise à jour | Rechargement manuel | Temps réel via `db.changes()` |
| Latence | ~100-300ms | ~5-20ms (local) |
| Offline | ❌ Impossible | ✅ Fonctionne offline |
