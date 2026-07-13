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
 * @action Récupérer les contacts via GET /api/contacts?include=facturesCount
 * @checkpoint contacts-fetched, liste des contacts avec stats reçue
 */

/**
 * @action Récupérer les statistiques globales via GET /api/contacts/stats
 * @checkpoint stats-fetched, totaux (sansEmail, blacklistes, etc.) reçus
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

## Mockups de référence

- `specs/mockups/contacts.html`
