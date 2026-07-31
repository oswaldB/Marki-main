---
id: relances-liste-payeurs-impayes
type: frontend
folder: specs/workflows/frontend/relances/
description: Lister tous les payeurs ayant des impayés avec leurs totaux
depends_on: [auth-check]
screen: relances
global: false
mockup_entry: specs/mockups/relances.html
---

# relances-liste-payeurs-impayes : Liste des payeurs avec impayés

## Description

Afficher la liste de tous les payeurs qui ont au moins un impayé, avec leurs soldes débiteurs et options d'action rapide.

## Étapes

```javascript
/**
 * @action Initialiser les filtres par défaut (tous les payeurs avec impayés)
 * @checkpoint filters-initialized, filtres actifs sur impayés > 0
 */

/**
 * @action Afficher le skeleton loader
 * @checkpoint skeleton-shown, état de chargement visible
 */

/**
 * @action Récupérer les impayés via GET /api/impayes?facture_soldee=0
 * @checkpoint impayes-fetched, données brutes reçues
 * @api GET /api/impayes?facture_soldee=0&limit=1000
 * @response { impayes: [...] }
 */

/**
 * @action Récupérer les payeurs via GET /api/payers
 * @checkpoint payers-fetched, liste des payeurs reçue
 * @api GET /api/payers?limit=1000
 * @response { payers: [...] }
 */

/**
 * @action Agréger les impayés par payeur côté client
 * @checkpoint aggregated-by-payeur, données groupées calculées
 * 
 * Pour chaque payeur avec impayés :
 * - nombre_impayes
 * - montant_total_impaye
 * - date_derniere_facture
 * - statut_relance_en_cours (si relance programmée/envoyée récemment)
 */

/**
 * @action Calculer les statistiques globales
 * @checkpoint stats-calculated, totaux calculés
 * - nb_payeurs_impayes
 * - montant_total_global
 * - moyenne_impaye_par_payeur
 */

/**
 * @action Trier par montant décroissant par défaut
 * @checkpoint sorted-by-montant, ordre appliqué
 */

/**
 * @action Afficher la liste des payeurs avec impayés
 * @checkpoint list-rendered, tableau avec payeurs visibles
 */

/**
 * @action Afficher les indicateurs de priorité (score, ancienneté)
 * @checkpoint indicators-rendered, badges priorité visibles
 */

/**
 * @action Activer les actions rapides (voir impayés, créer relance)
 * @checkpoint actions-enabled, boutons d'action fonctionnels
 */

/**
 * @action Configurer la pagination si > 50 payeurs
 * @checkpoint pagination-configured, contrôles de pagination actifs
 */
```

## API Calls

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/impayes?facture_soldee=0` | Tous les impayés non soldés |
| GET | `/api/payers` | Tous les payeurs |
| GET | `/api/relances?statut=programmee` | Relances programmées (pour indicateur) |

## Colonnes affichées

| Colonne | Source | Triable |
|---------|--------|---------|
| Nom payeur | payers.nom | ✅ |
| N° impayés | agrégation | ✅ |
| Montant total | agrégation | ✅ (défaut) |
| Dernière échéance | max(impayes.date_echeance) | ✅ |
| Relance en cours | relances.statut = 'programmee' | ❌ |
| Score | calcul côté client | ✅ |
| Actions | - | ❌ |

## Filtres disponibles

| Filtre | Type | Description |
|--------|------|-------------|
| `montant_min` | number | Montant minimum total |
| `nb_impayes_min` | number | Nombre minimum d'impayés |
| `avec_relance` | checkbox | Exclure/Inclure ceux avec relance en cours |
| `score` | select | Filtrer par score (A/B/C/D) |

## Mockups de référence

- `specs/mockups/relances.html` (vue liste payeurs impayés)
