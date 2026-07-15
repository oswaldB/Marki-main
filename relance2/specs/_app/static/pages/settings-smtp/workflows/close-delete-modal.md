# Workflow : Annuler suppression profil SMTP

## Écran
`settings-smtp.html`

## Élément déclencheur
Bouton avec `@click="cancelDeleteProfil()"`

## Action
Annuler la suppression du profil

## Description
- Ferme le modal de confirmation global
- Réinitialise le profil en cours de suppression

## Data Model
**Page Function:** `settingsSmtpPage()`

**Stores Alpine.js:**
- $store.ui

**Données:**
- `profils`
- `deletingProfil`

**États UI:**
- `loading`
- `error`

## State Changes

**Modifications:**
- `deletingProfil` réinitialisé à null
- Modal confirmation global fermé

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
            └── cancel-delete-profil.js
```

### Fichier principal
- **HTML** : `frontend/app/settings-smtp/index.html`
- **Point d'entrée** : Initialise la page Alpine.js

### Fichier workflow
- **JS** : `frontend/app/settings-smtp/js/cancel-delete-profil.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/settings-smtp/js/cancel-delete-profil.js
export function cancelDeleteProfil() {
  // Implementation du workflow
}
```

## Implementation

```javascript
cancelDeleteProfil() {
  // 1. Fermer modal confirmation global
  Alpine.store('ui').modals.confirmation.show = false;

  // 2. Reset deleting profil
  this.deletingProfil = null;
}
```

## Logs (console.log) - OBLIGATOIRE

Chaque étape du workflow doit être loguée avec `console.log()`:

| Checkpoint | Instruction console.log |
|------------|------------------------|
| `start` | `console.log('[WORKFLOW.settings-smtp-close-delete-modal] START: Annulation suppression du profil SMTP')` |
| `state-changed` | `console.log('[WORKFLOW.settings-smtp-close-delete-modal] STATE: Modal confirmation fermé + deletingProfil = null')` |
| `end` | `console.log('[WORKFLOW.settings-smtp-close-delete-modal] SUCCESS: Annulation effectuée en', duree, 'ms')` |
| `error` | `console.error('[WORKFLOW.settings-smtp-close-delete-modal] ERROR:', error)` |
