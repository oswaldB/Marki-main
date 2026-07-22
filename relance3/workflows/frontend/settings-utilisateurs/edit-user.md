# Workflow : Éditer utilisateur (PouchDB)

## Écran
`settings-utilisateurs.html`

## Élément déclencheur
Bouton avec `@click="editUser(user)"`

## Action
Ouvrir l'édition d'un utilisateur

## Description
- Récupère l'utilisateur depuis PouchDB pour la dernière révision
- Charge les données dans userForm
- Ouvre le modal d'édition

## Data Model
**Page Function:** `settingsUtilisateursPage()`

**Stores Alpine.js:**
- $store.ui
- $store.auth

**Données (depuis PouchDB):**
- `utilisateurs` - utilisateurs depuis PouchDB
- `userForm` - copie de l'utilisateur à éditer
- `editingUser` - utilisateur en cours d'édition
- `db` - instance PouchDB

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

## PouchDB Operations

**Lecture** - Récupérer le document depuis PouchDB pour avoir la dernière révision.

**Note** : La sauvegarde se fait via `update-user.md` avec `db.put()`.

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
- **Point d'entrée** : Initialise la page Alpine.js avec PouchDB

### Fichier workflow
- **JS** : `frontend/app/settings-utilisateurs/js/edit-user.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/settings-utilisateurs/js/edit-user.js
export async function editUser(user) {
  // Implementation avec PouchDB
}
```

## Implementation (PouchDB)

```javascript
async editUser(user) {
  try {
    // 1. Récupérer le document depuis PouchDB pour avoir la dernière révision
    const doc = await db.get(user._id);
    
    // 2. Clone item to form avec toutes les données
    this.userForm = { ...doc };
    
    // 3. Store editing user
    this.editingUser = doc;
    
    // 4. Show user modal (même modal pour création/édition)
    this.showUserModal = true;
    
  } catch (error) {
    this.toast('Erreur lors du chargement de l\'utilisateur', 'error');
  }
}
```

## Notes

- **Récupération PouchDB** : On récupère le document pour avoir la dernière révision (`_rev`)
- **Sauvegarde** : La sauvegarde se fait via `update-user.md` avec `db.put()`

---

## Migration depuis l'ancienne architecture

| Aspect | Avant | Après (PouchDB) |
|--------|-------|-----------------|
| Chargement | Côté client (copie) | `db.get()` pour récupérer dernière révision |
| Persistance | Non persistante (préparation) | **Conservé** - Non persistante (préparation) |
| Sauvegarde | `PUT /api/users/:id` | `db.put()` (dans update-user.md) |
| Latence | Instantanée | ~10-50ms (lecture PouchDB) |
| Offline | ❌ Impossible | ✅ Fonctionne offline |
