# Workflow : Créer utilisateur (PouchDB)

## Écran
`settings-utilisateurs.html`

## Élément déclencheur
Bouton avec `@click="createUser()"`

## Action
Valider la création dans PouchDB

## Description
- Valide les champs
- Crée l'utilisateur dans PouchDB
- Synchronise avec CouchDB
- Ferme le modal

## Data Model
**Page Function:** `settingsUtilisateursPage()`

**Stores Alpine.js:**
- $store.ui
- $store.auth

**Données (depuis PouchDB):**
- `utilisateurs` - utilisateurs depuis PouchDB
- `roles` - rôles disponibles
- `userForm` - données du formulaire
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
- `showUserModal` passe à false
- `utilisateurs` mis à jour avec le nouvel utilisateur
- `error` ← message si échec

## PouchDB Operations

**Action:** Créer un utilisateur dans PouchDB.

**Méthodes utilisées:**
1. Générer un ID unique
2. `db.put({ _id: 'user:' + uuid, ... })` - Créer le document

**Sync:** La modification est automatiquement synchronisée avec CouchDB.

## Organisation des fichiers

```
frontend/
└── app/
    └── settings-utilisateurs/
        ├── index.html
        ├── components/
        │   └── (composants partagés)
        └── js/
            └── create-user.js
```

### Fichier principal
- **HTML** : `frontend/app/settings-utilisateurs/index.html`
- **Point d'entrée** : Initialise la page Alpine.js avec PouchDB

### Fichier workflow
- **JS** : `frontend/app/settings-utilisateurs/js/create-user.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/settings-utilisateurs/js/create-user.js
export async function createUser() {
  // Implementation avec PouchDB
}
```

## Implementation (PouchDB)

```javascript
async createUser() {
  // 1. Validate form
  if (!this.validateForm()) {
    return;
  }
  
  // 2. Set loading state
  this.loading = true;
  this.error = null;
  
  try {
    // 3. Générer ID unique
    const id = 'user:' + Date.now();
    
    // 4. Créer le document dans PouchDB
    const newDoc = {
      _id: id,
      type: 'user',
      nom: this.userForm.nom,
      email: this.userForm.email,
      role: this.userForm.role,
      actif: this.userForm.actif ?? true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const response = await db.put(newDoc);
    // response: { ok: true, id: 'user:...', rev: '1-xxx...' }
    
    // 5. Update local data
    this.utilisateurs.unshift({ ...newDoc, _rev: response.rev });
    
    // 6. Close modal
    this.showUserModal = false;
    this.resetUserForm();
    
    // 7. Notify success
    this.toast('Utilisateur créé', 'success');
    
  } catch (error) {
    this.error = error.message;
    this.toast(error.message, 'error');
  } finally {
    this.loading = false;
  }
}
```

## Notes

- **ID unique** : Génération client-side avec `Date.now()` ou UUID
- **Synchronisation** : Les changements sont synchronisés avec CouchDB
- **Type** : `type: 'user'` pour filtrage

---

## Migration depuis l'ancienne API

| Aspect | Avant (API) | Après (PouchDB) |
|--------|-------------|-----------------|
| Requête | `POST /api/users` | `db.put({ _id: 'user:' + uuid, ... })` |
| Payload | `{ nom, email, role, actif }` | Document PouchDB avec `_id` et `type` |
| Réponse | `ApiResponse<User>` | `{ ok, id, rev }` |
| Latence | ~200-500ms | ~10-50ms (local) |
| Offline | ❌ Impossible | ✅ Fonctionne offline |
