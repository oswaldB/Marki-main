---
id: relances-modifier
type: frontend
folder: specs/workflows/frontend/relances/
description: Modifier une relance existante (brouillon ou à valider)
depends_on: [relances-details]
screen: relances
global: false
mockup_entry: specs/mockups/relances.html
---

# relances-modifier : Modifier une relance

## Description

Permettre la modification d'une relance en statut "brouillon" ou "à valider", avec édition des impayés associés, du template et de la date d'envoi.

## Étapes

```javascript
/**
 * @action Cliquer sur le bouton "Modifier" d'une relance
 * @checkpoint edit-clicked, relance sélectionnée pour modification
 * @condition relance.statut IN ['brouillon', 'a_valider']
 */

/**
 * @action Ouvrir le modal d'édition avec préchargement des données
 * @checkpoint modal-opened, formulaire prérempli avec données actuelles
 */

/**
 * @action Afficher les impayés actuellement liés
 * @checkpoint impayes-rendered, liste des impayés avec montants visibles
 */

/**
 * @action Permettre l'ajout/suppression d'impayés
 * @checkpoint impayes-editable, checkboxes actives pour sélection/désélection
 */

/**
 * @action Recalculer le montant total lors du changement d'impayés
 * @checkpoint total-recalculated, montant mis à jour en temps réel
 */

/**
 * @action Afficher l'éditeur de template d'email
 * @checkpoint template-editor-shown, textarea avec contenu actuel
 */

/**
 * @action Permettre la modification de la date d'envoi programmée
 * @checkpoint date-editable, date picker actif
 */

/**
 * @action Valider le formulaire avant sauvegarde
 * @checkpoint form-validated, contrôles de saisie passés
 * - Au moins un impayé sélectionné
 * - Email du payeur valide
 * - Template non vide
 * - Date d'envoi valide (future ou aujourd'hui)
 */

/**
 * @action Désactiver le bouton de sauvegarde et afficher le loader
 * @checkpoint saving-state, spinner visible, bouton disabled
 */

/**
 * @action Appeler PUT /api/relances/:id
 * @checkpoint api-called, requête de mise à jour envoyée
 * @api PUT /api/relances/:id
 * @payload { impayes_ids: [...], template: "...", date_envoi_programmee: "..." }
 * @response { success: true, relance: {...} }
 */

/**
 * @action Mettre à jour la relance dans le store Alpine
 * @checkpoint store-updated, données locales synchronisées
 */

/**
 * @action Afficher la notification de succès
 * @checkpoint success-toast-shown, message "Relance mise à jour"
 */

/**
 * @action Fermer le modal et rafraîchir la liste
 * @checkpoint modal-closed, liste affichée avec données à jour
 */

/**
 * @action Logger la modification dans l'historique
 * @checkpoint modification-logged, entrée d'historique créée
 */
```

## API Calls

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| PUT | `/api/relances/:id` | Mise à jour de la relance |
| GET | `/api/impayes?payeur_id=:id` | Impayés disponibles du payeur |

## Validation du formulaire

| Champ | Règle | Message d'erreur |
|-------|-------|------------------|
| impayes_ids | min: 1 | "Sélectionnez au moins un impayé" |
| template | non vide | "Le template ne peut pas être vide" |
| date_envoi_programmee | >= aujourd'hui | "La date doit être aujourd'hui ou future" |
| email_destinataire | format valide | "Email invalide" |

## Champs modifiables selon statut

| Champ | Brouillon | À valider | Programmée | Envoyée |
|-------|-----------|-----------|------------|---------|
| Impayés | ✅ | ✅ | ❌ | ❌ |
| Template | ✅ | ✅ | ❌ | ❌ |
| Date envoi | ✅ | ✅ | ❌ | ❌ |
| Email destinataire | ✅ | ✅ | ❌ | ❌ |

## Mockups de référence

- `specs/mockups/relances.html` (modal édition relance)
