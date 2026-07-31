# Workflow : Éditer profil SMTP

## Écran
`settings-smtp.html`

## Élément déclencheur
Bouton avec `@click="editProfil(profil)"`

## Action
Ouvrir l'édition du profil

## Description
- Charge le profil dans le formulaire
- Permet de modifier les paramètres

## Data Model
**Page Function:** `settingsSmtpPage()`

**Stores Alpine.js:**
- $store.ui

**Données:**
- `profils`
- `newProfil`
- `testingProfil`
- `testResult`

**États UI:**
- `loading`
- `error`
- `showNewProfilForm`
- `testingProfil`

## State Changes

**Modifications:**
- `newProfil` ← copie du profil à éditer
- `showNewProfilForm` passe à true

## API Calls

**Pas d'appel API** - Action côté client uniquement

## Organisation des fichiers

```
frontend/
└── app/
    └── settings-smtp/
        ├── index.html
        ├── components/
        │   └── (composants partagés)
        └── js/
            └── edit-profil.js
```

### Fichier principal
- **HTML** : `frontend/app/settings-smtp/index.html`
- **Point d'entrée** : Initialise la page Alpine.js

### Fichier workflow
- **JS** : `frontend/app/settings-smtp/js/edit-profil.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/settings-smtp/js/edit-profil.js
export function editProfil() {
  // Implementation du workflow
}
```

## Implementation

```javascript
editProfil(profil) {
  // 1. Clone item to form
  this.newProfil = { ...profil };
  
  // 2. Show form (même modal que création)
  this.showNewProfilForm = true;
}
```
