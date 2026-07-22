---
id: relances-preview
type: frontend
folder: specs/workflows/frontend/relances/
description: Prévisualiser le rendu d'une relance avant envoi
depends_on: [relances-details]
screen: relances
global: false
mockup_entry: specs/mockups/relances.html
---

# relances-preview : Prévisualiser une relance

## Description

Afficher un aperçu complet de la relance telle qu'elle sera envoyée au payeur, avec le template interprété et les variables remplacées.

## Étapes

```javascript
/**
 * @action Cliquer sur le bouton "Prévisualiser"
 * @checkpoint preview-clicked, intention de prévisualisation confirmée
 */

/**
 * @action Ouvrir le modal d'aperçu avec skeleton loader
 * @checkpoint modal-opened, overlay visible avec état de chargement
 */

/**
 * @action Récupérer les données de la relance via GET /api/relances/:id/preview
 * @checkpoint data-fetched, données de prévisualisation reçues
 * @api GET /api/relances/:id/preview
 * @response { 
 *   sujet: "...",
 *   contenu_html: "...",
 *   contenu_text: "...",
 *   variables: {...},
 *   destinataire: {...}
 * }
 */

/**
 * @action Récupérer les données du payeur pour les variables
 * @checkpoint payeur-fetched, nom, adresse, solde reçus
 */

/**
 * @action Interpréter le template avec les variables réelles
 * @checkpoint template-rendered, remplacement des {{variables}} effectué
 * 
 * Variables disponibles :
 * - {{payeur_nom}} - Nom du payeur
 * - {{montant_total}} - Montant total des impayés
 * - {{nombre_impayes}} - Nombre de factures impayées
 * - {{liste_impayes}} - Tableau HTML des impayés
 * - {{date_relance}} - Date du jour
 * - {{lien_paiement}} - Lien vers portail de paiement
 */

/**
 * @action Afficher l'objet de l'email
 * @checkpoint sujet-rendered, ligne objet visible
 */

/**
 * @action Afficher le rendu HTML de l'email
 * @checkpoint html-rendered, aperçu visuel dans iframe ou div
 * 
 * **Sécurité** : Le HTML est sanitizé pour éviter les XSS
 * Avant affichage, supprimer les scripts et styles dangereux
 */

/**
 * @action Afficher les informations du destinataire
 * @checkpoint destinataire-rendered, email et nom du payeur visibles
 */

/**
 * @action Afficher les pièces jointes (PDF factures si configuré)
 * @checkpoint attachments-shown, liste des PJ avec tailles visibles
 */

/**
 * @action Basculer entre vue HTML et vue texte brut
 * @checkpoint toggle-available, onglets ou switch HTML/Texte fonctionnel
 */

/**
 * @action Activer les boutons d'action depuis la prévisualisation
 * @checkpoint actions-enabled, boutons "Modifier" ou "Envoyer" actifs
 */
```

## API Calls

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/relances/:id/preview` | Données de prévisualisation |
| GET | `/api/payers/:id` | Infos du payeur (pour variables) |
| GET | `/api/impayes?relance_id=:id` | Impayés liés (pour tableau) |

## Variables de template disponibles

| Variable | Description | Exemple |
|----------|-------------|---------|
| `{{payeur_nom}}` | Nom du payeur | "ACME Corporation" |
| `{{montant_total}}` | Total TTC | "12 500,00 €" |
| `{{nombre_impayes}}` | Nb factures | "3" |
| `{{date_relance}}` | Date formatée | "21/07/2026" |
| `{{liste_impayes}}` | Tableau HTML | `<table>...</table>` |
| `{{lien_paiement}}` | URL portail | "https://.../pay?id=XXX" |
| `{{echeance_plus_ancienne}}` | Date | "15/01/2026" |
| `{{jours_retard}}` | Nombre | "187" |

## Mockups de référence

- `specs/mockups/relances.html` (modal prévisualisation)

## Options d'affichage

| Option | Description |
|--------|-------------|
| Vue desktop | Rendu email largeur 600px (standard) |
| Vue mobile | Rendu email largeur 320px |
| Vue texte | Version texte brut sans HTML |
