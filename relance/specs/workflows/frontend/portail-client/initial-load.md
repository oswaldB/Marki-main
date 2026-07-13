---
id: portail-client-initial-load
type: frontend
folder: specs/workflows/frontend/portail-client/
description: Charger le dashboard client avec factures et paiement
depends_on: []
screen: portail-client
global: false
mockup_entry: specs/mockups/portail-client.html
---

# portail-client-initial-load : Chargement initial Portail Client

## Description

Charger les informations du client, ses factures impayées et options de paiement pour le portail.

## Étapes

```javascript
/**
 * @action Extraire les paramètres depuis l'URL : contactId, sig (signature), expires
 * @checkpoint token-extracted, contactId, sig et expires récupérés de `/espace/{id}/impaye?sig=xxx&expires=xxx`
 */

/**
 * @action Afficher le spinner de chargement
 * @checkpoint loading-shown, overlay sur la page
 */

/**
 * @action Vérifier le token signé et récupérer les données via GET /api/portail/verify?contactId=:id&sig=:sig&expires=:expires
 * @checkpoint token-validated, signature HMAC vérifiée et contact identifié
 * 
 * **Backend** : Vérifie la signature avec `verifyContactToken()` (voir workflow backend `generate-contact-token`)
 * - Vérifie que `expires` n'est pas dépassé (3 min par défaut)
 * - Recalcule la signature HMAC-SHA256 et compare avec `sig`
 * - Retourne les données du contact si valide
 */

/**
 * @action Afficher l'écran "Lien temporaire expiré" si token invalide
 * @checkpoint error-displayed, message expliquant d'utiliser le lien email pour en générer un nouveau
 * 
 * **UI** : Mockup `portail-client-dead-token.html`
 * Message : "Lien temporaire expiré. Merci d'utiliser celui reçu par email pour en générer un nouveau et voir vos documents."
 */

/**
 * @action Récupérer les factures via GET /api/impayes?payer_id=:id&facture_soldee=false
 * @checkpoint factures-fetched, factures impayées du client reçues
 * 
 * **Condition** : Seulement si token valide
 */

/**
 * @action Calculer le solde total et le nombre de factures impayées
 * @checkpoint totals-calculated, montants agrégés calculés
 */

/**
 * @action Stocker les données dans le store page
 * @checkpoint data-stored, client et factures disponibles
 */

/**
 * @action Afficher le dashboard client avec boutons de paiement
 * @checkpoint content-rendered, interface de paiement fonctionnelle
 */
```

## Mockups de référence

- `specs/mockups/portail-client.html` - Écran principal du portail client
- `specs/mockups/portail-client-dead-token.html` - Écran lien temporaire expiré (token invalide)
