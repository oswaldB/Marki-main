# Workflow : Mettre à jour utilisateur (PouchDB)

## Écran
`settings-utilisateurs.html`

## Élément déclencheur
Bouton avec `@click="updateUser()"`

## Action
Sauvegarder les modifications dans PouchDB

## Description
- Persiste les changements dans PouchDB
- Met à jour l'utilisateur
- Synchronise avec CouchDB
- Ferme le modal

## Data Model
**Page Function:** `settingsUtilisateursPage()`

**Stores Alpine.js:**
- $store.ui
- $store.auth

**Données (depuis PouchDB):**
- `utilisateurs` - utilisateurs depuis PouchDB
- `userForm` - données du formulaire
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
- `saving` modifié
- `error` ← message si échec
- `utilisateurs` mis à jour
- `showUserModal` ← false

## PouchDB Operations

**Action:** Mettre à jour un utilisateur dans PouchDB.

**Méthodes utilisées:**
1. `db.get('user:' + id)` - Récupérer le document avec sa révision
2. Mettre à jour les champs modifiés
3. `db.put(doc)` - Sauvegarder le document modifié

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
            └── update-user.js
```

### Fichier principal
- **HTML** : `frontend/app/settings-utilisateurs/index.html`
- **Point d'entrée** : Initialise la page Alpine.js avec PouchDB

### Fichier workflow
- **JS** : `frontend/app/settings-utilisateurs/js/update-user.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/settings-utilisateurs/js/update-user.js
export async function updateUser() {
  // Implementation avec PouchDB
}
```

## Implementation (PouchDB)

```javascript
async updateUser() {
  // 1. Validate form
  if (!this.validateForm()) {
    return;
  }
  
  // 2. Set saving state
  this.loading = true;
  this.error = null;
  
  try {
    // 3. Récupérer le document depuis PouchDB avec sa révision
    const doc = await db.get(this.editingUser._id);
    
    // 4. Mettre à jour les champs
    doc.nom = this.userForm.nom;
    doc.email = this.userForm.email;
    doc.role = this.userForm.role;
    doc.actif = this.userForm.actif;
    doc.updated_at = new Date().toISOString();
    
    // 5. Sauvegarder dans PouchDB
    const response = await db.put(doc);
    // response: { ok: true, id: 'user:...', rev: '2-xxx...' }
    
    // 6. Update local data
    const index = this.utilisateurs.findIndex(u => u._id === doc._id);
    if (index >= 0) {
      this.utilisateurs[index] = { ...doc, _rev: response.rev };
    }
    
    // 7. Close modal
    this.showUserModal = false;
    this.editingUser = null;
    this.resetUserForm();
    
    // 8. Notify
    this.toast('Utilisateur mis à jour', 'success');
    
  } catch (error) {
    if (error.status === 409) {
      this.error = 'Conflit de version, veuillez réessayer';
      this.toast('Conflit de version', 'error');
    } else {
      this.error = error.message;
      this.toast(error.message, 'error');
    }
  } finally {
    this.loading = false;
  }
}
```

## Notes

- **Sauvegarde immédiate** : Les modifications sont persistées dans PouchDB
- **Synchronisation** : Les changements sont synchronisés avec CouchDB
- **Gestion des conflits** : Détection `_rev` côté client

---

## Migration depuis l'ancienne API

| Aspect | Avant (API) | Après (PouchDB) |
|--------|-------------|-----------------|
| Requête | `PUT /api/users/:id` | `db.get()` puis `db.put()` |
| Payload | `{ nom, email, role, actif }` | Modification directe du doc |
| Réponse | `ApiResponse<User>` | `{ ok, id, rev }` |
| Gestion conflits | Backend | Détection `_rev` côté client |
| Latence | ~200-500ms | ~10-50ms (local) |
| Offline | ❌ Impossible | ✅ Fonctionne offline, sync reportée |
