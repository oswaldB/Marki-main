---
id: dashboard-kpi-taux-recouvrement
type: frontend
folder: specs/workflows/frontend/dashboard/
description: Calculer et afficher le taux de recouvrement sur les 90 derniers jours glissants via PouchDB
depends_on: [auth-check]
screen: dashboard
global: false
mockup_entry: specs/mockups/dashboard.html
---

# KPI Taux de Recouvrement (90 jours glissants) - PouchDB

## Description

Calculer le taux de recouvrement sur une période glissante de 90 jours depuis **PouchDB local** et afficher le pourcentage dans la card KPI.

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
 * @action Définir la période de calcul (90 jours glissants)
 * @checkpoint period-defined, dates de début et fin définies
 * 
 * Calcul:
 * const endDate = new Date(); // Aujourd'hui
 * const startDate = new Date();
 * startDate.setDate(startDate.getDate() - 90); // Il y a 90 jours
 */

/**
 * @action Récupérer les factures de la période via PouchDB
 * @checkpoint factures-fetched, données locales chargées
 * 
 * Query:
 * const result = await db.allDocs({
 *   startkey: 'facture:',
 *   endkey: 'facture:\ufff0',
 *   include_docs: true
 * });
 * const factures = result.rows
 *   .map(row => row.doc)
 *   .filter(f => new Date(f.date_echeance) >= startDate && 
 *               new Date(f.date_echeance) <= endDate);
 */

/**
 * @action Calculer le montant total échu dans la période
 * @checkpoint total-echeances-calculated, somme des montants dus
 * 
 * Calcul:
 * const montantTotalEchu = factures
 *   .reduce((sum, f) => sum + (f.montant_total || 0), 0);
 */

/**
 * @action Calculer le montant recouvré (payé) dans la période
 * @checkpoint montant-recouvre-calculated, somme des paiements reçus
 * 
 * Calcul:
 * const montantRecouvre = factures.reduce((sum, f) => {
 *   const paye = (f.montant_total || 0) - (f.reste_a_payer || 0);
 *   return sum + paye;
 * }, 0);
 */

/**
 * @action Calculer le taux de recouvrement
 * @checkpoint taux-calculated, pourcentage calculé
 * 
 * Calcul:
 * const tauxRecouvrement = montantTotalEchu > 0 
 *   ? Math.round((montantRecouvre / montantTotalEchu) * 100)
 *   : 0;
 */

/**
 * @action Calculer la période précédente pour comparaison
 * @checkpoint periode-precedente-calculated, taux période N-1 calculé
 * 
 * Calcul:
 * const startDatePrev = new Date(startDate);
 * startDatePrev.setDate(startDatePrev.getDate() - 90);
 * const endDatePrev = new Date(startDate);
 * 
 * // Même calcul pour la période précédente
 * const tauxPrecedent = ...;
 * const variation = tauxRecouvrement - tauxPrecedent;
 */

/**
 * @action Mettre à jour l'état Alpine.js kpis.tauxRecouvrement
 * @checkpoint state-updated, valeur affichée avec suffixe %
 */

/**
 * @action Afficher l'indicateur de variation vs période précédente
 * @checkpoint variation-visible, indicateur "+5%" ou "-3%" affiché
 */
```

## PouchDB Operations

### Calculer le taux de recouvrement

```javascript
async calculateTauxRecouvrement() {
  // Définir la période de 90 jours
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 90);
  
  // Récupérer les factures depuis PouchDB
  const result = await db.allDocs({
    startkey: 'facture:',
    endkey: 'facture:\ufff0',
    include_docs: true
  });
  
  // Filtrer par période
  const factures = result.rows
    .map(row => row.doc)
    .filter(f => {
      const dateEcheance = new Date(f.date_echeance);
      return dateEcheance >= startDate && dateEcheance <= endDate;
    });
  
  // Calculer les montants
  const montantTotalEchu = factures.reduce((sum, f) => sum + (f.montant_total || 0), 0);
  const montantRecouvre = factures.reduce((sum, f) => {
    const paye = (f.montant_total || 0) - (f.reste_a_payer || 0);
    return sum + paye;
  }, 0);
  
  // Calculer le taux
  const tauxRecouvrement = montantTotalEchu > 0 
    ? Math.round((montantRecouvre / montantTotalEchu) * 100)
    : 0;
  
  // Mettre à jour le KPI
  this.kpis.tauxRecouvrement = tauxRecouvrement;
  this.kpis.montantTotalEchu = montantTotalEchu;
  this.kpis.montantRecouvre = montantRecouvre;
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
    const dateEcheance = new Date(change.doc.date_echeance);
    const now = new Date();
    const startDate = new Date(now.setDate(now.getDate() - 90));
    
    // Vérifier si la facture est dans la période de 90 jours
    if (dateEcheance >= startDate) {
      // Recalculer le KPI
      this.calculateTauxRecouvrement();
    }
  }
});
```

### Option: Mango Query avec pouchdb-find

```javascript
// Alternative avec pouchdb-find (nécessite index)
const endDate = new Date();
const startDate = new Date();
startDate.setDate(startDate.getDate() - 90);

const result = await db.find({
  selector: {
    type: { $eq: 'facture' },
    date_echeance: {
      $gte: startDate.toISOString().substring(0, 10),
      $lte: endDate.toISOString().substring(0, 10)
    }
  },
  fields: ['montant_total', 'reste_a_payer']
});

const factures = result.docs;
// ...même calcul que ci-dessus
```

## Calcul Frontend (détaillé)

```javascript
// Définition des périodes
const now = new Date();
const endDate = new Date();
const startDate = new Date(now.setDate(now.getDate() - 90));

// Récupération des factures depuis PouchDB
const result = await db.allDocs({
  startkey: 'facture:',
  endkey: 'facture:\ufff0',
  include_docs: true
});

// Filtrage par période
const factures = result.rows
  .map(row => row.doc)
  .filter(f => {
    const dateEcheance = new Date(f.date_echeance);
    return dateEcheance >= startDate && dateEcheance <= endDate;
  });

// Calcul du montant total échu
const montantTotalEchu = factures.reduce((sum, f) => sum + (f.montant_total || 0), 0);

// Calcul du montant recouvré
const montantRecouvre = factures.reduce((sum, f) => {
  const paye = (f.montant_total || 0) - (f.reste_a_payer || 0);
  return sum + paye;
}, 0);

// Calcul du taux
const tauxRecouvrement = montantTotalEchu > 0
  ? Math.round((montantRecouvre / montantTotalEchu) * 100)
  : 0;

// Mise à jour du KPI
this.kpis.tauxRecouvrement = tauxRecouvrement;
```

## Structure des documents PouchDB (facture)

```javascript
{
  "_id": "facture:550e8400-...",
  "_rev": "1-abc123...",
  "type": "facture",
  "id": "F123",
  "date_echeance": "2024-01-15",
  "montant_total": 2500.00,
  "reste_a_payer": 1500.00,
  "contact_id": "contact:..."
}
```

## Interface utilisateur

| Élément | Sélecteur | Action |
|---------|-----------|--------|
| Valeur KPI | `[x-text="kpis.tauxRecouvrement + '%'"]` | Afficher "68%" |
| Variation | `<p class="text-xs text-sky-600">` | Afficher "+5% vs période précédente" |
| Tooltip | `.fa-info-circle[title]` | Hover = "Taux de recouvrement sur 90 jours glissants" |

## Règles de couleur pour la variation

| Variation | Couleur | Exemple |
|-----------|---------|---------|
| > 0 | text-sky-600 (vert/bleu) | "+5%" |
| = 0 | text-slate-400 (neutre) | "0%" |
| < 0 | text-red-600 (rouge) | "-3%" |

## Error Handling

| Cas | Comportement |
|-----|--------------|
| PouchDB non disponible | Afficher "—" ou message d'erreur |
| Division par zéro | Afficher "0%" si aucune échéance |

---

## Migration depuis l'ancienne API

| Aspect | Avant (API) | Après (PouchDB) |
|--------|-------------|-----------------|
| Source données | `GET /api/factures?date_echeance_gte=...` | PouchDB local |
| Filtrage | Côté serveur | Côté client (date) |
| Réponse | `{ data: { taux_recouvrement: N } }` | Calcul côté client |
| Mise à jour | Rechargement manuel | Temps réel via `db.changes()` |
| Latence | ~200-500ms | ~10-50ms (local) |
| Offline | ❌ Impossible | ✅ Fonctionne offline |
