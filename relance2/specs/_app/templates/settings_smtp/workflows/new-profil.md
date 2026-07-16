# Workflow : Nouveau profil SMTP

## Écran
`settings-smtp.html`

## Élément déclencheur
Bouton avec `@click="showNewProfilForm = true"`

## Action
Afficher le formulaire de création

## Description
- Affiche le formulaire vierge
- Permet de configurer un nouveau serveur SMTP

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
- `showNewProfilForm` passe à true
- `newProfil` réinitialisé

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
            └── new-profil.js
```

### Fichier principal
- **HTML** : `frontend/app/settings-smtp/index.html`
- **Point d'entrée** : Initialise la page Alpine.js

### Fichier workflow
- **JS** : `frontend/app/settings-smtp/js/new-profil.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/settings-smtp/js/new-profil.js
export function newProfil() {
  // Implementation du workflow
}
```

## Implementation

```javascript
newProfil() {
  // 1. Reset form
  this.newProfil = {
    nom: '',
    email: '',
    serveur: '',
    port: 587,
    securite: 'tls',
    username: '',
    password: '',
    actif: true
  };
  
  // 2. Show form
  this.showNewProfilForm = true;
  
  // 3. Focus first input
  this.$nextTick(() => {
    this.$refs.firstInput?.focus();
  });
}
```
