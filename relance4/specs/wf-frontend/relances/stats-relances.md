---
id: relances-stats
type: frontend
folder: specs/workflows/frontend/relances/
description: Afficher les statistiques et KPI des relances
depends_on: [auth-check]
screen: dashboard
global: false
mockup_entry: specs/mockups/dashboard.html
---

# relances-stats : Statistiques des relances

## Description

Afficher un tableau de bord avec les statistiques clés des relances : taux d'envoi, réponses, efficacité, et tendances temporelles.

## Étapes

```javascript
/**
 * @action Initialiser la période d'analyse (défaut: 30 derniers jours)
 * @checkpoint period-initialized, date_from et date_to définis
 */

/**
 * @action Afficher le skeleton loader des graphiques
 * @checkpoint skeleton-shown, placeholders de graphiques visibles
 */

/**
 * @action Récupérer toutes les relances via GET /api/relances
 * @checkpoint relances-fetched, données brutes reçues
 * @api GET /api/relances?limit=10000&date_from=:from&date_to=:to
 * @response { relances: [...] }
 */

/**
 * @action Récupérer les événements de suivi via GET /api/events
 * @checkpoint events-fetched, ouvertures emails et clics reçus
 * @api GET /api/events?type=suivi_relance
 * @response { events: [{ relance_id, type, date }] }
 */

/**
 * @action Calculer les KPIs agrégés côté client
 * @checkpoint kpis-calculated, indicateurs calculés
 * 
 * Indicateurs calculés :
 * - total_relances (créées dans la période)
 * - relances_envoyees (statut = 'envoyee')
 * - taux_envoi (envoyees / total)
 * - emails_ouverts (nombre d'emails ouverts)
 * - taux_ouverture (ouverts / envoyees)
 * - liens_cliques (clics sur lien paiement)
 * - taux_clic (cliques / envoyees)
 * - montant_recouvre (paiements reçus)
 * - delai_moyen_paiement (jours entre relance et paiement)
 */

/**
 * @action Calculer les données pour les graphiques temporels
 * @checkpoint chart-data-calculated, données par jour/semaine/mois
 * 
 * Grouper par période (jour si <= 30j, semaine si <= 90j, mois sinon)
 * - relances créées
 * - relances envoyées
 * - taux de réponse
 */

/**
 * @action Afficher les cartes de KPIs
 * @checkpoint kpis-rendered, 4-6 indicateurs clés visibles
 */

/**
 * @action Afficher le graphique d'évolution temporelle
 * @checkpoint evolution-chart-rendered, courbe ou barres visibles
 */

/**
 * @action Afficher le graphique de répartition par statut
 * @checkpoint status-chart-rendered, camembert ou barres empilées
 */

/**
 * @action Afficher le top 10 des payeurs relancés
 * @checkpoint top-payeurs-rendered, tableau avec montants visibles
 */

/**
 * @action Afficher les statistiques par séquence
 * @checkpoint sequences-stats-rendered, efficacité comparée par séquence
 */

/**
 * @action Activer les filtres de période
 * @checkpoint period-filters-enabled, selecteurs de dates actifs
 */

/**
 * @action Activer le bouton d'export des statistiques
 * @checkpoint export-enabled, téléchargement PDF/Excel disponible
 */
```

## API Calls

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/relances` | Toutes les relances |
| GET | `/api/events` | Événements de suivi |
| GET | `/api/sequences` | Séquences pour stats |

## KPIs affichés

| KPI | Formule | Format |
|-----|---------|--------|
| Total relances | COUNT(relances) | Nombre |
| Taux d'envoi | envoyées / total × 100 | Pourcentage |
| Taux d'ouverture | ouverts / envoyées × 100 | Pourcentage |
| Taux de clic | cliqués / envoyées × 100 | Pourcentage |
| Montant relancé | SUM(montant_total) | Monétaire |
| Montant recouvré | SUM(paiements reçus post-relance) | Monétaire |
| Taux de recouvrement | recouvré / relancé × 100 | Pourcentage |
| Délai moyen de paiement | AVG(jours entre relance et paiement) | Jours |

## Graphiques

| Graphique | Type | Données |
|-----------|------|---------|
| Évolution | Courbe | Relances créées/envoyées dans le temps |
| Répartition | Camembert | Répartition par statut |
| Efficacité | Barres | Taux de réponse par séquence |
| Heatmap | Calendrier | Jours avec le plus d'envois |

## Filtres disponibles

| Filtre | Type | Description |
|--------|------|-------------|
| Période | prédéfinie | 7j, 30j, 90j, 12mois, personnalisé |
| Séquence | select | Filtrer par séquence de relance |
| Statut | multi-select | Statuts à inclure |

## Mockups de référence

- `specs/mockups/dashboard.html` (vue statistiques relances)
