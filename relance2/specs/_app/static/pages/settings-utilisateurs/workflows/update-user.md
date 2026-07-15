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

## Logs (console.log) - OBLIGATOIRE

Chaque étape du workflow doit être loguée avec `console.log()`:

| Checkpoint | Instruction console.log |
|------------|------------------------|
| `start` | `console.log('[WORKFLOW.settings-utilisateurs-update-user] START: Mise à jour utilisateur ID =', userId)` |
| `validation` | `console.log('[WORKFLOW.settings-utilisateurs-update-user] STEP: Validation du formulaire userForm', {userForm})` |
| `validation-failed` | `console.warn('[WORKFLOW.settings-utilisateurs-update-user] WARN: Validation échouée, abandon de la requête')` |
| `api-call` | `console.log('[WORKFLOW.settings-utilisateurs-update-user] API: PUT /api/users/:id avec payload', {id: userId, ...userForm})` |
| `response-received` | `console.log('[WORKFLOW.settings-utilisateurs-update-user] API: Réponse reçue', response)` |
| `state-updated` | `console.log('[WORKFLOW.settings-utilisateurs-update-user] STEP: utilisateurs[] mis à jour, saving=false, showUserModal=false, editingUser=null')` |
| `end` | `console.log('[WORKFLOW.settings-utilisateurs-update-user] SUCCESS: Utilisateur mis à jour en', duree, 'ms')` |
| `error` | `console.error('[WORKFLOW.settings-utilisateurs-update-user] ERROR:', error)` |