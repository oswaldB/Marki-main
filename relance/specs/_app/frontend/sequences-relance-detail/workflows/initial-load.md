---
id: sequences-relance-detail-initial-load
type: frontend
folder: specs/workflows/frontend/sequences-relance-detail/
description: Charger le détail d'une séquence de relance avec ses étapes
depends_on: [auth-check]
screen: sequences-relance-detail
global: false
mockup_entry: specs/mockups/sequences-relance-detail.html
---

# sequences-relance-detail-initial-load : Chargement initial Détail Séquence Relance

## Description

Charger les détails complets d'une séquence de relance : étapes, modèles d'email, règles et aperçu.

## Étapes

```javascript
/**
 * @action Extraire l'ID de la séquence depuis l'URL (/sequences/relance/:id)
 * @checkpoint sequence-id-extracted, paramètre URL récupéré
 */

/**
 * @action Afficher le spinner de chargement
 * @checkpoint loading-shown, overlay sur la page
 */

/**
 * @action Récupérer la séquence via GET /api/sequences/:id
 * @checkpoint sequence-fetched, données de la séquence reçues
 */

/**
 * @action Extraire les étapes depuis la clé `etapes` de la réponse
 * @checkpoint etapes-extracted, liste ordonnée des étapes disponible
 */

/**
 * @action Extraire les modèles d'email depuis la clé `modeles_email` de la réponse
 * @checkpoint modeles-extracted, modèles disponibles pour la séquence
 */

/**
 * @action Extraire les règles d'attribution depuis la clé `regles_attribution` de la réponse
 * @checkpoint regles-extracted, configuration de la séquence disponible
 */

/**
 * @action Récupérer les liens de paiement actifs via GET /api/liens-paiement?statut=actif
 * @checkpoint liens-fetched, liens de paiement actifs reçus
 */

/**
 * @action Stocker toutes les données dans le store page
 * @checkpoint data-stored, sequence complète avec étapes et modèles
 */

/**
 * @action Afficher le contenu avec l'onglet 'Étapes' actif par défaut
 * @checkpoint content-rendered, timeline des étapes visible
 */
```

## Mockups de référence

- `specs/mockups/sequences-relance-detail.html`
