---
id: impayes-initial-load
type: frontend
folder: specs/workflows/frontend/impayes/
description: Charger la liste paginée des factures impayées avec filtres et tri
depends_on: [auth-check]
screen: impayes
global: false
mockup_entry: specs/mockups/impayes.html
---

# impayes-initial-load : Chargement initial Liste Impayés

## Description

Charger la liste des factures impayées avec pagination, filtres par défaut et options de tri.

## Étapes

```javascript
/**
 * @action Initialiser l'état de la page avec filtres par défaut
 * @checkpoint state-initialized, page=1, filters vides, tri par date échéance DESC
 */

/**
 * @action Afficher le skeleton loader du tableau
 * @checkpoint skeleton-shown, lignes de chargement visibles
 */

/**
 * @action Récupérer les impayés via GET /api/impayes?facture_soldee=0&statut=impaye
 * @checkpoint impayes-fetched, tableau d'impayés reçu
 * @api GET /api/impayes?facture_soldee=0&statut=impaye
 * @response { impayes: [...] }
 */

/**
 * @action Calculer les statistiques côté frontend depuis les impayés chargés
 * @checkpoint stats-calculated, compteurs total/aReparer calculés
 */

/**
 * @action Stocker les impayés dans le store Alpine
 * @checkpoint impayes-stored, store.impayes contient les données
 */

/**
 * @action Rendre le tableau avec les données réelles
 * @checkpoint table-rendered, lignes de factures affichées avec montants formatés
 */

/**
 * @action Mettre à jour la pagination (totalPages, etc.)
 * @checkpoint pagination-updated, contrôles de pagination actifs
 */
```

## API Calls

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/impayes?facture_soldee=0&statut=impaye` | Liste des impayés non soldés |
| GET | `/api/dashboard/stats` | Statistiques globales |

## Paramètres de requête

| Paramètre | Type | Défaut | Description |
|-----------|------|--------|-------------|
| `facture_soldee` | integer | - | 0 pour impayés, 1 pour soldés |
| `statut` | string | - | `impaye`, `paye`, `annule` |
| `order_by` | string | `date_echeance` | Colonne de tri |
| `order` | string | `ASC` | `ASC` ou `DESC` |
| `limit` | integer | 50 | Nombre de résultats |
| `offset` | integer | 0 | Décalage pagination |

## Mockups de référence

- `specs/mockups/impayes.html`
