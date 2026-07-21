---
id: relances-details
type: frontend
folder: specs/workflows/frontend/relances/
description: Afficher les détails complets d'une relance
depends_on: [relances-initial-load]
screen: relances
global: false
mockup_entry: specs/mockups/relances.html
---

# relances-details : Détails d'une relance

## Description

Afficher la fiche détaillée d'une relance avec ses informations complètes, historique et actions disponibles.

## Étapes

```javascript
/**
 * @action Cliquer sur le bouton "Voir détails" d'une relance
 * @checkpoint details-clicked, relance ID identifié
 */

/**
 * @action Ouvrir le modal de détails
 * @checkpoint modal-opened, overlay affiché avec skeleton loader
 */

/**
 * @action Récupérer les détails via GET /api/relances/:id
 * @checkpoint relance-fetched, données complètes reçues
 * @api GET /api/relances/:id
 * @response { relance: {...}, impayes: [...], historique: [...] }
 */

/**
 * @action Récupérer les infos du payeur via GET /api/payers/:payeur_id
 * @checkpoint payeur-fetched, nom et contact reçus
 */

/**
 * @action Récupérer la séquence associée via GET /api/sequences/:sequence_id
 * @checkpoint sequence-fetched, étape et template identifiés
 */

/**
 * @action Afficher les informations de la relance dans le modal
 * @checkpoint relance-rendered, statut, montant, dates visibles
 */

/**
 * @action Afficher la liste des impayés liés
 * @checkpoint impayes-rendered, tableau des factures affiché
 */

/**
 * @action Afficher l'historique des actions sur cette relance
 * @checkpoint historique-rendered, timeline des événements visible
 */

/**
 * @action Activer les boutons d'action selon le statut
 * @checkpoint actions-enabled, boutons modifier/envoyer/annuler actifs selon statut
 */
```

## API Calls

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/relances/:id` | Détails de la relance |
| GET | `/api/payers/:id` | Infos du payeur |
| GET | `/api/sequences/:id` | Détails de la séquence |
| GET | `/api/impayes?relance_id=:id` | Impayés liés à la relance |

## Mockups de référence

- `specs/mockups/relances.html` (modal détails)

## État des boutons selon statut

| Statut | Modifier | Envoyer | Annuler | Valider |
|--------|----------|---------|---------|---------|
| `brouillon` | ✅ | ✅ | ✅ | ❌ |
| `a_valider` | ✅ | ❌ | ✅ | ✅ |
| `programmee` | ❌ | ❌ | ✅ | ❌ |
| `envoyee` | ❌ | ❌ | ❌ | ❌ |
| `annulee` | ❌ | ❌ | ❌ | ❌ |
