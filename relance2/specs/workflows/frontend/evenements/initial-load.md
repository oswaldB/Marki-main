---
id: evenements-initial-load
type: frontend
folder: specs/workflows/frontend/evenements/
description: Charger l'historique des événements depuis la table events avec filtres
depends_on: [auth-check]
screen: evenements
global: false
mockup_entry: specs/mockups/evenements.html
---

# evenements-initial-load : Chargement initial Journal d'Événements

## Description

Charger l'historique des événements système depuis la table `events` (synchronisations, relances, paiements, alertes, imports) avec filtres et pagination.

## Étapes

```javascript
/**
 * @action Initialiser les filtres par défaut (type='', read='')
 * @checkpoint state-initialized, filtres et pagination prêts
 */

/**
 * @action Afficher le spinner de chargement
 * @checkpoint loading-shown, liste en chargement
 */

/**
 * @action Récupérer les événements via GET /api/events?limit=50
 * @checkpoint evenements-fetched, events reçus depuis la table events
 */

/**
 * @action Récupérer les types d'événements disponibles via GET /api/events/types
 * @checkpoint types-fetched, options de filtrage par type reçues
 */

/**
 * @action Stocker les données dans Alpine.store('evenements')
 * @checkpoint data-stored, événements et types disponibles
 */

/**
 * @action Rendre la liste avec icônes par type et indicateur non lu
 * @checkpoint list-rendered, events colorés par type avec badge "Nouveau" si read=false
 */

/**
 * @action Activer le bouton "Charger plus" pour pagination
 * @checkpoint load-more-enabled, bouton de pagination fonctionnel (skip=50, etc.)
 */
```

## API Calls

| Endpoint | Description |
|----------|-------------|
| `GET /api/events?limit=50&skip=0` | Récupérer les events depuis la table events |
| `GET /api/events?type=sync&limit=50` | Filtrer par type |
| `GET /api/events?read=false&limit=50` | Filtrer par statut non lu |
| `GET /api/events/types` | Types disponibles pour le filtre |

## Structure des données (table events)

```javascript
{
  id: string,
  user_id: string,           // Propriétaire de l'event
  type: 'sync' | 'payment' | 'relance' | 'alert' | 'import',
  title: string,
  description: string,
  icon: string,              // FontAwesome class
  metadata: {                  // Contexte additionnel
    facture_id?: string,
    contact_id?: string,
    montant?: number,
    count?: number
  },
  created_at: string,        // ISO 8601
  read: boolean              // false = non lu, true = lu
}
```

## Mockups de référence

- `specs/mockups/evenements.html`
