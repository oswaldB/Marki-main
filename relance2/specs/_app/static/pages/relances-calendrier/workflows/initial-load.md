---
id: relances-calendrier-initial-load
type: frontend
folder: specs/workflows/frontend/relances-calendrier/
description: Charger le calendrier mensuel des relances programmées
depends_on: [auth-check]
screen: relances-calendrier
global: false
mockup_entry: specs/mockups/relances-calendrier.html
---

# relances-calendrier-initial-load : Chargement initial Calendrier Relances

## Description

Charger les relances programmées pour le mois courant et générer la vue calendrier.

## Étapes

```javascript
/**
 * @action Initialiser le mois courant et la vue par défaut (mois)
 * @checkpoint calendar-initialized, currentDate = new Date(), viewMode = 'month'
 */

/**
 * @action Afficher le spinner de chargement
 * @checkpoint loading-shown, calendrier en état de chargement
 */

/**
 * @action Calculer la plage de dates du mois affiché (début/fin)
 * @checkpoint date-range-calculated, premier et dernier jour du mois
 */

/**
 * @action Récupérer les relances du mois via GET /api/relances * @checkpoint relances-fetched, relances du mois reçues
 * 
 * **Approche** : Récupération de toutes les relances puis filtrage côté client
 * car le CRUD ne supporte pas les opérateurs de comparaison (?date_gte= n'existe pas).
 * 
 * Filtrage : relances.filter(r => r.date_envoi >= debut && r.date_envoi <= fin)
 */

/**
 * @action Grouper les relances par jour
 * @checkpoint relances-grouped, Map<date, relances[]> créée
 */

/**
 * @action Générer la grille du calendrier avec les jours
 * @checkpoint grid-rendered, 42 cellules (6 semaines) générées
 */

/**
 * @action Afficher les relances sur les jours concernés avec badges
 * @checkpoint relances-rendered, badges colorés par statut visibles
 */

/**
 * @action Masquer le spinner
 * @checkpoint loading-complete, calendrier entièrement interactif
 */
```

## Mockups de référence

- `specs/mockups/relances-calendrier.html`

## API Calls

| Méthode | Endpoint | Description |
|---------|----------|-------------|

## Logs (console.log) - OBLIGATOIRE

Chaque étape du workflow doit être loguée avec `console.log()`:

| Checkpoint | Instruction console.log |
|------------|------------------------|
| `start` | `console.log('[WORKFLOW.relances-calendrier-initial-load] START: Initialisation calendrier relances')` |
| `auth-verified` | `console.log('[WORKFLOW.relances-calendrier-initial-load] STEP: Token auth vérifié')` |
| `current-period` | `console.log('[WORKFLOW.relances-calendrier-initial-load] STEP: Période courante calculée:', {year: currentDate.getFullYear(), month: currentDate.getMonth() + 1})` |
| `loading-shown` | `console.log('[WORKFLOW.relances-calendrier-initial-load] STEP: Affichage spinner chargement')` |
| `date-range-calculated` | `console.log('[WORKFLOW.relances-calendrier-initial-load] STEP: Plage de dates calculée:', {debut, fin})` |
| `relances-fetch-start` | `console.log('[WORKFLOW.relances-calendrier-initial-load] STEP: Appel API GET /api/relances')` |
| `relances-fetched` | `console.log('[WORKFLOW.relances-calendrier-initial-load] DATA: Relances reçues:', {count: relances.length})` |
| `relances-filtered` | `console.log('[WORKFLOW.relances-calendrier-initial-load] DATA: Relances filtrées pour le mois:', {count: relancesMonth.length})` |
| `relances-grouped` | `console.log('[WORKFLOW.relances-calendrier-initial-load] STEP: Relances groupées par jour:', {days: groupedRelances.size})` |
| `grid-rendered` | `console.log('[WORKFLOW.relances-calendrier-initial-load] STEP: Grille calendrier générée (42 cellules)')` |
| `calendar-rendered` | `console.log('[WORKFLOW.relances-calendrier-initial-load] STEP: Badges relances affichés par jour')` |
| `calendar-interactive` | `console.log('[WORKFLOW.relances-calendrier-initial-load] STEP: Calendrier interactif (handlers navigation)')` |
| `loading-complete` | `console.log('[WORKFLOW.relances-calendrier-initial-load] END: Calendrier chargé en', duree, 'ms')` |
| `error` | `console.error('[WORKFLOW.relances-calendrier-initial-load] ERROR:', error)` |
