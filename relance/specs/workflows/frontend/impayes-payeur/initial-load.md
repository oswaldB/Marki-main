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
 * 1. `GET /api/impayes` - Liste tous les impayés non soldés
 * 2. `GET /api/contacts` - Liste tous les contacts (payeurs)
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
