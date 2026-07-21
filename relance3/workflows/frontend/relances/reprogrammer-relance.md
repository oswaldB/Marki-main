---
id: relances-reprogrammer
type: frontend
folder: specs/workflows/frontend/relances/
description: Reprogrammer la date d'envoi d'une relance
depends_on: [relances-details]
screen: relances
global: false
mockup_entry: specs/mockups/relances.html
---

# relances-reprogrammer : Reprogrammer une relance

## Description

Changer la date d'envoi programmée d'une relance existante (avant son envoi effectif).

## Étapes

```javascript
/**
 * @action Cliquer sur le bouton "Reprogrammer" d'une relance
 * @checkpoint reschedule-clicked, relance sélectionnée
 * @condition relance.statut IN ['brouillon', 'a_valider', 'programmee']
 */

/**
 * @action Ouvrir le modal de reprogrammation
 * @checkpoint modal-opened, date picker et options visibles
 */

/**
 * @action Afficher la date actuellement programmée
 * @checkpoint current-date-shown, date existante préremplie
 */

/**
 * @action Afficher les informations de la relance (récapitulatif)
 * @checkpoint relance-info-rendered, payeur, montant, séquence visibles
 */

/**
 * @action Permettre la sélection d'une nouvelle date
 * @checkpoint date-picker-active, calendrier interactif ouvert
 * 
 * Contraintes :
 * - Date minimum : aujourd'hui
 * - Date maximum : +6 mois (optionnel)
 * - Pas de week-end (option configurable)
 */

/**
 * @action Valider la nouvelle date sélectionnée
 * @checkpoint date-validated, format et cohérence vérifiés
 */

/**
 * @action Afficher le récapitulatif avant confirmation
 * @checkpoint confirmation-shown, ancienne vs nouvelle date visibles
 */

/**
 * @action Confirmer la reprogrammation
 * @checkpoint confirmed, utilisateur a validé le changement
 */

/**
 * @action Appeler PUT /api/relances/:id
 * @checkpoint api-called, requête de mise à jour envoyée
 * @api PUT /api/relances/:id
 * @payload { date_envoi_programmee: "2026-08-15T09:00:00Z" }
 * @response { success: true, relance: {...} }
 */

/**
 * @action Mettre à jour la relance dans le store
 * @checkpoint store-updated, nouvelle date reflétée localement
 */

/**
 * @action Afficher la notification de succès
 * @checkpoint success-toast-shown, message "Relance reprogrammée"
 */

/**
 * @action Fermer le modal
 * @checkpoint modal-closed, retour à la liste
 */

/**
 * @action Logger la reprogrammation dans l'historique
 * @checkpoint rescheduled-logged, entrée avec ancienne/nouvelle date créée
 */
```

## API Calls

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| PUT | `/api/relances/:id` | Mise à jour de la date |

## Validation des dates

| Règle | Message d'erreur |
|-------|------------------|
| Date >= aujourd'hui | "La date doit être aujourd'hui ou ultérieure" |
| Date <= +6 mois | "La date ne peut pas dépasser 6 mois" (optionnel) |
| Pas de week-end | "Les relances ne sont pas envoyées le week-end" (optionnel) |

## Affichage du récapitulatif

```
Reprogrammation de la relance REL-001

Payeur : ACME Corporation
Montant : 12 500,00 €
Séquence : Relance Standard - Étape 2

Ancienne date : 25/07/2026
Nouvelle date : 15/08/2026

Confirmer la reprogrammation ?
```

## Impact sur les notifications

Si la relance était proche de son envoi (ex: dans 24h) :
- ⚠️ Afficher un avertissement
- "Cette relance était prévue dans moins de 24h"

## Mockups de référence

- `specs/mockups/relances.html` (modal reprogrammation)
