---
id: dashboard-kpi-impayes-actifs
type: frontend
folder: specs/workflows/frontend/dashboard/
description: Calculer et afficher le nombre de factures échues (date d'échéance dépassée)
depends_on: [auth-check]
screen: dashboard
global: false
mockup_entry: specs/mockups/dashboard.html
---

# KPI Impayés Actifs (Factures Échues)

## Description

Calculer le nombre de factures dont la date d'échéance est dépassée (factures échues) et afficher la valeur dans la card KPI.

## Étapes

```javascript
/**
 * @action Récupérer les factures échues via GET /api/factures?date_echeance_lt=now&reste_a_payer_gt=0
 * @checkpoint factures-echues-fetched, réponse 200 avec tableau des factures échues
 */

/**
 * @action Filtrer les factures où date_echeance < NOW() ET reste_a_payer > 0
 * @checkpoint factures-filtered, tableau filtré des factures échues non payées
 * 
 * Calcul:
 * const now = new Date();
 * const facturesEchues = factures.filter(f => {
 *   const dateEcheance = new Date(f.date_echeance);
 *   return dateEcheance < now && f.reste_a_payer > 0;
 * });
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

## Requête API

```
GET /api/factures?date_echeance_lt=now&reste_a_payer_gt=0&fields=id,nfacture,date_echeance,reste_a_payer
```

### Réponse (200)
```json
{
  "data": [
    {
      "id": "uuid-1",
      "nfacture": "F-2024-001",
      "date_echeance": "2024-01-15",
      "reste_a_payer": 1500.00,
      "jours_echus": 45
    }
  ],
  "meta": {
    "total": 28
  }
}
```

## Calcul Frontend

```javascript
// Récupération des données
const now = new Date().toISOString();
const response = await fetch(`/api/factures?date_echeance_lt=${now}&reste_a_payer_gt=0`);
const { data, meta } = await response.json();

// Calcul des jours échus pour chaque facture
const facturesAvecJours = data.map(f => ({
  ...f,
  jours_echus: Math.floor((new Date() - new Date(f.date_echeance)) / (1000 * 60 * 60 * 24))
}));

// Mise à jour du KPI
this.kpis.impayesActifs = meta.total || data.length;
```

## Interface utilisateur

| Élément | Sélecteur | Action |
|---------|-----------|--------|
| Valeur KPI | `[x-text="kpis.impayesActifs"]` | Afficher le nombre |
| Label | `<p class="text-xs text-slate-400">` | Afficher "factures échues" |
| Tooltip | `.fa-info-circle[title]` | Hover = "Factures dont la date d'échéance est dépassée" |

## Error Handling

| Code | Comportement |
|------|--------------|
| 401 | Redirection vers login |
| 500 | Afficher message d'erreur |
| Empty | Afficher "0" si aucune facture échue |
