# relances-detail/workflows/initial-load.js

Chargement initial des données.

## Logs (console.log) - OBLIGATOIRE

Chaque étape du workflow doit être loguée avec `console.log()`:

| Checkpoint | Instruction console.log |
|------------|------------------------|
| `start` | `console.log('[WORKFLOW.relances-detail-initial-load] START: Début chargement détail relance, ID =', id)` |
| `loading-shown` | `console.log('[WORKFLOW.relances-detail-initial-load] STEP: Affichage spinner de chargement')` |
| `auth-verified` | `console.log('[WORKFLOW.relances-detail-initial-load] STEP: Token auth vérifié, utilisateur autorisé')` |
| `relance-fetch-start` | `console.log('[WORKFLOW.relances-detail-initial-load] STEP: Appel API GET /api/relances/' + id)` |
| `relance-fetched` | `console.log('[WORKFLOW.relances-detail-initial-load] DATA: Relance reçue:', relance)` |
| `impaye-fetch-start` | `console.log('[WORKFLOW.relances-detail-initial-load] STEP: Appel API GET /api/impayes?facture_soldee=0&statut=impaye')` |
| `impaye-fetched` | `console.log('[WORKFLOW.relances-detail-initial-load] DATA: Impayé associé reçu:', impaye)` |
| `contact-fetch-start` | `console.log('[WORKFLOW.relances-detail-initial-load] STEP: Appel API GET /api/contacts?statut=actif&limit=50')` |
| `contact-fetched` | `console.log('[WORKFLOW.relances-detail-initial-load] DATA: Contact payeur reçu:', contact)` |
| `historique-fetch-start` | `console.log('[WORKFLOW.relances-detail-initial-load] STEP: Appel API GET /api/events?type=relance&relance_id=' + id)` |
| `historique-fetched` | `console.log('[WORKFLOW.relances-detail-initial-load] DATA: Historique événements reçu:', {count: historique.length})` |
| `kpis-calculated` | `console.log('[WORKFLOW.relances-detail-initial-load] SUCCESS: KPIs relance calculés:', kpis)` |
| `data-stored` | `console.log('[WORKFLOW.relances-detail-initial-load] STEP: Données stockées dans store page')` |
| `content-rendered` | `console.log('[WORKFLOW.relances-detail-initial-load] SUCCESS: Détail relance rendu, onglet par défaut actif')` |
| `end` | `console.log('[WORKFLOW.relances-detail-initial-load] END: Détail relance chargé en', duree, 'ms')` |
| `error` | `console.error('[WORKFLOW.relances-detail-initial-load] ERROR:', error)` |
