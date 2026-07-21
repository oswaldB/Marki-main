---
id: relances-valider
type: frontend
folder: specs/workflows/frontend/relances/
description: Valider une relance pour passage en statut programmée
depends_on: [relances-details, preview-relance]
screen: relances
global: false
mockup_entry: specs/mockups/relances.html
---

# relances-valider : Valider une relance

## Description

Valider une relance en statut "à valider" pour la passer en statut "programmée" et la rendre prête à l'envoi automatique ou manuel.

## Étapes

```javascript
/**
 * @action Cliquer sur le bouton "Valider" d'une relance
 * @checkpoint validate-clicked, relance sélectionnée pour validation
 * @condition relance.statut === 'a_valider'
 */

/**
 * @action Ouvrir le modal de validation avec récapitulatif
 * @checkpoint modal-opened, écran de validation affiché
 */

/**
 * @action Afficher les informations de la relance
 * @checkpoint relance-info-rendered, montant, payeur, séquence visibles
 */

/**
 * @action Afficher la prévisualisation du message
 * @checkpoint preview-rendered, aperçu de l'email visible
 */

/**
 * @action Afficher la date d'envoi programmée
 * @checkpoint date-shown, date de relance visible
 */

/**
 * @action Vérifier la validité des données avant validation
 * @checkpoint data-validated, contrôles passés
 * - Email du payeur présent et valide
 * - Au moins un impayé lié
 * - Template non vide
 * - Date d'envoi future ou aujourd'hui
 */

/**
 * @action Afficher les alertes si problèmes détectés
 * @checkpoint alerts-shown, avertissements visibles si nécessaire
 * Ex: "Email non vérifié", "Payeur blacklisté", etc.
 */

/**
 * @action Demander confirmation finale
 * @checkpoint confirmation-requested, résumé des actions visibles
 */

/**
 * @action Confirmer la validation
 * @checkpoint validation-confirmed, utilisateur a validé
 */

/**
 * @action Appeler POST /api/relances/:id/validate
 * @checkpoint api-called, requête de validation envoyée
 * @api POST /api/relances/:id/validate
 * @payload { 
 *   relance_id: "...",
 *   validated_by: user_id,
 *   validated_at: timestamp
 * }
 * @response { success: true, relance: {...} }
 */

/**
 * @action Mettre à jour le statut dans le store
 * @checkpoint status-updated, statut passé à 'programmee'
 */

/**
 * @action Afficher la notification de succès
 * @checkpoint success-toast-shown, message "Relance validée et programmée"
 */

/**
 * @action Fermer le modal
 * @checkpoint modal-closed, retour à la liste
 */

/**
 * @action Programmer la relance pour envoi automatique (si date future)
 * @checkpoint scheduled-for-send, tâche cron créée côté backend
 */

/**
 * @action Logger la validation dans l'historique
 * @checkpoint validation-logged, entrée avec validateur et date créée
 */
```

## API Calls

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/api/relances/:id/validate` | Validation de la relance |

## Validation préalable

| Vérification | Bloquant | Message |
|--------------|----------|---------|
| Email payeur présent | ✅ Oui | "Le payeur n'a pas d'email configuré" |
| Email format valide | ✅ Oui | "L'email du payeur est invalide" |
| Au moins 1 impayé | ✅ Oui | "Aucun impayé lié à cette relance" |
| Template non vide | ✅ Oui | "Le template de message est vide" |
| Date d'envoi >= aujourd'hui | ✅ Oui | "La date d'envoi est dans le passé" |
| Payeur non blacklisté | ⚠️ Non | "⚠️ Le payeur est blacklisté" |
| Email vérifié | ⚠️ Non | "⚠️ L'email n'a pas été vérifié" |

## Récapitulatif affiché

```
Validation de la relance

Payeur : ACME Corporation (contact@acme.com)
Montant total : 12 500,00 €
Nombre d'impayés : 3
Séquence : Relance Standard - Étape 2

Date d'envoi programmée : 25/07/2026 à 09:00

✅ Email valide
✅ Template complété
✅ Impayés sélectionnés

La relance sera envoyée automatiquement à la date programmée.
Vous pourrez l'annuler ou la reprogrammer jusqu'à l'envoi.

[Annuler]  [Valider et programmer]
```

## Changement de statut

```
a_valider ──validation──> programmee
```

Après validation :
- La relance apparaît dans "Relances programmées"
- Elle sera envoyée automatiquement à la date programmée
- L'utilisateur peut encore l'annuler ou la reprogrammer

## Mockups de référence

- `specs/mockups/relances.html` (modal validation)
- `specs/mockups/relances-validation.html` (interface validation spécifique)
