---
id: relances-envoyer
type: frontend
folder: specs/workflows/frontend/relances/
description: Envoyer une relance par email au payeur
depends_on: [relances-details, preview-relance]
screen: relances
global: false
mockup_entry: specs/mockups/relances.html
---

# relances-envoyer : Envoyer une relance

## Description

Envoyer immédiatement une relance par email au payeur, avec confirmation et suivi de l'envoi.

## Étapes

```javascript
/**
 * @action Cliquer sur le bouton "Envoyer maintenant"
 * @checkpoint send-clicked, intention d'envoi confirmée
 */

/**
 * @action Afficher la confirmation d'envoi (modal confirmation)
 * @checkpoint confirm-modal-shown, récapitulatif affiché
 */

/**
 * @action Confirmer l'envoi en cliquant "Oui, envoyer"
 * @checkpoint send-confirmed, envoi validé par utilisateur
 */

/**
 * @action Désactiver le bouton et afficher le loader d'envoi
 * @checkpoint sending-state, spinner visible, bouton disabled
 */

/**
 * @action Appeler POST /api/relances/:id/send
 * @checkpoint api-called, requête d'envoi envoyée
 * @api POST /api/relances/:id/send
 * @payload { relance_id, send_now: true }
 * @response { success: true, message_id, sent_at }
 */

/**
 * @action Traiter la réponse de l'API
 * @checkpoint response-handled, statut envoyée/erreur déterminé
 */

/**
 * @action Mettre à jour le statut de la relance en 'envoyee'
 * @checkpoint status-updated, store Alpine mis à jour
 */

/**
 * @action Afficher la notification de succès
 * @checkpoint success-toast-shown, message "Email envoyé avec succès"
 */

/**
 * @action Fermer le modal et rafraîchir la liste
 * @checkpoint modal-closed, liste des relances rechargée
 */

/**
 * @action Logger l'envoi dans l'historique
 * @checkpoint history-logged, entrée créée avec timestamp
 */
```

## API Calls

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/api/relances/:id/send` | Envoi de la relance |

## Gestion des erreurs

| Erreur | Message affiché | Action |
|--------|-----------------|--------|
| 400 - Pas d'email | "Le payeur n'a pas d'email configuré" | Redirection vers fiche contact |
| 400 - Blacklisté | "Le contact est blacklisté" | Info avec lien gestion blacklist |
| 500 - SMTP | "Erreur d'envoi SMTP" | Retry disponible |
| 429 - Rate limit | "Trop d'envois, veuillez réessayer" | Attente recommandée |

## Mockups de référence

- `specs/mockups/relances.html` (modal confirmation envoi)
- `specs/mockups/relances.html` (toast succès/erreur)
