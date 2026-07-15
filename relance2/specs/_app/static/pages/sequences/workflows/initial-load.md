---
id: sequences-initial-load
type: frontend
folder: specs/workflows/frontend/sequences/
description: Charger la liste des séquences de relance et de suivi
depends_on: [auth-check]
screen: sequences
global: false
mockup_entry: specs/mockups/sequences.html
---

# sequences-initial-load : Chargement initial Liste Séquences

## Description

Charger les séquences de relance et de suivi avec leurs métadonnées (nombre d'étapes, factures liées).

## Étapes

```javascript
/**
 * @action Initialiser les filtres par défaut (type='all')
 * @checkpoint state-initialized, filtres prêts
 */

/**
 * @action Afficher le skeleton loader
 * @checkpoint skeleton-shown, liste en chargement
 */

/**
 * @action Récupérer les séquences via GET /api/sequences
 * @checkpoint sequences-fetched, séquences reçues
 * 
 * **Note** : Le nombre d'étapes est calculé côté client depuis `sequence.emails.length`.
 * Pas de paramètre `include` dans le CRUD.
 */

/**
 * @action Calculer les statistiques des séquences côté client
 * @checkpoint stats-calculated, compteurs de factures liées calculés
 * 
 * **Approche full frontend** : Pas d'endpoint /stats.
 * Calcul à partir des données impayes : impayes.filter(i => i.sequence_id === seq.id).length
 */

/**
 * @action Stocker les données dans Alpine.store('sequences')
 * @checkpoint data-stored, séquences enrichies disponibles
 */

/**
 * @action Rendre la liste des séquences avec cartes visuelles
 * @checkpoint list-rendered, cartes séquences avec stats affichées
 */

/**
 * @action Activer le bouton de création de nouvelle séquence
 * @checkpoint create-button-enabled, bouton "Nouvelle séquence" fonctionnel
 */
```

## Mockups de référence

- `specs/mockups/sequences.html`

## API Calls

| Méthode | Endpoint | Description |
|---------|----------|-------------|

## Logs (console.log) - OBLIGATOIRE

Chaque étape du workflow doit être loguée avec `console.log()`:

| Checkpoint | Instruction console.log |
|------------|------------------------|
| `workflow-start` | `console.log('[WORKFLOW.sequences-initial-load] START: Initialisation chargement liste séquences')` |
| `auth-verified` | `console.log('[WORKFLOW.sequences-initial-load] STEP: Token auth vérifié')` |
| `state-initialized` | `console.log('[WORKFLOW.sequences-initial-load] STEP: Filtres par défaut initialisés (type=all)')` |
| `skeleton-shown` | `console.log('[WORKFLOW.sequences-initial-load] STEP: Skeleton loader affiché')` |
| `sequences-fetch-start` | `console.log('[WORKFLOW.sequences-initial-load] STEP: Appel API GET /api/sequences')` |
| `sequences-fetched` | `console.log('[WORKFLOW.sequences-initial-load] DATA: Séquences reçues:', {count: sequences.length})` |
| `impayes-fetch-start` | `console.log('[WORKFLOW.sequences-initial-load] STEP: Appel API GET /api/impayes (calcul stats côté client)')` |
| `impayes-fetched` | `console.log('[WORKFLOW.sequences-initial-load] DATA: Impayés reçus pour calcul stats:', {count: impayes.length})` |
| `stats-calculate-start` | `console.log('[WORKFLOW.sequences-initial-load] STEP: Début calcul statistiques séquences')` |
| `stats-calculated` | `console.log('[WORKFLOW.sequences-initial-load] SUCCESS: Statistiques calculées par séquence:', statsMap)` |
| `data-stored` | `console.log('[WORKFLOW.sequences-initial-load] STEP: Séquences enrichies stockées dans Alpine.store(\'sequences\')')` |
| `list-rendered` | `console.log('[WORKFLOW.sequences-initial-load] SUCCESS: Liste séquences rendue avec cartes visuelles')` |
| `create-button-enabled` | `console.log('[WORKFLOW.sequences-initial-load] STEP: Bouton "Nouvelle séquence" activé')` |
| `filters-applied` | `console.log('[WORKFLOW.sequences-initial-load] STEP: Filtres actifs appliqués sur la liste affichée')` |
| `loading-complete` | `console.log('[WORKFLOW.sequences-initial-load] END: Liste séquences chargée en', duree, 'ms')` |
| `loading-error` | `console.error('[WORKFLOW.sequences-initial-load] ERROR:', error)` |
