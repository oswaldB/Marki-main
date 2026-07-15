---
id: impayes-suspendus-initial-load
type: frontend
folder: specs/workflows/frontend/impayes-suspendus/
description: Charger la liste des factures suspendues avec motifs et dates
depends_on: [auth-check]
screen: impayes-suspendus
global: false
mockup_entry: specs/mockups/impayes-suspendus.html
---

# impayes-suspendus-initial-load : Chargement initial Impayés Suspendus

## Description

Charger la liste des factures mises en attente (suspendues) avec leurs motifs et informations de suspension.

## Étapes

```javascript
/**
 * @action Initialiser les filtres par défaut
 * @checkpoint state-initialized, filters.motif=''
 */

/**
 * @action Afficher le skeleton loader
 * @checkpoint skeleton-shown, tableau en état de chargement
 */

/**
 * @action Récupérer les factures suspendues via GET /api/impayes?facture_soldee=0&statut=impaye
 * @checkpoint suspendus-fetched, liste des factures en attente reçue
 * 
 * **Approche** : Utilise le CRUD avec filtre sur `is_suspended=true`
 * Le backend utilise `db.search('impayes', { is_suspended: true })`
 */

/**
 * @action Extraire les motifs uniques des factures suspendues
 * @checkpoint motifs-extracted, options de filtrage calculées côté client
 * 
 * **Note** : Pas de table `suspension-motifs`. Les motifs sont extraits 
 * des champs `blacklist_motif` des factures suspendues elles-mêmes.
 */

/**
 * @action Stocker les données dans le store
 * @checkpoint data-stored, facturesSuspendues et motifs enregistrés
 */

/**
 * @action Rendre le tableau avec les badges de statut
 * @checkpoint table-rendered, colonnes motif/date/option réactivation visibles
 */
```

## Mockups de référence

- `specs/mockups/impayes-suspendus.html`

## API Calls

| Méthode | Endpoint | Description |
|---------|----------|-------------|

## Logs (console.log) - OBLIGATOIRE

Chaque étape du workflow doit être loguée avec `console.log()`:

| Checkpoint | Instruction console.log |
|------------|------------------------|
| `start` | `console.log('[WORKFLOW.impayes-suspendus-initial-load] START: Initialisation filtres par défaut')` |
| `state-initialized` | `console.log('[WORKFLOW.impayes-suspendus-initial-load] STEP: Filtres par défaut initialisés:', {motif: ''})` |
| `loading-shown` | `console.log('[WORKFLOW.impayes-suspendus-initial-load] STEP: Affichage skeleton loader')` |
| `auth-verified` | `console.log('[WORKFLOW.impayes-suspendus-initial-load] STEP: Token auth vérifié')` |
| `suspendus-fetch-start` | `console.log('[WORKFLOW.impayes-suspendus-initial-load] STEP: Appel API GET /api/impayes?is_suspended=true')` |
| `suspendus-fetched` | `console.log('[WORKFLOW.impayes-suspendus-initial-load] DATA: Factures suspendues reçues:', {count: facturesSuspendues.length})` |
| `motifs-extract-start` | `console.log('[WORKFLOW.impayes-suspendus-initial-load] STEP: Extraction motifs uniques depuis blacklist_motif')` |
| `motifs-extracted` | `console.log('[WORKFLOW.impayes-suspendus-initial-load] DATA: Motifs uniques extraits:', {count: motifs.length})` |
| `data-stored` | `console.log('[WORKFLOW.impayes-suspendus-initial-load] STEP: Données stockées dans le store')` |
| `table-rendered` | `console.log('[WORKFLOW.impayes-suspendus-initial-load] SUCCESS: Tableau rendu avec colonnes motif/date/réactivation')` |
| `end` | `console.log('[WORKFLOW.impayes-suspendus-initial-load] END: Page impayés-suspendus chargée en', duree, 'ms')` |
| `error` | `console.error('[WORKFLOW.impayes-suspendus-initial-load] ERROR:', error)` |
