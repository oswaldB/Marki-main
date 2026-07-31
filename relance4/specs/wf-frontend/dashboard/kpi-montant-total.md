---
id: dashboard-kpi-montant-total
type: frontend
folder: specs/workflows/frontend/dashboard/
description: Calculer et afficher le montant HT total des factures en attente
depends_on: [auth-check]
screen: dashboard
global: false
mockup_entry: specs/mockups/dashboard.html
---

# KPI Montant Total (HT)

## Description

Calculer le montant HT total de toutes les factures ayant un reste à payer supérieur à 0 et afficher la valeur formatée dans la card KPI.

## Étapes

```javascript
/**
 * @action Récupérer les factures via GET /api/factures?reste_a_payer_gt=0&include=montant_ht
 * @checkpoint factures-fetched, réponse 200 avec montants HT
 */

/**
 * @action Filtrer et extraire les montants HT des factures en attente
 * @checkpoint montants-extracted, tableau des montants HT
 * 
 * Calcul:
 * const montantsHT = factures
 *   .filter(f => f.reste_a_payer > 0)
 *   .map(f => f.montant_ht || f.montant_total);
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

## Requête API

```
GET /api/factures?reste_a_payer_gt=0&fields=id,montant_ht,montant_total,reste_a_payer
```

### Réponse (200)
```json
{
  "data": [
    {
      "id": "uuid-1",
      "montant_ht": 1250.00,
      "montant_total": 1500.00,
      "reste_a_payer": 1500.00
    },
    {
      "id": "uuid-2",
      "montant_ht": 2667.08,
      "montant_total": 3200.50,
      "reste_a_payer": 3200.50
    }
  ],
  "meta": {
    "sum_montant_ht": 128500.00
  }
}
```

## Calcul Frontend

```javascript
// Récupération des données
const response = await fetch('/api/factures?reste_a_payer_gt=0&fields=montant_ht,montant_total,reste_a_payer');
const { data, meta } = await response.json();

// Calcul du montant HT total
const totalHT = data.reduce((sum, f) => {
  // Priorité au montant HT, fallback sur montant_total
  const montant = f.montant_ht || f.montant_total || 0;
  return sum + montant;
}, 0);

// Alternative si l'API retourne directement la somme
// const totalHT = meta.sum_montant_ht || 0;

// Mise à jour du KPI
this.kpis.montantTotal = totalHT;
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

| Code | Comportement |
|------|--------------|
| 401 | Redirection vers login |
| 500 | Afficher "—" ou message d'erreur |
