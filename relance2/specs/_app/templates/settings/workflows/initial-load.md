---
id: settings-initial-load
type: frontend
folder: specs/workflows/frontend/settings/
description: Chargement initial de la page des paramètres
depends_on: [auth-check]
screen: settings
global: false
---

# settings-initial-load : Chargement initial Paramètres

## Description

Charger les paramètres globaux de l'application et afficher le menu de navigation.

## Étapes

```javascript
/**
 * @action Vérifier l'authentification
 * @checkpoint auth-verified, utilisateur connecté
 */

/**
 * @action Afficher le menu des paramètres
 * @checkpoint menu-rendered, liens disponibles
 */
```

## API Calls

**Pas d'appel API** - Cette page est un menu de navigation uniquement.

Les données sont chargées par les sous-pages :
- `/settings/utilisateurs` charge ses propres données via `/api/users`
- `/settings/smtp` charge ses propres données via `/api/smtp-profiles`
