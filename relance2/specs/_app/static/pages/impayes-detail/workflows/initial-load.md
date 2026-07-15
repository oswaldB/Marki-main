---
id: impayes-detail-initial-load
type: frontend
folder: specs/workflows/frontend/impayes-detail/
description: Charger le détail complet d'un impayé avec historique des relances
depends_on: [auth-check]
screen: impayes-detail
global: false
mockup_entry: specs/mockups/impayes-detail.html
---

# impayes-detail-initial-load : Chargement initial Détail Impayé

## Description

Charger les informations complètes d'un impayé, son historique de relances et les contacts associés.

## Étapes

```javascript
/**
 * @action Extraire l'ID de l'impayé depuis l'URL (/impayes-detail?id=:id)
 * @checkpoint impaye-id-extracted, paramètre d'URL récupéré
 */

/**
 * @action Afficher le spinner de chargement
 * @checkpoint loading-shown, overlay sur toute la page
 */

/**
 * @action Récupérer l'impayé via GET /api/impayes?facture_soldee=0&statut=impaye
 * @checkpoint impaye-fetched, données complètes reçues (table 'impayes')
 */

/**
 * @action Récupérer le payeur via GET /api/contacts?statut=actif&limit=50
 * @checkpoint payer-fetched, informations du payeur complétées
 */

/**
 * @action Récupérer les relances via GET /api/relancesimpaye_ids=:id
 * @checkpoint relances-fetched, relances liées à l'impayé reçues (table 'relances')
 */

/**
 * @action Stocker toutes les données dans le store page
 * @checkpoint data-stored, store.impaye et collections associées remplies
 */

/**
 * @action Afficher le contenu complet avec l'onglet 'Détails' actif
 * @checkpoint content-rendered, page complète sans spinner
 */
```

## API Calls

| Endpoint | Table | Description |
|----------|-------|-------------|
| `GET /api/impayes?facture_soldee=0&statut=impaye
| `GET /api/contacts?statut=actif&limit=50
| `GET /api/relancesimpaye_ids=:id` | `relances` | Relances liées |

## Notes

- L'impayé contient déjà les champs dénormalisés du payeur (`payeur_nom`, `payeur_email`, etc.)
- L'appel au contact n'est nécessaire que si on veut des informations complémentaires
- Les relances sont filtrées par `impaye_ids` (tableau contenant l'ID)

## Mockups de référence

- `specs/mockups/impayes-detail.html`

## Logs (console.log) - OBLIGATOIRE

Chaque étape du workflow doit être loguée avec `console.log()`:

| Checkpoint | Instruction console.log |
|------------|------------------------|
| `start` | `console.log('[WORKFLOW.impayes-detail-initial-load] START: Début chargement détail impayé, ID =', id)` |
| `loading-shown` | `console.log('[WORKFLOW.impayes-detail-initial-load] STEP: Affichage spinner de chargement')` |
| `auth-verified` | `console.log('[WORKFLOW.impayes-detail-initial-load] STEP: Token auth vérifié, utilisateur autorisé')` |
| `impaye-fetch-start` | `console.log('[WORKFLOW.impayes-detail-initial-load] STEP: Appel API GET /api/impayes?facture_soldee=0&statut=impaye')` |
| `impaye-fetched` | `console.log('[WORKFLOW.impayes-detail-initial-load] DATA: Impayé reçu:', impaye)` |
| `relances-fetch-start` | `console.log('[WORKFLOW.impayes-detail-initial-load] STEP: Appel API GET /api/relances?impaye_ids=' + id)` |
| `relances-fetched` | `console.log('[WORKFLOW.impayes-detail-initial-load] DATA: Relances reçues:', {count: relances.length})` |
| `contact-fetch-start` | `console.log('[WORKFLOW.impayes-detail-initial-load] STEP: Appel API GET /api/contacts?statut=actif&limit=50')` |
| `contact-fetched` | `console.log('[WORKFLOW.impayes-detail-initial-load] DATA: Contact payeur reçu:', contact)` |
| `sequence-loaded` | `console.log('[WORKFLOW.impayes-detail-initial-load] DATA: Séquence de relance chargée:', sequence)` |
| `kpis-calculated` | `console.log('[WORKFLOW.impayes-detail-initial-load] SUCCESS: KPIs impayé calculés:', kpis)` |
| `end` | `console.log('[WORKFLOW.impayes-detail-initial-load] END: Détail impayé chargé en', duree, 'ms')` |
| `error` | `console.error('[WORKFLOW.impayes-detail-initial-load] ERROR:', error)` |
