---
id: relances-detail-initial-load
type: frontend
folder: specs/workflows/frontend/relances-detail/
description: Chargement du détail d'une relance
depends_on: [auth-check]
screen: relances-detail
global: false
---

# relances-detail-initial-load : Chargement initial Détail Relance

## Description

Charger les détails d'une relance spécifique à partir de son ID dans l'URL.

## Étapes

```javascript
/**
 * @action Récupérer l'ID de la relance depuis l'URL (?id=xxx)
 * @checkpoint url-parsed, relanceId extrait
 */

/**
 * @action Afficher le skeleton loader
 * @checkpoint skeleton-shown, état de chargement actif
 */

/**
 * @action Récupérer les détails via GET /api/relances/{id}
 * @checkpoint relance-fetched, données reçues
 * @api GET /api/relances/{id}
 * @response { relance: {...} }
 */

/**
 * @action Stocker la relance dans le store
 * @checkpoint relance-stored, données affichables
 */

/**
 * @action Afficher le détail de la relance
 * @checkpoint detail-rendered, page complète
 */
```

## Gestion des erreurs

- Si relance non trouvée : afficher message "Relance introuvable"
- Si erreur réseau : afficher message d'erreur générique
