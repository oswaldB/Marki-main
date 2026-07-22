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

**Note :** PouchDB n'est pas encore initialisé à ce stade. Il le sera après connexion réussie.

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
 * 
 * **Note** : La validation du token se fait via API (pas de PouchDB pour l'auth)
 */

/**
 * @action Si session valide, initialiser PouchDB avant redirection
 * @checkpoint pouchdb-initialized, bases locales créées et sync configuré
 * 
 * Code:
 * const remoteUrl = 'https://admin:admin@dev.markidiags.com/data/marki';
 * const db = new PouchDB('marki-factures');
 * db.sync(remoteUrl, { 
 *   live: true, 
 *   retry: true,
 *   headers: { 'Authorization': `Bearer ${token}` }
 * });
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

## PouchDB Initialisation (si token valide)

```javascript
async initPouchDBIfAuthenticated(token) {
  const remoteUrl = 'https://admin:admin@dev.markidiags.com/data/marki';
  
  // Créer les bases locales
  const db = new PouchDB('marki-factures');
  const dbContacts = new PouchDB('marki-contacts');
  const dbEvents = new PouchDB('marki-events');
  
  // Configurer le sync avec authentification
  const syncOptions = {
    live: true,
    retry: true,
    headers: {
      'Authorization': `Bearer ${token}`
    }
  };
  
  // Démarrer la sync
  db.sync(remoteUrl, syncOptions);
  dbContacts.sync(remoteUrl, syncOptions);
  dbEvents.sync(remoteUrl, syncOptions);
}
```

## Mockups de référence

- `specs/mockups/login.html`

## API Calls

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/auth/me` | Vérifier la validité du token (si présent dans localStorage) |

---

## Notes sur le flux de login

| Étape | Action | PouchDB ? |
|-------|--------|-----------|
| 1 | Chargement page login | ❌ Non |
| 2 | Vérification token existant | ❌ Non (localStorage uniquement) |
| 3 | Validation token via API | ❌ Non (API backend) |
| 4 | **Initialisation PouchDB** | ✅ **Oui** (si token valide) |
| 5 | Redirection dashboard | ✅ PouchDB prêt |

PouchDB n'est initialisé qu'après validation réussie du token d'authentification.
