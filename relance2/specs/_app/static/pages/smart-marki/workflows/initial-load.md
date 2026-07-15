---
id: smart-marki-initial-load
type: frontend
folder: specs/workflows/frontend/smart-marki/
description: Charger les suggestions IA et statistiques Smart Marki
depends_on: [auth-check]
screen: smart-marki
global: false
mockup_entry: specs/mockups/smart-marki.html
---

# smart-marki-initial-load : Chargement initial Smart Marki

## Description

Charger les suggestions générées par l'IA, les statistiques d'utilisation et l'état des features.

## Étapes

```javascript
/**
 * @action Initialiser l'état des features activées depuis localStorage
 * @checkpoint features-initialized, préférences utilisateur chargées
 */

/**
 * @action Afficher le spinner de chargement
 * @checkpoint loading-shown, interface en chargement
 */

/**
 * @action Récupérer les suggestions IA via GET /api/smart/suggestions
 * @checkpoint suggestions-fetched, suggestions d'actions reçues
 */

/**
 * @action Récupérer les statistiques Smart via GET /api/smart/stats
 * @checkpoint stats-fetched, taux d'acceptation et temps économisé reçus
 */

/**
 * @action Récupérer l'historique des actions via GET /api/smart/history
 * @checkpoint history-fetched, actions précédemment acceptées/rejetées
 */

/**
 * @action Stocker les données dans Alpine.store('smartMarki')
 * @checkpoint data-stored, suggestions, stats et historique disponibles
 */

/**
 * @action Rendre les cartes de suggestions avec niveaux de confiance
 * @checkpoint cards-rendered, suggestions affichées avec boutons accepter/refuser
 */

/**
 * @action Activer l'assistant chat si feature activée
 * @checkpoint chat-enabled, interface de chat fonctionnelle
 */
```

## Mockups de référence

- `specs/mockups/smart-marki.html`

## API Calls

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/api/smart/suggestions` | Suggestions IA |
| `GET` | `/api/smart/stats` | Statistiques (taux acceptation, temps économisé) |
| `GET` | `/api/smart/history` | Historique des actions acceptées/rejetées |

## Logs (console.log) - OBLIGATOIRE

Chaque étape du workflow doit être loguée avec `console.log()`:

| Checkpoint | Instruction console.log |
|------------|------------------------|
| `features-initialized` | `console.log('[WORKFLOW.smart-marki-initial-load] STEP: Features initialisées depuis localStorage:', features)` |
| `loading-shown` | `console.log('[WORKFLOW.smart-marki-initial-load] START: Affichage spinner chargement Smart Marki')` |
| `suggestions-fetch-start` | `console.log('[WORKFLOW.smart-marki-initial-load] STEP: Appel API GET /api/smart/suggestions')` |
| `suggestions-fetched` | `console.log('[WORKFLOW.smart-marki-initial-load] DATA: Suggestions IA reçues:', {count: suggestions.length})` |
| `stats-fetch-start` | `console.log('[WORKFLOW.smart-marki-initial-load] STEP: Appel API GET /api/smart/stats')` |
| `stats-fetched` | `console.log('[WORKFLOW.smart-marki-initial-load] DATA: Statistiques reçues:', stats)` |
| `history-fetch-start` | `console.log('[WORKFLOW.smart-marki-initial-load] STEP: Appel API GET /api/smart/history')` |
| `history-fetched` | `console.log('[WORKFLOW.smart-marki-initial-load] DATA: Historique reçu:', {count: history.length})` |
| `data-stored` | `console.log('[WORKFLOW.smart-marki-initial-load] SUCCESS: Données stockées dans Alpine.store(\'smartMarki\')')` |
| `cards-rendered` | `console.log('[WORKFLOW.smart-marki-initial-load] SUCCESS: Cartes suggestions rendues avec niveaux de confiance')` |
| `chat-enable-start` | `console.log('[WORKFLOW.smart-marki-initial-load] STEP: Activation assistant chat')` |
| `chat-enabled` | `console.log('[WORKFLOW.smart-marki-initial-load] SUCCESS: Interface chat activée')` |
| `loading-complete` | `console.log('[WORKFLOW.smart-marki-initial-load] END: Smart Marki chargé en', duree, 'ms')` |
| `loading-error` | `console.error('[WORKFLOW.smart-marki-initial-load] ERROR:', error)` |
