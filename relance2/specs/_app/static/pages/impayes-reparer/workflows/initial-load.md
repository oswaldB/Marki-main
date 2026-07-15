# impayes-reparer/workflows/initial-load.js

Chargement initial des données.

## Logs (console.log) - OBLIGATOIRE

Chaque étape du workflow doit être loguée avec `console.log()`:

| Checkpoint | Instruction console.log |
|------------|------------------------|
| `start` | `console.log('[WORKFLOW.impayes-reparer-initial-load] START: Initialisation page Impayés Réparer')` |
| `loading-shown` | `console.log('[WORKFLOW.impayes-reparer-initial-load] STEP: Affichage spinner chargement')` |
| `auth-verified` | `console.log('[WORKFLOW.impayes-reparer-initial-load] STEP: Token auth vérifié')` |
| `data-fetch-start` | `console.log('[WORKFLOW.impayes-reparer-initial-load] STEP: Appel API GET /api/impayes?statut=impaye_a_reparer')` |
| `data-fetched` | `console.log('[WORKFLOW.impayes-reparer-initial-load] DATA: Impayés à réparer reçus:', {count: impayes.length})` |
| `data-processed` | `console.log('[WORKFLOW.impayes-reparer-initial-load] STEP: Traitement et tri des données')` |
| `data-transformed` | `console.log('[WORKFLOW.impayes-reparer-initial-load] DATA: Données triées par priorité de réparation:', {count: sorted.length})` |
| `filters-init` | `console.log('[WORKFLOW.impayes-reparer-initial-load] STEP: Initialisation filtres (statut, montant, ancienneté)')` |
| `filters-ready` | `console.log('[WORKFLOW.impayes-reparer-initial-load] SUCCESS: Filtres initialisés')` |
| `table-render-start` | `console.log('[WORKFLOW.impayes-reparer-initial-load] STEP: Rendu du tableau des impayés à réparer')` |
| `table-rendered` | `console.log('[WORKFLOW.impayes-reparer-initial-load] SUCCESS: Tableau rendu avec', rowsCount, 'lignes')` |
| `search-ready` | `console.log('[WORKFLOW.impayes-reparer-initial-load] STEP: Recherche et actions réparation prêtes')` |
| `end` | `console.log('[WORKFLOW.impayes-reparer-initial-load] END: Page Impayés Réparer chargée en', duree, 'ms')` |
| `error` | `console.error('[WORKFLOW.impayes-reparer-initial-load] ERROR:', error)` |
