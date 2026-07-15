# Workflow : Supprimer profil SMTP (affichage confirmation)

## Écran
`settings-smtp.html`

## Élément déclencheur
Bouton avec `@click="confirmDeleteProfil(profil)"`

## Action
Afficher la modale de confirmation de suppression

## Description
- Stocke le profil à supprimer
- Affiche la modale de confirmation
- Le workflow `confirm-delete.md` s'occupe de la suppression effective

## Data Model
**Page Function:** `settingsSmtpPage()`

**Stores Alpine.js:**
- $store.ui

**Données:**
- `deletingProfil` (profil en cours de suppression)

**États UI:**
- `showDeleteModal` ou modal global via $store.ui

## State Changes

**Modifications:**
- `deletingProfil` ← profil à supprimer

## API Calls

**Pas d'appel API** - Affichage de la modale uniquement.

> **Note** : La suppression effective est gérée par `confirm-delete.md`.

## Organisation des fichiers

```
frontend/
└── app/
    └── settings-smtp/
        ├── index.html
        ├── components/
        │   └── (composants partagés)
        └── js/
            └── delete-profil.js
```

### Fichier principal
- **HTML** : `frontend/app/settings-smtp/index.html`
- **Point d'entrée** : Initialise la page Alpine.js

### Fichier workflow
- **JS** : `frontend/app/settings-smtp/js/delete-profil.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/settings-smtp/js/delete-profil.js
export function confirmDeleteProfil() {
  // Implementation du workflow
}
```

## Implementation

```javascript
confirmDeleteProfil(profil) {
  // 1. Stocker le profil à supprimer
  this.deletingProfil = profil;
  
  // 2. Afficher modal confirmation global
  Alpine.store('ui').modals.confirmation = {
    show: true,
    title: 'Supprimer le profil SMTP',
    message: `Confirmer la suppression de "${profil.nom}" ?`,
    onConfirm: () => this.deleteProfil() // Appelle le workflow confirm-delete.md
  };
}
```

## Notes

- Ce workflow ne fait que préparer et afficher la modale
- Le bouton "Confirmer" dans la modale déclenche `confirm-delete.md`

## Logs (console.log) - OBLIGATOIRE

Chaque étape du workflow doit être loguée avec `console.log()`:

| Checkpoint | Instruction console.log |
|------------|------------------------|
| `start` | `console.log('[WORKFLOW.settings-smtp-delete-profil] START: Préparation suppression du profil SMTP', { profilId, profilName })` |
| `validation` | `console.log('[WORKFLOW.settings-smtp-delete-profil] STEP: Validation du profil (défini, nom présent)')` |
| `api-call` | `console.log('[WORKFLOW.settings-smtp-delete-profil] STEP: Pas d\'appel API - affichage modale uniquement (suppression déléguée à confirm-delete.md)')` |
| `state-updated` | `console.log('[WORKFLOW.settings-smtp-delete-profil] DATA: deletingProfil stocké + modale configurée', { deletingProfil, modal: Alpine.store('ui').modals.confirmation })` |
| `end` | `console.log('[WORKFLOW.settings-smtp-delete-profil] SUCCESS: Modale de confirmation affichée en', duree, 'ms')` |
| `error` | `console.error('[WORKFLOW.settings-smtp-delete-profil] ERROR:', error)` |
