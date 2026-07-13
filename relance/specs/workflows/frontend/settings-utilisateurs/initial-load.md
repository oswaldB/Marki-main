---
id: settings-utilisateurs-initial-load
type: frontend
folder: specs/workflows/frontend/settings-utilisateurs/
description: Charger la liste des utilisateurs avec leurs rôles
depends_on: [auth-check]
screen: settings-utilisateurs
global: false
mockup_entry: specs/mockups/settings-utilisateurs.html
---

# settings-utilisateurs-initial-load : Chargement initial Gestion Utilisateurs

## Description

Charger la liste des utilisateurs avec leurs rôles, statut et dernière connexion.

## Étapes

```javascript
/**
 * @action Initialiser les filtres par défaut
 * @checkpoint state-initialized, filtres rôle et recherche prêts
 */

/**
 * @action Afficher le spinner de chargement
 * @checkpoint loading-shown, tableau en chargement
 */

/**
 * @action Récupérer les utilisateurs via GET /api/users
 * @checkpoint users-fetched, liste des utilisateurs reçue
 */

/**
 * @action Les rôles sont définis dans l'enum UserRole du data model (admin, user, client)
 * @checkpoint roles-defined, valeurs enum disponibles côté client
 * 
 * **Note** : Pas de table `roles` séparée. Les rôles sont dans le champ `role` de `users`.
 * Valeurs possibles : `admin`, `user`, `client`.
 */

/**
 * @action Stocker les données dans Alpine.store('users')
 * @checkpoint data-stored, utilisateurs et rôles disponibles
 */

/**
 * @action Rendre le tableau avec colonnes rôle et statut
 * @checkpoint table-rendered, utilisateurs avec badges actif/inactif visibles
 */

/**
 * @action Activer les boutons d'action (éditer, désactiver, supprimer)
 * @checkpoint actions-enabled, contrôles d'administration fonctionnels
 */
```

## Mockups de référence

- `specs/mockups/settings-utilisateurs.html`
