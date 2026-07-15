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

## Logs (console.log) - OBLIGATOIRE

Chaque étape du workflow doit être loguée avec `console.log()`:

| Checkpoint | Instruction console.log |
|------------|------------------------|
| `start` | `console.log('[WORKFLOW.impayes-initial-load] START: Initialisation chargement liste impayés')` |
| `loading-shown` | `console.log('[WORKFLOW.impayes-initial-load] STEP: Affichage skeleton loader tableau')` |
| `auth-verified` | `console.log('[WORKFLOW.impayes-initial-load] STEP: Token auth vérifié')` |
| `state-initialized` | `console.log('[WORKFLOW.impayes-initial-load] STEP: État initialisé', {page: 1, filters: {}, order_by: 'date_echeance', order: 'DESC'})` |
| `impayes-fetch-start` | `console.log('[WORKFLOW.impayes-initial-load] STEP: Appel API GET /api/impayes?facture_soldee=0&statut=impaye')` |
| `impayes-fetched` | `console.log('[WORKFLOW.impayes-initial-load] DATA: Impayés reçus:', {count: impayes.length})` |
| `stats-fetch-start` | `console.log('[WORKFLOW.impayes-initial-load] STEP: Appel API GET /api/dashboard/stats')` |
| `stats-fetched` | `console.log('[WORKFLOW.impayes-initial-load] DATA: Stats reçues:', stats)` |
| `stats-calculated` | `console.log('[WORKFLOW.impayes-initial-load] SUCCESS: Statistiques calculées', {total: total, aReparer: aReparer})` |
| `filters-applied` | `console.log('[WORKFLOW.impayes-initial-load] STEP: Filtres par défaut appliqués', filters)` |
| `store-updated` | `console.log('[WORKFLOW.impayes-initial-load] STEP: Store Alpine mis à jour', {count: store.impayes.length})` |
| `table-rendered` | `console.log('[WORKFLOW.impayes-initial-load] SUCCESS: Tableau rendu avec', renderedRows, 'lignes')` |
| `pagination-updated` | `console.log('[WORKFLOW.impayes-initial-load] STEP: Pagination mise à jour', {totalPages: totalPages, currentPage: 1})` |
| `end` | `console.log('[WORKFLOW.impayes-initial-load] END: Liste impayés chargée en', duree, 'ms')` |
| `error` | `console.error('[WORKFLOW.impayes-initial-load] ERROR:', error)` |
