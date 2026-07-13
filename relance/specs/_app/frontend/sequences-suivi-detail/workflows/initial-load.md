---
id: sequences-suivi-detail-initial-load
type: frontend
folder: specs/workflows/frontend/sequences-suivi-detail/
description: Charger le détail d'une séquence de suivi avec ses étapes
depends_on: [auth-check]
screen: sequences-suivi-detail
global: false
mockup_entry: specs/mockups/sequences-suivi-detail.html
---

# sequences-suivi-detail-initial-load : Chargement initial Détail Séquence Suivi

## Description

Charger les détails complets d'une séquence de suivi : étapes éducatives, modèles et règles d'envoi.

## Étapes

```javascript
/**
 * @action Extraire l'ID de la séquence depuis l'URL (/sequences/suivi/:id)
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
 * @checkpoint etapes-extracted, étapes de suivi disponibles
 */

/**
 * @action Extraire les modèles d'email depuis la clé `modeles_email` de la réponse
 * @checkpoint modeles-extracted, modèles éducatifs disponibles
 */

/**
 * @action Stocker les données dans le store page
 * @checkpoint data-stored, séquence de suivi complète
 */

/**
 * @action Afficher le contenu avec l'onglet 'Étapes' actif
 * @checkpoint content-rendered, interface de suivi éducatif affichée
 */
```

## Mockups de référence

- `specs/mockups/sequences-suivi-detail.html`
