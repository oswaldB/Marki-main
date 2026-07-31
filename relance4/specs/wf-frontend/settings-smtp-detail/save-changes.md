# Workflow : Sauvegarder profil SMTP

## Écran
`settings-smtp-detail.html`

## Élément déclencheur
Bouton avec `@click="saveProfil()"`

## Action
Enregistrer les modifications du profil

## Description
- Persiste les changements
- Valide la configuration
- Quitte le mode édition

## Data Model
**Page Function:** `settingsSmtpDetailPage()`

**Stores Alpine.js:**
- $store.ui

**Données:**
- `profil`
- `historique`
- `stats`
- `editedProfil`

**États UI:**
- `loading`
- `error`
- `saving`
- `editMode`

## State Changes

**Modifications:**
- `saving` passe à true/false
- `editMode` passe à false après succès
- `profil` mis à jour avec les nouvelles valeurs
- `error` ← message si échec

## API Calls

**Endpoint:** `PUT /api/smtp-profiles/:id`

**Payload:** selon contexte

**Response:** `ApiResponse<SmtpProfile>`

## Organisation des fichiers

```
frontend/
└── app/
    └── settings-smtp-detail/
        ├── index.html
        ├── components/
        │   └── (composants partagés)
        └── js/
            └── save-changes.js
```

### Fichier principal
- **HTML** : `frontend/app/settings-smtp-detail/index.html`
- **Point d'entrée** : Initialise la page Alpine.js

### Fichier workflow
- **JS** : `frontend/app/settings-smtp-detail/js/save-changes.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/settings-smtp-detail/js/save-changes.js
export function saveProfil() {
  // Implementation du workflow
}
```

## Implementation

```javascript
async saveProfil() {
  // 1. Validate
  if (!this.validateForm()) return;

  // 2. Set saving state
  this.saving = true;
  this.error = null;

  try {
    const id = this.editedProfil.id;

    // 3. Call API
    const response = await fetch(`/api/smtp-profiles/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(this.editedProfil)
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error?.message);
    }

    // 4. Update local data
    this.profil = { ...this.profil, ...data.data };

    // 5. Exit edit mode
    this.editMode = false;
    this.editedProfil = null;

    // 6. Notify
    Alpine.store('ui').addToast('Modifications sauvegardées', 'success');

  } catch (error) {
    this.error = error.message;
    Alpine.store('ui').addToast(error.message, 'error');
  } finally {
    this.saving = false;
  }
}
```
