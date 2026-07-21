# Workflow : Afficher/Masquer mot de passe

## Écran
`settings-smtp-detail.html`

## Élément déclencheur
Bouton avec `@click="showPassword = !showPassword"`

## Action
Basculer la visibilité du mot de passe

## Description
- Affiche en clair ou masqué
- Icône œil

## Data Model
**Page Function:** `settingsSmtpDetailPage()`

**Stores Alpine.js:**
- $store.ui

**Données:**
- `profil`
- `historique`
- `stats`
- `activeTab`
- `editedProfil`

**États UI:**
- `loading`
- `error`
- `saving`
- `editMode`

## State Changes

**Modifications:** États UI spécifiques selon implémentation

## API Calls

**Pas d'appel API** - Action côté client uniquement



## Organisation des fichiers

```
frontend/
└── app/
    └── settings-smtp-detail/
        ├── index.html
        ├── components/
        │   └── (composants partagés)
        └── js/
            └── toggle-password.js
```

### Fichier principal
- **HTML** : `frontend/app/settings-smtp-detail/index.html`
- **Point d'entrée** : Initialise la page Alpine.js

### Fichier workflow
- **JS** : `frontend/app/settings-smtp-detail/js/toggle-password.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/settings-smtp-detail/js/toggle-password.js
export function togglePassword() {
  // Implementation du workflow
}
```

## Implementation

```javascript
toggleItem() {
  // 1. Toggle boolean state
  this.showModal = !this.showModal;
  // OR
  this.isExpanded = !this.isExpanded;
  
  // 2. If opening, prepare data
  if (this.showModal) {
    this.prepareModalData();
  }
}
``