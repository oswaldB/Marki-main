---
id: impayes-payeur-initial-load
type: frontend
folder: specs/workflows/frontend/impayes-payeur/
description: Charger les impayés groupés par payeur avec leurs factures
depends_on: [auth-check]
screen: impayes-payeur
global: false
mockup_entry: specs/mockups/impayes-payeur.html
---

# impayes-payeur-initial-load : Chargement initial Impayés par Payeur

## Description

Charger la vue groupée des impayés par payeur avec les factures associées et le scoring.

## Étapes

```javascript
/**
 * @action Initialiser les filtres par défaut (tri par montant total DESC)
 * @checkpoint filters-initialized, sortBy='montant', sortDirection='desc'
 */

/**
 * @action Afficher le spinner de chargement
 * @checkpoint loading-shown, overlay de chargement visible
 */

/**
 * @action Récupérer tous les impayés et les contacts associés
 * @checkpoint data-fetched, impayés et contacts reçus côté client
 * 
 * **Approche full frontend** (pas de route API dédiée) :
 * 1. `GET /api/impayes?facture_soldee=0&statut=impaye
 * 2. `GET /api/contacts?statut=actif&limit=50
 * 
 * **Traitement côté client** :
 * - Grouper les impayés par `payer_id`
 * - Joindre les infos du contact pour chaque groupe
 * - Calculer les totaux par payeur
 */

/**
 * @action Calculer les totaux par payeur côté client
 * @checkpoint totals-calculated, montants agrégés pour chaque payeur
 */

/**
 * @action Déterminer le statut (régulier/retard/critique) pour chaque payeur
 * @checkpoint status-computed, statut calculé selon ancienneté et montant
 */

/**
 * @action Stocker les données dans Alpine.store('impayesPayeur')
 * @checkpoint data-stored, payeurs triés et enrichis stockés
 */

/**
 * @action Rendre les cartes payeurs avec leurs factures repliables
 * @checkpoint cards-rendered, première carte dépliée par défaut
 */
```

## Mockups de référence

- `specs/mockups/impayes-payeur.html`

## API Calls

| Méthode | Endpoint | Description |
|---------|----------|-------------|

## Logs (console.log) - OBLIGATOIRE

Chaque étape du workflow doit être loguée avec `console.log()`:

| Checkpoint | Instruction console.log |
|------------|------------------------|
| `start` | `console.log('[WORKFLOW.impayes-payeur-initial-load] START: Initialisation chargement impayés par payeur')` |
| `loading-shown` | `console.log('[WORKFLOW.impayes-payeur-initial-load] STEP: Affichage spinner de chargement')` |
| `auth-verified` | `console.log('[WORKFLOW.impayes-payeur-initial-load] STEP: Token auth vérifié')` |
| `filters-initialized` | `console.log('[WORKFLOW.impayes-payeur-initial-load] STEP: Filtres initialisés:', {sortBy: 'montant', sortDirection: 'desc'})` |
| `impayes-fetch-start` | `console.log('[WORKFLOW.impayes-payeur-initial-load] STEP: Appel API GET /api/impayes?facture_soldee=0&statut=impaye')` |
| `impayes-fetched` | `console.log('[WORKFLOW.impayes-payeur-initial-load] DATA: Impayés reçus:', {count: impayes.length})` |
| `contacts-fetch-start` | `console.log('[WORKFLOW.impayes-payeur-initial-load] STEP: Appel API GET /api/contacts?statut=actif&limit=50')` |
| `contacts-fetched` | `console.log('[WORKFLOW.impayes-payeur-initial-load] DATA: Contacts reçus:', {count: contacts.length})` |
| `data-fetched` | `console.log('[WORKFLOW.impayes-payeur-initial-load] SUCCESS: Données impayés + contacts récupérées')` |
| `grouping-start` | `console.log('[WORKFLOW.impayes-payeur-initial-load] STEP: Groupement des impayés par payeur')` |
| `payeurs-fetched` | `console.log('[WORKFLOW.impayes-payeur-initial-load] DATA: Payeurs groupés:', {count: payeursGroupes.length})` |
| `totals-calculated` | `console.log('[WORKFLOW.impayes-payeur-initial-load] STEP: Calcul des totaux par payeur')` |
| `status-computed` | `console.log('[WORKFLOW.impayes-payeur-initial-load] STEP: Calcul des statuts (régulier/retard/critique)')` |
| `stats-calculated` | `console.log('[WORKFLOW.impayes-payeur-initial-load] SUCCESS: Stats calculées:', {payeurs: payeursGroupes.length, factures: impayes.length})` |
| `data-stored` | `console.log('[WORKFLOW.impayes-payeur-initial-load] STEP: Stockage dans Alpine.store(\'impayesPayeur\')')` |
| `table-rendered` | `console.log('[WORKFLOW.impayes-payeur-initial-load] SUCCESS: Cartes payeurs rendues, première carte dépliée')` |
| `end` | `console.log('[WORKFLOW.impayes-payeur-initial-load] END: Vue impayés par payeur chargée en', duree, 'ms')` |
| `error` | `console.error('[WORKFLOW.impayes-payeur-initial-load] ERROR:', error)` |
