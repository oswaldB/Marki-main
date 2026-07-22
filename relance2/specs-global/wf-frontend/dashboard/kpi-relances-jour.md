---
id: dashboard-kpi-relances-jour
type: frontend
folder: specs/workflows/frontend/dashboard/
description: Calculer et afficher le nombre de relances envoyées aujourd'hui
depends_on: [auth-check]
screen: dashboard
global: false
mockup_entry: specs/mockups/dashboard.html
---

# KPI Relances du Jour

## Description

Calculer le nombre de relances envoyées aujourd'hui et afficher la valeur dans la card KPI.

## Étapes

```javascript
/**
 * @action Récupérer les relances du jour via GET /api/relances?date_envoi=today
 * @checkpoint relances-fetched, réponse 200 avec relances du jour
 */

/**
 * @action Filtrer les relances où date_envoi = date du jour
 * @checkpoint relances-filtered, tableau des relances envoyées aujourd'hui
 * 
 * Calcul:
 * const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
 * const relancesDuJour = relances.filter(r => {
 *   const dateEnvoi = r.date_envoi.split('T')[0];
 *   return dateEnvoi === today;
 * });
 */

/**
 * @action Compter le nombre de relances
 * @checkpoint count-calculated, nombre total calculé
 * 
 * Calcul:
 * const count = relancesDuJour.length;
 */

/**
 * @action Grouper par type de relance (R1, R2, R3)
 * @checkpoint grouped-by-type, répartition par niveau calculée
 * 
 * Calcul:
 * const repartition = relancesDuJour.reduce((acc, r) => {
 *   const niveau = r.niveau_relance || 'R1';
 *   acc[niveau] = (acc[niveau] || 0) + 1;
 *   return acc;
 * }, {});
 */

/**
 * @action Mettre à jour l'état Alpine.js kpis.relancesJour
 * @checkpoint state-updated, valeur affichée dans la card KPI
 */
```

## Requête API

```
GET /api/relances?date_envoi=today&statut=sent
```

Ou avec plage de dates :
```
GET /api/relances?date_envoi_gte=2024-01-15T00:00:00&date_envoi_lte=2024-01-15T23:59:59
```

### Réponse (200)
```json
{
  "data": [
    {
      "id": "uuid-1",
      "contact_id": "uuid-contact-1",
      "facture_id": "uuid-facture-1",
      "niveau_relance": "R2",
      "date_envoi": "2024-01-15T09:30:00",
      "statut": "sent",
      "canal": "email"
    },
    {
      "id": "uuid-2",
      "contact_id": "uuid-contact-2",
      "facture_id": "uuid-facture-2",
      "niveau_relance": "R1",
      "date_envoi": "2024-01-15T10:15:00",
      "statut": "sent",
      "canal": "email"
    }
  ],
  "meta": {
    "total": 18,
    "repartition": {
      "R1": 10,
      "R2": 6,
      "R3": 2
    }
  }
}
```

## Calcul Frontend

```javascript
// Construction de la date du jour
const today = new Date();
const todayStart = new Date(today.setHours(0, 0, 0, 0)).toISOString();
const todayEnd = new Date(today.setHours(23, 59, 59, 999)).toISOString();

// Récupération des données
const response = await fetch(`/api/relances?date_envoi_gte=${todayStart}&date_envoi_lte=${todayEnd}&statut=sent`);
const { data, meta } = await response.json();

// Mise à jour du KPI
this.kpis.relancesJour = meta.total || data.length;
```

## Interface utilisateur

| Élément | Sélecteur | Action |
|---------|-----------|--------|
| Valeur KPI | `[x-text="kpis.relancesJour"]` | Afficher le nombre (ex: 18) |
| Label | `<p class="text-xs text-slate-400">` | Afficher "aujourd'hui" |
| Tooltip | `.fa-info-circle[title]` | Hover = "Relances envoyées aujourd'hui" |

## Error Handling

| Code | Comportement |
|------|--------------|
| 401 | Redirection vers login |
| 500 | Afficher message d'erreur |
| Empty | Afficher "0" si aucune relance envoyée aujourd'hui |
