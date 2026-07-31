# Workflow : Déconnexion portail mission

## Écran
`portail-mission.html`

## Élément déclencheur
Bouton avec `@click="logout()"`

## Action
Déconnecter l'utilisateur

## Description
- Détruit la session
- Redirige vers login

## Data Model
**Page Function:** `portailMissionPage()`

**Données:**
- `mission`
- `documents`
- `paiements`

**États UI:**
- `loading`
- `error`
- `activeTab`

## State Changes

**Modifications:** États UI spécifiques selon implémentation

## API Calls

**Pas d'appel API** - Action côté client uniquement



## Organisation des fichiers

```
frontend/
└── app/
    └── portail-mission/
        ├── index.html
        ├── components/
        │   └── (composants partagés)
        └── js/
            └── logout.js
```

### Fichier principal
- **HTML** : `frontend/app/portail-mission/index.html`
- **Point d'entrée** : Initialise la page Alpine.js

### Fichier workflow
- **JS** : `frontend/app/portail-mission/js/logout.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/portail-mission/js/logout.js
export function logout() {
  // Implementation du workflow
}
```

## Implementation

```javascript
logout() {
  // 1. Clear auth store
  Alpine.store('auth').token = null;
  Alpine.store('auth').user = null;
  Alpine.store('auth').isAuthenticated = false;
  
  // 2. Clear localStorage
  localStorage.removeItem('marki:auth:token');
  
  // 3. Redirect
  window.location.href = '/login';
}
```