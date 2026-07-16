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
 * @action Charger les paramètres globaux via GET /api/settings
 * @checkpoint settings-fetched, données reçues
 * @api GET /api/settings
 * @response { settings: {...} }
 */

/**
 * @action Afficher le menu des paramètres
 * @checkpoint menu-rendered, liens disponibles
 */
```

## Navigation disponible

- Utilisateurs → /settings/utilisateurs
- Profils SMTP → /settings/smtp
- Autres paramètres...
