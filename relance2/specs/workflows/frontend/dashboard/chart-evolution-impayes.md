---
id: dashboard-chart-evolution-impayes
type: frontend
folder: specs/workflows/frontend/dashboard/
description: Initialiser et afficher le graphique d'évolution des impayés sur 12 mois glissants avec Chart.js
depends_on: [auth-check]
screen: dashboard
global: false
mockup_entry: specs/mockups/dashboard.html
---

# Chart Évolution des Impayés (12 mois glissants)

## Description

Initialiser le graphique Chart.js affichant l'évolution des impayés sur 12 mois glissants : montants payés vs restes à payer, avec le nombre de factures impayées en ligne.

## Étapes

```javascript
/**
 * @action Définir la période de 12 mois glissants
 * @checkpoint period-defined, dates de début et fin calculées
 * 
 * Calcul:
 * const endDate = new Date(); // Aujourd'hui
 * const startDate = new Date();
 * startDate.setMonth(startDate.getMonth() - 12);
 * 
 * // Labels des 12 mois + mois "Avant"
 * const months = [];
 * for (let i = 11; i >= 0; i--) {
 *   const d = new Date();
 *   d.setMonth(d.getMonth() - i);
 *   months.push(d.toLocaleString('fr-FR', { month: 'short' }));
 * }
 * const labels = ['Avant', ...months];
 */

/**
 * @action Récupérer les factures sur 12 mois via GET /api/factures?date_facture_gte=START&date_facture_lte=END
 * @checkpoint factures-fetched, réponse 200 avec factures de la période
 */

/**
 * @action Grouper les factures par mois
 * @checkpoint factures-grouped, factures regroupées par mois (YYYY-MM)
 * 
 * Calcul:
 * const groupedByMonth = factures.reduce((acc, f) => {
 *   const monthKey = f.date_facture.substring(0, 7); // YYYY-MM
 *   if (!acc[monthKey]) acc[monthKey] = [];
 *   acc[monthKey].push(f);
 *   return acc;
 * }, {});
 */

/**
 * @action Calculer les données du graphique pour chaque mois
 * @checkpoint chart-data-calculated, datasets calculés
 * 
 * Calcul:
 * // Pour chaque mois dans labels (sauf "Avant")
 * const chartData = {
 *   labels: labels,
 *   montantsPayes: [],      // Bar empilée 1
 *   restesAPayer: [],     // Bar empilée 2
 *   facturesImpayees: []  // Ligne
 * };
 * 
 * // Calculer "Avant" (factures antérieures à la période)
 * const facturesAvant = factures.filter(f => 
 *   new Date(f.date_facture) < startDate
 * );
 * chartData.montantsPayes[0] = facturesAvant.reduce((s, f) => 
 *   s + (f.montant_total - f.reste_a_payer), 0
 * );
 * chartData.restesAPayer[0] = facturesAvant.reduce((s, f) => 
 *   s + f.reste_a_payer, 0
 * );
 * chartData.facturesImpayees[0] = facturesAvant.filter(f => 
 *   f.reste_a_payer > 0
 * ).length;
 * 
 * // Calculer pour chaque mois
 * months.forEach((monthLabel, index) => {
 *   const monthFactures = groupedByMonth[monthKeys[index]] || [];
 *   
 *   chartData.montantsPayes[index + 1] = monthFactures.reduce((s, f) => 
 *     s + (f.montant_total - f.reste_a_payer), 0
 *   );
 *   chartData.restesAPayer[index + 1] = monthFactures.reduce((s, f) => 
 *     s + f.reste_a_payer, 0
 *   );
 *   chartData.facturesImpayees[index + 1] = monthFactures.filter(f => 
 *     f.reste_a_payer > 0
 *   ).length;
 * });
 */

/**
 * @action Initialiser Chart.js avec les données calculées
 * @checkpoint chart-initialized, instance Chart.js créée
 * 
 * Configuration:
 * - Type: bar (stacked) + line
 * - Dataset 1 (bar): Reste à payer (couleur #7dd3fc)
 * - Dataset 2 (bar): Montant payé (couleur #0ea5e9)
 * - Dataset 3 (line): Nb factures impayées (couleur #0369a1)
 * - Axes Y: euros (gauche) + nombre factures (droite)
 */

/**
 * @action Configurer les tooltips personnalisés
 * @checkpoint tooltips-configured, format "X factures" ou "X k€"
 * 
 * Format tooltip:
 * - Montants: "Reste à payer : 45,2 k€" ou "Montant payé : 32,8 k€"
 * - Ligne: "15 factures impayées"
 */

/**
 * @action Rendre le graphique dans le canvas
 * @checkpoint chart-rendered, graphique visible avec animations
 */

/**
 * @action Gérer le responsive (resize)
 * @checkpoint responsive-handled, graphique s'adapte à la taille
 */
```

## Requête API

```
GET /api/factures?date_facture_gte=2023-01-01&date_facture_lte=2024-01-15&fields=id,date_facture,montant_total,reste_a_payer
```

Ou endpoint dédié pour les stats :
```
GET /api/stats/evolution?periode=12mois&group_by=month
```

### Réponse (200)
```json
{
  "data": {
    "labels": ["Avant", "Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sept", "Oct", "Nov", "Déc"],
    "datasets": {
      "montantsPayes": [45000, 52000, 48000, 61000, 55000, 58000, 62000, 59000, 65000, 70000, 68000, 72000, 75000],
      "restesAPayer": [28000, 32000, 35000, 42000, 38000, 41000, 39000, 43000, 47000, 52000, 48000, 51000, 49000],
      "facturesImpayees": [12, 15, 18, 22, 19, 21, 20, 23, 25, 28, 26, 27, 24]
    }
  }
}
```

## Calcul Frontend (détaillé)

```javascript
// Définition des 12 mois glissants
const generateMonths = () => {
  const months = [];
  const monthKeys = [];
  const today = new Date();
  
  for (let i = 11; i >= 0; i--) {
    const d = new Date(today);
    d.setMonth(d.getMonth() - i);
    months.push(d.toLocaleString('fr-FR', { month: 'short' }));
    monthKeys.push(d.toISOString().substring(0, 7)); // YYYY-MM
  }
  
  return { months, monthKeys };
};

// Récupération des factures
const startDate = new Date();
startDate.setMonth(startDate.getMonth() - 12);
const endDate = new Date();

const response = await fetch(
  `/api/factures?date_facture_gte=${startDate.toISOString()}&date_facture_lte=${endDate.toISOString()}`
);
const { data: factures } = await response.json();

// Grouper par mois
const groupedByMonth = factures.reduce((acc, f) => {
  const monthKey = f.date_facture.substring(0, 7);
  if (!acc[monthKey]) acc[monthKey] = [];
  acc[monthKey].push(f);
  return acc;
}, {});

// Calcul des données
const { months, monthKeys } = generateMonths();
const labels = ['Avant', ...months];

const chartData = {
  montantsPayes: [],
  restesAPayer: [],
  facturesImpayees: []
};

// Mois "Avant" (antérieur à la période)
const facturesAvant = factures.filter(f => 
  new Date(f.date_facture) < startDate
);
chartData.montantsPayes.push(
  facturesAvant.reduce((s, f) => s + (f.montant_total - f.reste_a_payer), 0)
);
chartData.restesAPayer.push(
  facturesAvant.reduce((s, f) => s + f.reste_a_payer, 0)
);
chartData.facturesImpayees.push(
  facturesAvant.filter(f => f.reste_a_payer > 0).length
);

// Chaque mois
monthKeys.forEach(key => {
  const monthFactures = groupedByMonth[key] || [];
  
  chartData.montantsPayes.push(
    monthFactures.reduce((s, f) => s + (f.montant_total - f.reste_a_payer), 0)
  );
  chartData.restesAPayer.push(
    monthFactures.reduce((s, f) => s + f.reste_a_payer, 0)
  );
  chartData.facturesImpayees.push(
    monthFactures.filter(f => f.reste_a_payer > 0).length
  );
});

// Mise à jour du state
this.chartData = chartData;
```

## Configuration Chart.js

```javascript
initChart() {
  const ctx = document.getElementById('evolutionChart');
  if (!ctx) return;
  
  // Détruire l'instance existante si présente
  if (this.chart) {
    this.chart.destroy();
  }
  
  this.chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: this.chartData.labels,
      datasets: [
        {
          label: 'Reste à payer',
          data: this.chartData.restesAPayer,
          backgroundColor: '#7dd3fc',
          borderRadius: 4,
          yAxisID: 'y',
          order: 2
        },
        {
          label: 'Montant payé',
          data: this.chartData.montantsPayes,
          backgroundColor: '#0ea5e9',
          borderRadius: 4,
          yAxisID: 'y',
          order: 2
        },
        {
          type: 'line',
          label: 'Nb factures impayées',
          data: this.chartData.facturesImpayees,
          borderColor: '#0369a1',
          backgroundColor: '#0369a1',
          pointBackgroundColor: '#0369a1',
          pointRadius: 4,
          borderWidth: 2,
          tension: 0.3,
          yAxisID: 'y1',
          order: 1
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'bottom',
          labels: {
            usePointStyle: true,
            padding: 15
          }
        },
        tooltip: {
          callbacks: {
            label(context) {
              if (context.dataset.yAxisID === 'y1') {
                return ` ${context.parsed.y} facture${context.parsed.y > 1 ? 's' : ''} impayée${context.parsed.y > 1 ? 's' : ''}`;
              }
              const val = context.parsed.y;
              if (val >= 1000) {
                return ` ${context.dataset.label} : ${(val / 1000).toFixed(1)} k€`;
              }
              return ` ${context.dataset.label} : ${val.toLocaleString('fr-FR')} €`;
            }
          }
        }
      },
      scales: {
        y: {
          stacked: true,
          position: 'left',
          ticks: {
            callback: (val) => {
              if (val >= 1000) return (val / 1000).toFixed(0) + ' k€';
              return val + ' €';
            }
          },
          grid: { color: '#f3f4f6' }
        },
        y1: {
          position: 'right',
          beginAtZero: true,
          ticks: {
            stepSize: 1,
            callback: (val) => val + ' fa.'
          },
          grid: { drawOnChartArea: false }
        },
        x: {
          stacked: true,
          grid: { display: false }
        }
      }
    }
  });
}
```

## Interface utilisateur

| Élément | Sélecteur | Description |
|---------|-----------|-------------|
| Titre | `h3:contains("Évolution des impayés")` | Titre de la section |
| Sous-titre | `p.text-slate-500` | "Montant facturé vs reste à payer sur 12 mois glissants" |
| Canvas | `#evolutionChart` | Élément canvas pour Chart.js |
| Container | `.h-80` | Hauteur fixe du graphique |

## Types de données affichées

| Dataset | Type | Axe | Format |
|---------|------|-----|--------|
| Reste à payer | Bar (stacked) | Y gauche (€) | 45 k€ |
| Montant payé | Bar (stacked) | Y gauche (€) | 52 k€ |
| Nb factures impayées | Line | Y droite (nb) | 15 fa. |

## Error Handling

| Code | Comportement |
|------|--------------|
| 401 | Redirection vers login |
| 500 | Afficher message "Impossible de charger le graphique" |
| Canvas introuvable | Log error, ne pas bloquer le dashboard |
| Données vides | Afficher graphique vide avec axes uniquement |

## Optimisations

- Ne pas recréer le graphique à chaque update (utiliser `chart.update()`)
- Debounce les mises à jour si les données changent fréquemment
- Lazy loading : initialiser le graphique uniquement quand visible (IntersectionObserver)
