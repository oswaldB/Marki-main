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
 * @action Récupérer les impayés via GET /api/impayes?facture_soldee=false&page=1&limit=25
 * @checkpoint impayes-fetched, tableau d'impayés reçu (collection 'impayes' existante)
 */

/**
 * @action Calculer les statistiques côté frontend depuis les impayés chargés
 * @checkpoint stats-calculated, compteurs total/aReparer calculés (pas d'endpoint /api/impayes/stats)
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

| Endpoint | Table | Description |
|----------|-------|-------------|
| `GET /api/impayes?facture_soldee=false&page=1&limit=25` | `impayes` | Liste des impayés (factures non soldées) |
