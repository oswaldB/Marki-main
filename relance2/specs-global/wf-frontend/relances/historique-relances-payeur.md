---
id: relances-historique-payeur
type: frontend
folder: specs/workflows/frontend/relances/
description: Afficher l'historique des relances d'un payeur spécifique
depends_on: [relances-initial-load]
screen: relances
global: false
mockup_entry: specs/mockups/relances.html
---

# relances-historique-payeur : Historique des relances par payeur

## Description

Afficher l'historique complet des relances envoyées à un payeur spécifique, avec filtres et timeline.

## Étapes

```javascript
/**
 * @action Cliquer sur le nom du payeur dans la liste des relances
 * @checkpoint payeur-clicked, payeur ID identifié
 */

/**
 * @action Naviguer vers la vue historique du payeur
 * @checkpoint navigation-done, URL mise à jour avec ?payeur_id=:id
 */

/**
 * @action Afficher le skeleton loader de l'historique
 * @checkpoint skeleton-shown, état de chargement visible
 */

/**
 * @action Récupérer les relances du payeur via GET /api/relances?payeur_id=:id
 * @checkpoint relances-fetched, liste des relances reçues
 * @api GET /api/relances?payeur_id=:id&limit=100
 * @response { relances: [...], total: N }
 */

/**
 * @action Récupérer les infos du payeur via GET /api/payers/:id
 * @checkpoint payeur-fetched, nom et solde reçus
 */

/**
 * @action Calculer les statistiques du payeur (total relances, taux réponse...)
 * @checkpoint stats-calculated, indicateurs calculés côté client
 */

/**
 * @action Afficher l'en-tête avec infos du payeur
 * @checkpoint header-rendered, nom, solde, score visibles
 */

/**
 * @action Afficher la timeline des relances
 * @checkpoint timeline-rendered, relances ordonnées par date
 */

/**
 * @action Afficher les statistiques du payeur
 * @checkpoint stats-rendered, indicateurs visibles
 */

/**
 * @action Activer les filtres (par statut, par date, par séquence)
 * @checkpoint filters-enabled, filtres interactifs actifs
 */
```

## API Calls

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/relances?payeur_id=:id` | Relances du payeur |
| GET | `/api/payers/:id` | Infos du payeur |
| GET | `/api/impayes?payeur_id=:id` | Impayés du payeur |

## Filtres disponibles

| Filtre | Type | Description |
|--------|------|-------------|
| `statut` | select | brouillon, a_valider, programmee, envoyee, annulee |
| `date_from` | date | Date de début |
| `date_to` | date | Date de fin |
| `sequence_id` | select | Filtrer par séquence |

## Statistiques affichées

| Indicateur | Calcul |
|------------|--------|
| Total relances | relances.length |
| Relances envoyées | relances.filter(r => r.statut === 'envoyee').length |
| Taux de réponse | (relances avec réponse / total envoyées) × 100 |
| Montant total relancé | Sum des impayés liés |
| Dernière relance | Max date_envoi |

## Mockups de référence

- `specs/mockups/relances.html` (vue historique payeur)
