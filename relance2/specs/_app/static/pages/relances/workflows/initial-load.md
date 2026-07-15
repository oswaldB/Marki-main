---
id: relances-initial-load
type: frontend
folder: specs/workflows/frontend/relances/
description: Charger la liste des relances programmées et envoyées
depends_on: [auth-check]
screen: relances
global: false
mockup_entry: specs/mockups/relances.html
---

# relances-initial-load : Chargement initial Liste Relances

## Description

Charger la liste des relances avec leur statut, payeur associé, et options de filtrage.

## Étapes

```javascript
/**
 * @action Initialiser les filtres par défaut (statut='')
 * @checkpoint state-initialized, filtres et pagination initialisés
 */

/**
 * @action Afficher le skeleton loader du tableau
 * @checkpoint skeleton-shown, lignes de chargement visibles
 */

/**
 * @action Récupérer les données via GET /api/relances GET /api/contacts?statut=actif&limit=50
 * @checkpoint data-fetched, relances, contacts et impayes reçus
 * 
 * **Approche** : 3 appels API nécessaires car le mockup affiche:
 * - Les relances avec leurs statuts
 * - Les contacts (payeurs) avec nom, email, total impayés
 * - Les impayes (factures) liés aux payeurs
 * 
 * Les données sont ensuite agrégées côté client pour le groupement par payeur.
 */

/**
 * @action Calculer les statistiques des relances côté client
 * @checkpoint stats-calculated, compteurs par statut calculés
 * 
 * **Approche full frontend** : Pas d'endpoint /stats. 
 * Calcul à partir des données reçues : relances.filter(r => r.statut === 'xxx').length
 */

/**
 * @action Stocker les données dans Alpine.store('relances')
 * @checkpoint data-stored, relances et stats disponibles
 */

/**
 * @action Rendre le tableau groupé par payeur
 * @checkpoint table-rendered, sections dépliables par payeur affichées
 */

/**
 * @action Activer les contrôles d'action (envoi, modification)
 * @checkpoint actions-enabled, boutons d'action fonctionnels
 */
```

## Mockups de référence

- `specs/mockups/relances.html`

## API Calls

| Méthode | Endpoint | Description |
|---------|----------|-------------|

## Logs (console.log) - OBLIGATOIRE

Chaque étape du workflow doit être loguée avec `console.log()`:

| Checkpoint | Instruction console.log |
|------------|------------------------|
| `start` | `console.log('[WORKFLOW.relances-initial-load] START: Initialisation chargement liste relances')` |
| `loading-shown` | `console.log('[WORKFLOW.relances-initial-load] STEP: Affichage skeleton loader tableau')` |
| `auth-verified` | `console.log('[WORKFLOW.relances-initial-load] STEP: Token auth vérifié')` |
| `filters-initialized` | `console.log('[WORKFLOW.relances-initial-load] STEP: Filtres initialisés (statut, pagination)')` |
| `relances-fetch-start` | `console.log('[WORKFLOW.relances-initial-load] STEP: Appel API GET /api/relances')` |
| `relances-fetched` | `console.log('[WORKFLOW.relances-initial-load] DATA: Relances reçues:', {count: relances.length})` |
| `contacts-fetch-start` | `console.log('[WORKFLOW.relances-initial-load] STEP: Appel API GET /api/contacts?statut=actif&limit=50')` |
| `contacts-fetched` | `console.log('[WORKFLOW.relances-initial-load] DATA: Contacts reçus:', {count: contacts.length})` |
| `impayes-fetch-start` | `console.log('[WORKFLOW.relances-initial-load] STEP: Appel API GET /api/impayes?facture_soldee=0&statut=impaye')` |
| `impayes-fetched` | `console.log('[WORKFLOW.relances-initial-load] DATA: Impayés reçus:', {count: impayes.length})` |
| `stats-calculated` | `console.log('[WORKFLOW.relances-initial-load] DATA: Stats calculées:', stats)` |
| `data-stored` | `console.log('[WORKFLOW.relances-initial-load] STEP: Données stockées dans Alpine.store(\'relances\')')` |
| `table-rendered` | `console.log('[WORKFLOW.relances-initial-load] SUCCESS: Tableau groupé par payeur rendu')` |
| `actions-enabled` | `console.log('[WORKFLOW.relances-initial-load] STEP: Boutons d\'action activés (envoi, modification)')` |
| `end` | `console.log('[WORKFLOW.relances-initial-load] END: Liste relances chargée en', duree, 'ms')` |
| `error` | `console.error('[WORKFLOW.relances-initial-load] ERROR:', error)` |
