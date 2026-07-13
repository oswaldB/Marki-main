---
id: impayes-detail-initial-load
type: frontend
folder: specs/workflows/frontend/impayes-detail/
description: Charger le détail complet d'un impayé avec historique des relances
depends_on: [auth-check]
screen: impayes-detail
global: false
mockup_entry: specs/mockups/impayes-detail.html
---

# impayes-detail-initial-load : Chargement initial Détail Impayé

## Description

Charger les informations complètes d'un impayé, son historique de relances et les contacts associés.

## Étapes

```javascript
/**
 * @action Extraire l'ID de l'impayé depuis l'URL (/impayes-detail?id=:id)
 * @checkpoint impaye-id-extracted, paramètre d'URL récupéré
 */

/**
 * @action Afficher le spinner de chargement
 * @checkpoint loading-shown, overlay sur toute la page
 */

/**
 * @action Récupérer l'impayé via GET /api/impayes/:id
 * @checkpoint impaye-fetched, données complètes reçues (table 'impayes')
 */

/**
 * @action Récupérer le payeur via GET /api/contacts/:payer_id si payer_id existe
 * @checkpoint payer-fetched, informations du payeur complétées
 */

/**
 * @action Récupérer les relances via GET /api/relances?impaye_ids=:id
 * @checkpoint relances-fetched, relances liées à l'impayé reçues (table 'relances')
 */

/**
 * @action Stocker toutes les données dans le store page
 * @checkpoint data-stored, store.impaye et collections associées remplies
 */

/**
 * @action Afficher le contenu complet avec l'onglet 'Détails' actif
 * @checkpoint content-rendered, page complète sans spinner
 */
```

## API Calls

| Endpoint | Table | Description |
|----------|-------|-------------|
| `GET /api/impayes/:id` | `impayes` | Détail de l'impayé |
| `GET /api/contacts/:id` | `contacts` | Infos du payeur (si nécessaire) |
| `GET /api/relances?impaye_ids=:id` | `relances` | Relances liées |

## Notes

- L'impayé contient déjà les champs dénormalisés du payeur (`payeur_nom`, `payeur_email`, etc.)
- L'appel au contact n'est nécessaire que si on veut des informations complémentaires
- Les relances sont filtrées par `impaye_ids` (tableau contenant l'ID)

## Mockups de référence

- `specs/mockups/impayes-detail.html`
