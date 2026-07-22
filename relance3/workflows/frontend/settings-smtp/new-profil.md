# Workflow : Nouveau profil SMTP (PouchDB)

## Écran
`settings-smtp.html`

## Élément déclencheur
Bouton avec `@click="newProfil()"`

## Action
Afficher le formulaire de création

## Description
- Affiche le formulaire vierge
- Réinitialise les données du formulaire
- Prépare pour la création dans PouchDB

## Data Model
**Page Function:** `settingsSmtpPage()`

**Stores Alpine.js:**
- $store.ui

**Données (pour création PouchDB):**
- `profils` - profils SMTP depuis PouchDB
- `newProfil` - nouveau profil à créer
- `db` - instance PouchDB

**États UI:**
- `loading`
- `error`
- `showNewProfilForm`
- `testingProfil`
- `isEditing` ← false (mode création)

## State Changes

**Modifications:**
- `showNewProfilForm` ← true
- `newProfil` ← objet vierge initialisé
- `isEditing` ← false

## PouchDB Operations

**Aucun** - Action UI uniquement (préparation du formulaire).

**Note** : La création effective se fait via `create-profil.md` avec `db.put()`.

## Organisation des fichiers

```
frontend/
└── app/
    └── settings-smtp/
        ├── index.html
        ├── components/
        │   └── (composants partagés)
        └── js/
            └── new-profil.js
```

### Fichier principal
- **HTML** : `frontend/app/settings-smtp/index.html`
- **Point d'entrée** : Initialise la page Alpine.js avec PouchDB

### Fichier workflow
- **JS** : `frontend/app/settings-smtp/js/new-profil.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/settings-smtp/js/new-profil.js
export function newProfil() {
  // Implementation avec PouchDB (préparation)
}
```

## Implementation (PouchDB)

```javascript
newProfil() {
  // 1. Reset form avec valeurs par défaut
  this.newProfil = {
    nom: '',
    email: '',
    host: '',
    port: 587,
    secure: true,
    username: '',
    password: '',
    from_email: '',
    from_name: '',
    actif: true
  };
  
  // 2. Mode création (pas édition)
  this.isEditing = false;
  
  // 3. Show form
  this.showNewProfilForm = true;
  
  // 4. Focus first input
  this.$nextTick(() => {
    this.$refs.firstInput?.focus();
  });
}
```

## Notes

- **Préparation** : Ce workflow prépare le formulaire pour la création
- **Mode création** : `isEditing = false` pour différencier de l'édition
- **Sauvegarde** : La création effective se fait via `create-profil.md` avec `db.put()`

---

## Migration depuis l'ancienne architecture

| Aspect | Avant | Après (PouchDB) |
|--------|-------|-----------------|
| Action | Côté client uniquement | **Conservé** - Côté client |
| Persistance | Non persistante (préparation) | **Conservé** - Non persistante (préparation) |
| Sauvegarde | `POST /api/smtp-profiles` | `db.put()` (dans create-profil.md) |
| Latence | Instantanée | Instantanée |
| Offline | ✅ Oui | ✅ Oui |
