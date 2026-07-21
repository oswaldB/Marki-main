---
id: dashboard-initial-load
type: frontend
folder: specs/workflows/frontend/dashboard/
description: Orchestrateur du chargement initial - coordonne tous les workflows KPI, graphique et événements
depends_on: [
  dashboard-kpi-factures-en-attente,
  dashboard-kpi-impayes-actifs,
  dashboard-kpi-montant-total,
  dashboard-kpi-relances-jour,
  dashboard-kpi-taux-recouvrement,
  dashboard-kpi-anciennete-tranches,
  dashboard-chart-evolution-impayes,
  dashboard-events-manager
]
screen: dashboard
global: false
mockup_entry: specs/mockups/dashboard.html
---

# dashboard-initial-load : Orchestrateur Dashboard

## Description

Workflow orchestrateur qui coordonne le chargement initial du dashboard. Déclenche tous les workflows KPI et le graphique en parallèle, puis affiche le résultat.

## Workflow Orchestrateur

```javascript
/**
 * @action Afficher le spinner de chargement global
 * @checkpoint loading-shown, état loading=true visible
 */

/**
 * @action Déclencher tous les workflows KPI en parallèle
 * @checkpoint kpis-workflows-triggered, tous les workflows KPI lancés
 * 
 * Workflows déclenchés:
 * - dashboard-kpi-factures-en-attente
 * - dashboard-kpi-impayes-actifs
 * - dashboard-kpi-montant-total
 * - dashboard-kpi-relances-jour
 * - dashboard-kpi-taux-recouvrement
 * - dashboard-kpi-anciennete-tranches
 */

/**
 * @action Déclencher le workflow du graphique
 * @checkpoint chart-workflow-triggered, chart-evolution-impayes lancé
 */

/**
 * @action Attendre la complétion de tous les workflows
 * @checkpoint all-workflows-completed, tous les KPI et graphique prêts
 */

/**
 * @action Calculer le top débiteurs côté frontend
 * @checkpoint top-debiteurs-calculated, tri par montant décroissant
 * 
 * Note: Le top débiteurs est calculé ici car il dépend des données
 * déjà chargées par les workflows KPI (factures).
 */

/**
 * @action Masquer le spinner et afficher le contenu complet
 * @checkpoint loading-complete, dashboard entièrement rendu
 */
```

## Dépendances

| Workflow | Description | Output dans state |
|----------|-------------|-------------------|
| dashboard-kpi-factures-en-attente | Calcule `kpis.facturesEnAttente` | `kpis.facturesEnAttente` |
| dashboard-kpi-impayes-actifs | Calcule `kpis.impayesActifs` | `kpis.impayesActifs` |
| dashboard-kpi-montant-total | Calcule `kpis.montantTotal` | `kpis.montantTotal` |
| dashboard-kpi-relances-jour | Calcule `kpis.relancesJour` | `kpis.relancesJour` |
| dashboard-kpi-taux-recouvrement | Calcule `kpis.tauxRecouvrement` | `kpis.tauxRecouvrement` |
| dashboard-kpi-anciennete-tranches | Calcule `kpis.anciennete.*` | `kpis.anciennete` |
| dashboard-chart-evolution-impayes | Initialise Chart.js | `chart`, `chartData` |

## API Calls (appelés par les workflows enfants)

| Endpoint | Utilisé par |
|----------|-------------|
| `GET /api/factures?reste_a_payer_gt=0` | kpi-factures-en-attente, kpi-montant-total |
| `GET /api/factures?date_echeance_lt=now&reste_a_payer_gt=0` | kpi-impayes-actifs, kpi-anciennete-tranches |
| `GET /api/relances?date_envoi=today` | kpi-relances-jour |
| `GET /api/factures?date_echeance_gte=START&date_echeance_lte=END` | kpi-taux-recouvrement |
| `GET /api/factures?date_facture_gte=START&date_facture_lte=END` | chart-evolution-impayes |
| `GET /api/events?limit=10` | initial-load (événements) |
| `GET /api/events?type=sync&limit=1` | initial-load (dernière synchro) |

## Top Débiteurs (calculé ici)

```javascript
// Calcul du top débiteurs après chargement des factures
const topDebtors = factures
  .filter(f => f.reste_a_payer > 0)
  .reduce((acc, f) => {
    const existing = acc.find(d => d.payer_id === f.payer_id);
    if (existing) {
      existing.montant += f.reste_a_payer;
      existing.impayesCount++;
      existing.jours = Math.max(existing.jours, calculateJours(f.date_echeance));
    } else {
      acc.push({
        id: f.payer_id,
        name: f.payer_name,
        initials: getInitials(f.payer_name),
        jours: calculateJours(f.date_echeance),
        montant: f.reste_a_payer,
        impayesCount: 1
      });
    }
    return acc;
  }, [])
  .sort((a, b) => b.montant - a.montant)
  .slice(0, 10);
```

## Mockups de référence

- `specs/mockups/dashboard.html`

## Notes

- Ce workflow est un **orchestrateur**, il ne fait pas de calculs métier directement
- Les calculs métier sont délégués aux workflows KPI dédiés
- Le top débiteurs est exceptionnellement calculé ici car il nécessite 
  les données déjà chargées par les workflows KPI
