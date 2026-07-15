---
id: login-initial-load
type: frontend
folder: specs/workflows/frontend/login/
description: Charger la page de login et vérifier l'état d'authentification existant
depends_on: []
screen: login
global: false
mockup_entry: specs/mockups/login.html
---

# login-initial-load : Chargement initial Login

## Description

Initialiser la page de login, vérifier si une session existe déjà (token localStorage) et rediriger si nécessaire.

## Étapes

```javascript
/**
 * @action Initialiser le DOM de la page login
 * @checkpoint dom-ready, body avec x-data="loginPage()" présent
 */

/**
 * @action Vérifier la présence d'un token dans localStorage
 * @checkpoint token-checked, token présent ou absent déterminé
 */

/**
 * @action Si token présent, valider via GET /api/auth/me (token dans header Authorization: Bearer)
 * @checkpoint session-verified, réponse API reçue
 * 
 * **Backend** : Utilise `AuthLocal.verifyToken(token)` pour valider le JWT
 */

/**
 * @action Si session valide, rediriger vers /dashboard
 * @checkpoint redirect-executed, navigation vers dashboard
 */

/**
 * @action Afficher le formulaire de login prêt à l'emploi
 * @checkpoint form-ready, champs username/password focusables
 */
```

## Mockups de référence

- `specs/mockups/login.html`

## API Calls

| Méthode | Endpoint | Description |
|---------|----------|-------------|

## Logs (console.log) - OBLIGATOIRE

Chaque étape du workflow doit être loguée avec `console.log()`:

| Checkpoint | Instruction console.log |
|------------|------------------------|
| `start` | `console.log('[WORKFLOW.login-initial-load] START: Initialisation de la page login')` |
| `dom-ready` | `console.log('[WORKFLOW.login-initial-load] STEP: DOM ready, body avec x-data="loginPage()" détecté')` |
| `form-initialized` | `console.log('[WORKFLOW.login-initial-load] STEP: Formulaire de login initialisé, champs focusables')` |
| `csrf-loaded` | `console.log('[WORKFLOW.login-initial-load] STEP: Token CSRF chargé depuis meta tag')` |
| `redirect-check` | `console.log('[WORKFLOW.login-initial-load] STEP: Vérification token existant dans localStorage')` |
| `end` | `console.log('[WORKFLOW.login-initial-load] SUCCESS: Page login prête, redirection si session valide')` |
| `error` | `console.error('[WORKFLOW.login-initial-load] ERROR:', error)` |
