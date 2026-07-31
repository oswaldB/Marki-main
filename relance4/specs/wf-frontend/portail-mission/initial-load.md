---
id: portail-mission-initial-load
type: frontend
folder: specs/workflows/frontend/portail-mission/
description: Charger le dashboard d'une facture/impayé pour le portail
depends_on: []
screen: portail-mission
global: false
mockup_entry: specs/mockups/portail-mission.html
---

# portail-mission-initial-load : Chargement initial Portail Mission (Facture unique)

## Description

Charger les informations d'une facture/impayé spécifique pour le portail client, avec ses détails et options de paiement.

**Similaire à** `portail-client/initial-load.md` mais pour une **seule facture** au lieu de toutes les factures du client.

## Étapes

```javascript
/**
 * @action Extraire les paramètres depuis l'URL : impayeId, sig (signature), expires
 * @checkpoint token-extracted, impayeId, sig et expires récupérés de `/mission/{id}?sig=xxx&expires=xxx`
 */

/**
 * @action Afficher le spinner de chargement
 * @checkpoint loading-shown, overlay sur la page
 */

/**
 * @action Vérifier le token signé et récupérer les données via GET /api/portail/verify?impayeId=:id&sig=:sig&expires=:expires
 * @checkpoint token-validated, signature HMAC vérifiée et impayé identifié
 * 
 * **Backend** : Vérifie la signature avec `verifyContactToken()` (voir workflow backend `generate-contact-token`)
 * - Vérifie que `expires` n'est pas dépassé (3 min par défaut)
 * - Recalcule la signature HMAC-SHA256 et compare avec `sig`
 * - Retourne les données de l'impayé et du contact si valide
 */

/**
 * @action Afficher l'écran "Lien temporaire expiré" si token invalide
 * @checkpoint error-displayed, message expliquant d'utiliser le lien email pour en générer un nouveau
 * 
 * **UI** : Réutilise le mockup `portail-client-dead-token.html` ou version adaptée
 * Message : "Lien temporaire expiré. Merci d'utiliser celui reçu par email pour en générer un nouveau."
 */

/**
 * @action Récupérer les détails de l'impayé via GET /api/impayes?facture_soldee=0&statut=impaye
 * @checkpoint impaye-fetched, informations de la facture reçues
 * 
 * **Condition** : Seulement si token valide
 */

/**
 * @action Récupérer les informations du payeur via GET /api/contacts?statut=actif&limit=50
 * @checkpoint contact-fetched, informations du client reçues
 */

/**
 * @action Stocker les données dans le store page
 * @checkpoint data-stored, impayé et contact disponibles
 */

/**
 * @action Afficher le dashboard de la facture avec option de paiement
 * @checkpoint content-rendered, interface portail affichée
 */
```

## Mockups de référence

- `specs/mockups/portail-mission.html` - Écran de la facture/mission
- `specs/mockups/portail-client-dead-token.html` - Écran lien expiré (réutilisable)

## API Calls

| Méthode | Endpoint | Description |
|---------|----------|-------------|
