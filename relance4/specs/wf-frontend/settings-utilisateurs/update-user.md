# Workflow : Mettre à jour utilisateur

## Écran
`settings-utilisateurs.html`

## Élément déclencheur
Bouton avec `@click="updateUser()"`

## Action
Sauvegarder les modifications

## Description
- Persiste les changements
- Met à jour l'utilisateur
- Ferme le modal

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
- `saving` modifié
- `error` ← message si échec

## API Calls

**Endpoint:** `PUT /api/users/:id`

**Payload:** selon contexte

**Response:** `ApiResponse<T>`



## Organisation des fichiers

```
frontend/
└── app/
    └── settings-utilisateurs/
        ├── index.html
        ├── components/
        │   └── (composants partagés)
        └── js/
            └── update-user.js
```

### Fichier principal
- **HTML** : `frontend/app/settings-utilisateurs/index.html`
- **Point d'entrée** : Initialise la page Alpine.js

### Fichier workflow
- **JS** : `frontend/app/settings-utilisateurs/js/update-user.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/settings-utilisateurs/js/update-user.js
export function updateUser() {
  // Implementation du workflow
}
```

## Implementation

```javascript
async updateUtilisateur() {
  // Same as save
  await this.saveUtilisateur();
}
```