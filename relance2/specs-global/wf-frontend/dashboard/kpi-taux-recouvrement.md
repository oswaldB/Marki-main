---
id: dashboard-kpi-taux-recouvrement
type: frontend
folder: specs/workflows/frontend/dashboard/
description: Calculer et afficher le taux de recouvrement sur les 90 derniers jours glissants
depends_on: [auth-check]
screen: dashboard
global: false
mockup_entry: specs/mockups/dashboard.html
---

# KPI Taux de Recouvrement (90 jours glissants)

## Description

Calculer le taux de recouvrement sur une période glissante de 90 jours et afficher le pourcentage dans la card KPI.

## Étapes

```javascript
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
 * @action Récupérer les factures de la période via GET /api/factures?date_echeance_gte=START&date_echeance_lte=END
 * @checkpoint factures-fetched, réponse 200 avec factures de la période
 */

/**
 * @action Calculer le montant total échu dans la période
 * @checkpoint total-echeances-calculated, somme des montants dus
 * 
 * Calcul:
 * const montantTotalEchu = factures
 *   .filter(f => f.date_echeance >= startDate && f.date_echeance <= endDate)
 *   .reduce((sum, f) => sum + f.montant_total, 0);
 */

/**
 * @action Calculer le montant recouvré (payé) dans la période
 * @checkpoint montant-recouvre-calculated, somme des paiements reçus
 * 
 * Calcul:
 * // Option 1: Via montant_paye sur les factures
 * const montantRecouvre = factures.reduce((sum, f) => {
 *   const paye = f.montant_total - f.reste_a_payer;
 *   return sum + paye;
 * }, 0);
 * 
 * // Option 2: Via table paiements
 * const montantRecouvre = paiements
 *   .filter(p => p.date_paiement >= startDate && p.date_paiement <= endDate)
 *   .reduce((sum, p) => sum + p.montant, 0);
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

## Requête API

```
GET /api/factures?date_echeance_gte=2023-10-15T00:00:00&date_echeance_lte=2024-01-15T23:59:59&fields=id,montant_total,reste_a_payer,date_echeance
```

Ou endpoint dédié :
```
GET /api/stats/taux-recouvrement?periode=90j&date_fin=2024-01-15
```

### Réponse (200)
```json
{
  "data": {
    "taux_recouvrement": 68,
    "montant_total_echeances": 150000.00,
    "montant_recouvre": 102000.00,
    "periode": {
      "debut": "2023-10-15",
      "fin": "2024-01-15",
      "jours": 90
    },
    "periode_precedente": {
      "taux_recouvrement": 63,
      "variation": 5
    }
  }
}
```

## Calcul Frontend (détaillé)

```javascript
// Définition des périodes
const now = new Date();
const endDate = now.toISOString();
const startDate = new Date(now.setDate(now.getDate() - 90)).toISOString();

// Récupération des factures
const response = await fetch(`/api/factures?date_echeance_gte=${startDate}&date_echeance_lte=${endDate}`);
const { data } = await response.json();

// Calcul du montant total échu
const montantTotalEchu = data.reduce((sum, f) => sum + (f.montant_total || 0), 0);

// Calcul du montant recouvré (montant_total - reste_a_payer)
const montantRecouvre = data.reduce((sum, f) => {
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

| Code | Comportement |
|------|--------------|
| 401 | Redirection vers login |
| 500 | Afficher "—" ou message d'erreur |
| Division par zéro | Afficher "0%" si aucune échéance |
