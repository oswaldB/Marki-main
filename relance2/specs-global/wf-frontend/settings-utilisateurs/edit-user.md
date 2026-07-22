# Workflow : Éditer utilisateur

## Écran
`settings-utilisateurs.html`

## Élément déclencheur
Bouton avec `@click="editUser(user)"`

## Action
Ouvrir l'édition d'un utilisateur

## Description
- Charge les données dans userForm
- Ouvre le modal d'édition

## Data Model
**Page Function:** `settingsUtilisateursPage()`

**Stores Alpine.js:**
- $store.ui
- $store.auth

**Données:**
- `utilisateurs`
- `roles`
- `searchQuery`
- `filterRole`
- `userForm`

**États UI:**
- `loading`
- `error`
- `showUserModal`
- `showDeleteModal`
- `showPermissionsModal`
- `editingUser`
- `deletingUser`

## State Changes

**Modifications:**
- `userForm` ← copie de l'utilisateur
- `editingUser` ← utilisateur en cours d'édition
- `showUserModal` passe à true

## API Calls

**Pas d'appel API** - Action côté client uniquement

## Organisation des fichiers

```
frontend/
└── app/
    └── settings-utilisateurs/
        ├── index.html
        ├── components/
        │   └── (composants partagés)
        └── js/
            └── edit-user.js
```

### Fichier principal
- **HTML** : `frontend/app/settings-utilisateurs/index.html`
- **Point d'entrée** : Initialise la page Alpine.js

### Fichier workflow
- **JS** : `frontend/app/settings-utilisateurs/js/edit-user.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/settings-utilisateurs/js/edit-user.js
export function editUser() {
  // Implementation du workflow
}
```

## Implementation

```javascript
editUser(user) {
  // 1. Clone item to form
  this.userForm = { ...user };
  
  // 2. Store editing user
  this.editingUser = user;
  
  // 3. Show user modal (même modal pour création/édition)
  this.showUserModal = true;
}
```
