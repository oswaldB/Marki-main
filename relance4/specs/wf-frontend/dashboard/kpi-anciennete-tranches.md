---
id: dashboard-kpi-anciennete-tranches
type: frontend
folder: specs/workflows/frontend/dashboard/
description: Calculer et afficher la répartition des factures par tranche d'ancienneté (5 tranches)
depends_on: [auth-check]
screen: dashboard
global: false
mockup_entry: specs/mockups/dashboard.html
---

# KPI Ancienneté (5 Tranches)

## Description

Calculer la répartition des factures en attente par tranche d'ancienneté (jours échus) et afficher les 5 cards correspondantes.

## Tranches

1. **Moins de 7 jours** (0-6 jours)
2. **8 à 30 jours**
3. **31 à 60 jours**
4. **60 à 120 jours**
5. **Plus de 120 jours**

## Étapes

```javascript
/**
 * @action Récupérer les factures échues via GET /api/factures?date_echeance_lt=now&reste_a_payer_gt=0
 * @checkpoint factures-fetched, réponse 200 avec toutes les factures échues
 */

/**
 * @action Calculer les jours d'échéance pour chaque facture
 * @checkpoint jours-calculated, nombre de jours depuis échéance calculé
 * 
 * Calcul:
 * const today = new Date();
 * const facturesAvecJours = factures.map(f => {
 *   const dateEcheance = new Date(f.date_echeance);
 *   const joursEchus = Math.floor((today - dateEcheance) / (1000 * 60 * 60 * 24));
 *   return { ...f, jours_echus: joursEchus };
 * });
 */

/**
 * @action Répartir les factures dans les 5 tranches
 * @checkpoint tranches-calculated, répartition par tranche calculée
 * 
 * Calcul:
 * const tranches = {
 *   moins7j: facturesAvecJours.filter(f => f.jours_echus <= 6),
 *   j8a30: facturesAvecJours.filter(f => f.jours_echus >= 8 && f.jours_echus <= 30),
 *   j31a60: facturesAvecJours.filter(f => f.jours_echus >= 31 && f.jours_echus <= 60),
 *   j60a120: facturesAvecJours.filter(f => f.jours_echus >= 60 && f.jours_echus <= 120),
 *   plus120j: facturesAvecJours.filter(f => f.jours_echus > 120)
 * };
 */

/**
 * @action Calculer le nombre et le montant pour chaque tranche
 * @checkpoint kpis-anciennete-calculated, objet kpis.anciennete mis à jour
 * 
 * Calcul:
 * this.kpis.anciennete = {
 *   moins7j: tranches.moins7j.length,
 *   moins7jMontant: tranches.moins7j.reduce((s, f) => s + f.reste_a_payer, 0),
 *   j8a30: tranches.j8a30.length,
 *   j8a30Montant: tranches.j8a30.reduce((s, f) => s + f.reste_a_payer, 0),
 *   j31a60: tranches.j31a60.length,
 *   j31a60Montant: tranches.j31a60.reduce((s, f) => s + f.reste_a_payer, 0),
 *   j60a120: tranches.j60a120.length,
 *   j60a120Montant: tranches.j60a120.reduce((s, f) => s + f.reste_a_payer, 0),
 *   plus120j: tranches.plus120j.length,
 *   plus120jMontant: tranches.plus120j.reduce((s, f) => s + f.reste_a_payer, 0)
 * };
 */

/**
 * @action Mettre à jour l'affichage des 5 cards d'ancienneté
 * @checkpoint cards-rendered, toutes les cards affichent leurs valeurs
 */
```

## Requête API

```
GET /api/factures?date_echeance_lt=now&reste_a_payer_gt=0&fields=id,date_echeance,reste_a_payer
```

### Réponse (200)
```json
{
  "data": [
    {
      "id": "uuid-1",
      "date_echeance": "2024-01-10",
      "reste_a_payer": 1500.00,
      "jours_echus": 6
    },
    {
      "id": "uuid-2",
      "date_echeance": "2023-12-15",
      "reste_a_payer": 3200.50,
      "jours_echus": 37
    }
  ]
}
```

## Calcul Frontend (détaillé)

```javascript
// Récupération des factures échues
const response = await fetch('/api/factures?date_echeance_lt=now&reste_a_payer_gt=0');
const { data } = await response.json();

// Date de référence (aujourd'hui)
const today = new Date();

// Calcul des jours échus et répartition par tranche
const tranches = {
  moins7j: [],
  j8a30: [],
  j31a60: [],
  j60a120: [],
  plus120j: []
};

data.forEach(f => {
  const dateEcheance = new Date(f.date_echeance);
  const joursEchus = Math.floor((today - dateEcheance) / (1000 * 60 * 60 * 24));
  
  const facture = { ...f, jours_echus: joursEchus };
  
  if (joursEchus <= 6) {
    tranches.moins7j.push(facture);
  } else if (joursEchus >= 8 && joursEchus <= 30) {
    tranches.j8a30.push(facture);
  } else if (joursEchus >= 31 && joursEchus <= 60) {
    tranches.j31a60.push(facture);
  } else if (joursEchus >= 60 && joursEchus <= 120) {
    tranches.j60a120.push(facture);
  } else {
    tranches.plus120j.push(facture);
  }
});

// Mise à jour des KPIs
this.kpis.anciennete = {
  moins7j: tranches.moins7j.length,
  moins7jMontant: tranches.moins7j.reduce((s, f) => s + f.reste_a_payer, 0),
  j8a30: tranches.j8a30.length,
  j8a30Montant: tranches.j8a30.reduce((s, f) => s + f.reste_a_payer, 0),
  j31a60: tranches.j31a60.length,
  j31a60Montant: tranches.j31a60.reduce((s, f) => s + f.reste_a_payer, 0),
  j60a120: tranches.j60a120.length,
  j60a120Montant: tranches.j60a120.reduce((s, f) => s + f.reste_a_payer, 0),
  plus120j: tranches.plus120j.length,
  plus120jMontant: tranches.plus120j.reduce((s, f) => s + f.reste_a_payer, 0)
};
```

## Interface utilisateur

| Tranche | Sélecteur | Affichage |
|---------|-----------|-----------|
| < 7 jours | `x-text="kpis.anciennete.moins7j"` | Nombre + montant |
| 8-30 jours | `x-text="kpis.anciennete.j8a30"` | Nombre + montant |
| 31-60 jours | `x-text="kpis.anciennete.j31a60"` | Nombre + montant |
| 60-120 jours | `x-text="kpis.anciennete.j60a120"` | Nombre + montant |
| > 120 jours | `x-text="kpis.anciennete.plus120j"` | Nombre + montant |

## Color Coding (par criticité)

| Tranche | Couleur icône | Niveau |
|---------|---------------|--------|
| < 7 jours | bg-sky-50 / text-sky-400 | Normal |
| 8-30 jours | bg-sky-100 / text-sky-500 | À surveiller |
| 31-60 jours | bg-sky-200 / text-sky-600 | Important |
| 60-120 jours | bg-sky-300 / text-sky-700 | Critique |
| > 120 jours | bg-sky-400 / text-sky-900 | Urgent |

## Error Handling

| Code | Comportement |
|------|--------------|
| 401 | Redirection vers login |
| 500 | Afficher "—" pour toutes les tranches |
| Empty | Afficher "0" et "0,00 €" pour chaque tranche |
