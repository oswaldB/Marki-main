---
id: contacts-initial-load
type: frontend
folder: specs/workflows/frontend/contacts/
description: Charger la liste complète des contacts avec stats et filtres
depends_on: [auth-check]
screen: contacts
global: false
mockup_entry: specs/mockups/contacts.html
---

# contacts-initial-load : Chargement initial Liste Contacts

## Description

Charger la liste complète des contacts avec leurs informations, statistiques et états (blacklist, sans email).

## Étapes

```javascript
/**
 * @action Initialiser les filtres par défaut (type='all')
 * @checkpoint state-initialized, filtres et pagination prêts
 */

/**
 * @action Afficher le skeleton loader
 * @checkpoint skeleton-shown, tableau en chargement
 */

/**
 * @action Récupérer les contacts via GET /api/contacts?statut=actif&limit=50
 * @checkpoint contacts-fetched, liste des contacts reçue
 * @api GET /api/contacts?statut=actif&limit=50
 * @response { contacts: [...], total: 1250, limit: 50, offset: 0 }
 */

/**
 * @action Récupérer les statistiques globales via GET /api/dashboard/stats
 * @checkpoint stats-fetched, totaux reçus
 * @api GET /api/dashboard/stats
 * @response { stats: { total_impayes, contacts_blacklistes, ... } }
 */

/**
 * @action Stocker les données dans Alpine.store('contacts')
 * @checkpoint data-stored, contacts et stats disponibles
 */

/**
 * @action Rendre le tableau avec colonnes triables
 * @checkpoint table-rendered, contacts affichés avec badges statut
 */

/**
 * @action Activer les boutons d'action (édition, blacklist, export)
 * @checkpoint actions-enabled, contrôles fonctionnels
 */
```

## API Calls

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/contacts?statut=actif&is_blacklisted=0&limit=50&offset=0` | Liste des contacts actifs |
| GET | `/api/dashboard/stats` | Statistiques globales |

## Paramètres de requête

| Paramètre | Type | Défaut | Description |
|-----------|------|--------|-------------|
| `statut` | string | - | Filtrer par statut (`actif`, `inactif`) |
| `is_blacklisted` | integer | - | Filtrer blacklist (0 ou 1) |
| `type_personne` | string | - | Filtrer par type (`P`, `M`) |
| `limit` | integer | 50 | Nombre de résultats par page |
| `offset` | integer | 0 | Décalage pour pagination |

## Mockups de référence

- `specs/mockups/contacts.html`
