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
 * @action Récupérer les étapes via GET /api/sequences/:id/etapes
 * @checkpoint etapes-fetched, liste ordonnée des étapes reçue
 */

/**
 * @action Récupérer les modèles d'email via GET /api/templates?type=relance
 * @checkpoint modeles-fetched, modèles disponibles pour la séquence
 */

/**
 * @action Les règles d'attribution sont incluses dans la réponse de GET /api/sequences/:id
 * @checkpoint regles-fetched, configuration de la séquence reçue
 * 
 * **Note** : Pas d'endpoint séparé `/regles`. Les règles sont stockées dans le champ
 * `regles_attribution` (ou similaire) de la séquence elle-même.
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
