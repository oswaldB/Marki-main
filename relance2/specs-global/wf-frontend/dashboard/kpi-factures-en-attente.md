---
id: dashboard-kpi-factures-en-attente
type: frontend
folder: specs/workflows/frontend/dashboard/
description: Calculer et afficher le nombre de factures en attente (reste à payer > 0)
depends_on: [auth-check]
screen: dashboard
global: false
mockup_entry: specs/mockups/dashboard.html
---

# KPI Factures en Attente

## Description

Calculer le nombre de factures ayant un reste à payer supérieur à 0 et afficher la valeur dans la card KPI.

## Étapes

```javascript
/**
 * @action Récupérer toutes les factures via GET /api/factures?reste_a_payer_gt=0
 * @checkpoint factures-fetched, réponse 200 avec tableau des factures
 */

/**
 * @action Filtrer les factures où reste_a_payer > 0
 * @checkpoint factures-filtered, tableau filtré des factures en attente
 * 
 * Calcul:
 * const facturesEnAttente = factures.filter(f => f.reste_a_payer > 0);
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

## Requête API

```
GET /api/factures?reste_a_payer_gt=0&fields=id,nfacture,reste_a_payer
```

### Réponse (200)
```json
{
  "data": [
    {
      "id": "uuid-1",
      "nfacture": "F-2024-001",
      "reste_a_payer": 1500.00
    },
    {
      "id": "uuid-2",
      "nfacture": "F-2024-002",
      "reste_a_payer": 3200.50
    }
  ],
  "meta": {
    "total": 45
  }
}
```

## Calcul Frontend

```javascript
// Récupération des données
const response = await fetch('/api/factures?reste_a_payer_gt=0');
const { data, meta } = await response.json();

// Mise à jour du KPI
this.kpis.facturesEnAttente = meta.total || data.length;
```

## Interface utilisateur

| Élément | Sélecteur | Action |
|---------|-----------|--------|
| Valeur KPI | `[x-text="kpis.facturesEnAttente"]` | Afficher le nombre |
| Tooltip | `.fa-info-circle[title]` | Hover = afficher explication |

## Error Handling

| Code | Comportement |
|------|--------------|
| 401 | Redirection vers login |
| 500 | Afficher message d'erreur "Impossible de charger les factures" |
| Timeout | Retry automatique x3, puis message d'erreur |
