# Workflow : Ouvrir ajout utilisateur (PouchDB)

## Écran
`settings-utilisateurs.html`

## Élément déclencheur
Bouton avec `@click="openAddUser()"`

## Action
Afficher le formulaire d'ajout

## Description
- Affiche le formulaire vierge
- Prépare la création dans PouchDB
- Réinitialise les données du formulaire

## Data Model
**Page Function:** `settingsUtilisateursPage()`

**Stores Alpine.js:**
- $store.ui
- $store.auth

**Données (pour création PouchDB):**
- `utilisateurs` - utilisateurs depuis PouchDB
- `userForm` - nouveau formulaire utilisateur
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
- `userForm` ← objet vierge initialisé
- `editingUser` ← null (mode création)
- `showUserModal` ← true

## PouchDB Operations

**Aucun** - Action UI uniquement (préparation du formulaire).

**Note** : La création effective se fait via `create-user.md` avec `db.put()`.

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
- **Point d'entrée** : Initialise la page Alpine.js avec PouchDB

### Fichier workflow
- **JS** : `frontend/app/settings-utilisateurs/js/open-add-user.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/settings-utilisateurs/js/open-add-user.js
export function openAddUser() {
  // Implementation avec PouchDB (préparation)
}
```

## Implementation (PouchDB)

```javascript
openAddUser() {
  // 1. Reset form avec valeurs par défaut
  this.userForm = {
    nom: '',
    email: '',
    role: 'user',
    actif: true
  };
  
  // 2. Mode création (pas édition)
  this.editingUser = null;
  
  // 3. Show modal
  this.showUserModal = true;
  
  // 4. Focus first input
  this.$nextTick(() => {
    this.$refs.firstInput?.focus();
  });
}
```

## Notes

- **Préparation** : Ce workflow prépare le formulaire pour la création
- **Mode création** : `editingUser = null` pour différencier de l'édition
- **Sauvegarde** : La création effective se fait via `create-user.md` avec `db.put()`

---

## Migration depuis l'ancienne architecture

| Aspect | Avant | Après (PouchDB) |
|--------|-------|-----------------|
| Action | Côté client uniquement | **Conservé** - Côté client |
| Persistance | Non persistante (préparation) | **Conservé** - Non persistante (préparation) |
| Sauvegarde | `POST /api/users` | `db.put()` (dans create-user.md) |
| Latence | Instantanée | Instantanée |
| Offline | ✅ Oui | ✅ Oui |
