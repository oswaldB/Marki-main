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
 * @action Récupérer les factures via GET /api/impayes?facture_soldee=0&statut=impaye
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

## API Calls

| Méthode | Endpoint | Description |
|---------|----------|-------------|

## Logs (console.log) - OBLIGATOIRE

Chaque étape du workflow doit être loguée avec `console.log()`:

| Checkpoint | Instruction console.log |
|------------|------------------------|
| `token-extracted` | `console.log('[WORKFLOW.portail-client-initial-load] START: Extraction paramètres URL (contactId, sig, expires)')` |
| `loading-shown` | `console.log('[WORKFLOW.portail-client-initial-load] STEP: Affichage spinner chargement')` |
| `token-validate-start` | `console.log('[WORKFLOW.portail-client-initial-load] STEP: Appel API GET /api/portail/verify pour validation token')` |
| `token-validated` | `console.log('[WORKFLOW.portail-client-initial-load] SUCCESS: Token validé, contact identifié:', {contactId})` |
| `client-loaded` | `console.log('[WORKFLOW.portail-client-initial-load] DATA: Données client chargées:', client)` |
| `factures-fetch-start` | `console.log('[WORKFLOW.portail-client-initial-load] STEP: Appel API GET /api/impayes?facture_soldee=0&statut=impaye')` |
| `factures-fetched` | `console.log('[WORKFLOW.portail-client-initial-load] DATA: Factures impayées reçues:', {count: factures.length})` |
| `totals-calculate-start` | `console.log('[WORKFLOW.portail-client-initial-load] STEP: Calcul solde total et nombre factures impayées')` |
| `totals-calculated` | `console.log('[WORKFLOW.portail-client-initial-load] DATA: Totaux calculés:', {soldeTotal, countFactures})` |
| `data-stored` | `console.log('[WORKFLOW.portail-client-initial-load] STEP: Stockage données dans store page')` |
| `tabs-initialized` | `console.log('[WORKFLOW.portail-client-initial-load] STEP: Initialisation onglets interface paiement')` |
| `content-rendered` | `console.log('[WORKFLOW.portail-client-initial-load] SUCCESS: Dashboard client rendu avec boutons paiement')` |
| `loading-complete` | `console.log('[WORKFLOW.portail-client-initial-load] END: Portail client chargé en', duree, 'ms')` |
| `error-displayed` | `console.warn('[WORKFLOW.portail-client-initial-load] WARN: Token invalide, affichage écran lien expiré')` |
| `loading-error` | `console.error('[WORKFLOW.portail-client-initial-load] ERROR:', error)` |
