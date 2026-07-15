# Workflow : Ouvrir ajout utilisateur
## Écran
`settings-utilisateurs.html`

## Élément déclencheur
Bouton avec `@click="openAddUser()"`

## Action
Afficher le formulaire d'ajout

## Description
- Affiche le formulaire vierge
- Prépare la création

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

**Modifications:** États UI spécifiques selon implémentation

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
            └── open-add-user.js
```

### Fichier principal
- **HTML** : `frontend/app/settings-utilisateurs/index.html`
- **Point d'entrée** : Initialise la page Alpine.js

### Fichier workflow
- **JS** : `frontend/app/settings-utilisateurs/js/open-add-user.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/settings-utilisateurs/js/open-add-user.js
export function openAddUser() {
  // Implementation du workflow
}
```

## Implementation

```javascript
openModal(item) {
  // 1. Set selected item
  this.selectedItem = item;
  
  // 2. Show modal
  this.showModal = true;
  
  // 3. Load additional data if needed
  if (item?.id) {
    this.loadDetail(item.id);
  }
}
```

## Logs (console.log) - OBLIGATOIRE

Chaque étape du workflow doit être loguée avec `console.log()`:

| Checkpoint | Instruction console.log |
|------------|------------------------|
| `start` | `console.log('[WORKFLOW.settings-utilisateurs-open-add-user] START: Ouverture du modal d\'ajout utilisateur')` |
| `modal-shown` | `console.log('[WORKFLOW.settings-utilisateurs-open-add-user] STEP: showUserModal = true')` |
| `form-initialized` | `console.log('[WORKFLOW.settings-utilisateurs-open-add-user] STEP: userForm réinitialisé (champs vides)')` |
| `state-applied` | `console.log('[WORKFLOW.settings-utilisateurs-open-add-user] DATA: État après ouverture:', {showUserModal, userForm, editingUser})` |
| `end` | `console.log('[WORKFLOW.settings-utilisateurs-open-add-user] SUCCESS: Modal ouvert en', duree, 'ms')` |
| `error` | `console.error('[WORKFLOW.settings-utilisateurs-open-add-user] ERROR:', error)` |
