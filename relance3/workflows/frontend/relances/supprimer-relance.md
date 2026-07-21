---
id: relances-supprimer
type: frontend
folder: specs/workflows/frontend/relances/
description: Supprimer une relance en brouillon ou à valider
depends_on: [relances-details]
screen: relances
global: false
mockup_entry: specs/mockups/relances.html
---

# relances-supprimer : Supprimer une relance

## Description

Permettre la suppression définitive d'une relance en statut "brouillon" ou "à valider", avec confirmation et vérification des impacts.

## Étapes

```javascript
/**
 * @action Cliquer sur le bouton "Supprimer" d'une relance
 * @checkpoint delete-clicked, relance sélectionnée pour suppression
 * @condition relance.statut IN ['brouillon', 'a_valider']
 * @note Les relances 'programmee', 'envoyee' ou 'annulee' ne peuvent pas être supprimées
 */

/**
 * @action Ouvrir le modal de confirmation
 * @checkpoint confirm-modal-opened, avertissement visible
 */

/**
 * @action Afficher le récapitulatif de la relance à supprimer
 * @checkpoint relance-summary-shown, montant, payeur, date visibles
 */

/**
 * @action Vérifier s'il y a des dépendances (impayés liés uniquement à cette relance)
 * @checkpoint dependencies-checked, vérification effectuée
 * 
 * Si des impayés sont liés uniquement à cette relance :
 * - Afficher un avertissement
 * - Proposer de les détacher ou d'annuler la suppression
 */

/**
 * @action Afficher le message d'avertissement irréversible
 * @checkpoint warning-shown, mention "Action irréversible" visible
 */

/**
 * @action Demander la confirmation explicite (checkbox ou saisie)
 * @checkpoint explicit-confirmation-required, utilisateur doit confirmer
 * Ex: "Tapez SUPPRIMER pour confirmer" ou checkbox "Je confirme la suppression"
 */

/**
 * @action Valider la confirmation
 * @checkpoint deletion-confirmed, utilisateur a confirmé explicitement
 */

/**
 * @action Appeler DELETE /api/relances/:id
 * @checkpoint api-called, requête de suppression envoyée
 * @api DELETE /api/relances/:id
 * @response { success: true, deleted_id: "..." }
 */

/**
 * @action Supprimer la relance du store Alpine
 * @checkpoint store-updated, liste locale mise à jour sans rechargement
 */

/**
 * @action Afficher la notification de succès
 * @checkpoint success-toast-shown, message "Relance supprimée"
 */

/**
 * @action Fermer le modal
 * @checkpoint modal-closed, retour à la liste
 */

/**
 * @action Logger la suppression dans l'historique système
 * @checkpoint deletion-logged, entrée d'audit créée
 */
```

## API Calls

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| DELETE | `/api/relances/:id` | Suppression de la relance |
| GET | `/api/impayes?relance_id=:id` | Vérification des dépendances |

## Conditions de suppression

| Statut | Suppression possible | Raison si non |
|--------|---------------------|---------------|
| brouillon | ✅ | - |
| a_valider | ✅ | - |
| programmee | ❌ | "La relance est déjà programmée" |
| envoyee | ❌ | "La relance a déjà été envoyée" |
| annulee | ❌ | "Conserver pour l'historique" |

## Message de confirmation

```
⚠️ Suppression définitive

Vous êtes sur le point de supprimer la relance suivante :

ID : REL-001
Payeur : ACME Corporation
Montant : 12 500,00 €
Date création : 15/07/2026

Cette action est irréversible. Les impayés liés seront détachés
mais conservés dans le système.

[  ] Je confirme vouloir supprimer cette relance

[Annuler]  [Supprimer définitivement]
```

## Impact sur les impayés liés

Lors de la suppression :
- Les impayés liés perdent leur association à cette relance
- Ils redeviennent disponibles pour une nouvelle relance
- Leur statut revient à "non relancé"

## Mockups de référence

- `specs/mockups/relances.html` (modal suppression)
