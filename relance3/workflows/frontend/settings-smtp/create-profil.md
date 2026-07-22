# Workflow : Créer profil SMTP (PouchDB)

## Écran
`settings-smtp.html`

## Élément déclencheur
Bouton avec `@click="createProfil()"`

## Action
Valider la création du profil dans PouchDB

## Description
- Valide tous les champs
- Crée le profil dans PouchDB
- Synchronise avec CouchDB
- Ferme le formulaire

## Data Model
**Page Function:** `settingsSmtpPage()`

**Stores Alpine.js:**
- $store.ui

**Données (depuis PouchDB):**
- `profils` - profils SMTP depuis PouchDB
- `newProfil` - nouveau profil à créer
- `db` - instance PouchDB

**États UI:**
- `loading`
- `error`
- `showNewProfilForm`
- `testingProfil`

## State Changes

**Modifications:**
- `showNewProfilForm` passe à false
- `profils` mis à jour avec le nouveau profil
- `error` ← message si échec

## PouchDB Operations

**Action:** Créer un nouveau profil SMTP dans PouchDB.

**Méthodes utilisées:**
1. Générer un ID unique
2. `db.put({ _id: 'smtp-profile:' + uuid, ... })` - Créer le document

**Sync:** La modification est automatiquement synchronisée avec CouchDB.

## Organisation des fichiers

```
frontend/
└── app/
    └── settings-smtp/
        ├── index.html
        ├── components/
        │   └── (composants partagés)
        └── js/
            └── create-profil.js
```

### Fichier principal
- **HTML** : `frontend/app/settings-smtp/index.html`
- **Point d'entrée** : Initialise la page Alpine.js avec PouchDB

### Fichier workflow
- **JS** : `frontend/app/settings-smtp/js/create-profil.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/settings-smtp/js/create-profil.js
export async function createProfil() {
  // Implementation avec PouchDB
}
```

## Implementation (PouchDB)

```javascript
async createProfil() {
  // 1. Validate form
  if (!this.validateForm()) {
    return;
  }
  
  // 2. Set loading state
  this.loading = true;
  this.error = null;
  
  try {
    // 3. Générer ID unique
    const id = 'smtp-profile:' + Date.now();
    
    // 4. Créer le document dans PouchDB
    const newDoc = {
      _id: id,
      type: 'smtp-profile',
      nom: this.newProfil.nom,
      email: this.newProfil.email,
      host: this.newProfil.host,
      port: this.newProfil.port,
      secure: this.newProfil.secure,
      username: this.newProfil.username,
      password: this.newProfil.password,
      from_email: this.newProfil.from_email,
      from_name: this.newProfil.from_name,
      actif: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const response = await db.put(newDoc);
    // response: { ok: true, id: 'smtp-profile:...', rev: '1-xxx...' }
    
    // 5. Update local data
    this.profils.unshift({ ...newDoc, _rev: response.rev });
    
    // 6. Close form
    this.showNewProfilForm = false;
    this.resetNewProfil();
    
    // 7. Notify success
    this.toast('Profil SMTP créé', 'success');
    
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
- **Type** : `type: 'smtp-profile'` pour filtrage

---

## Migration depuis l'ancienne architecture

| Aspect | Avant (API) | Après (PouchDB) |
|--------|-------------|-----------------|
| Requête | `POST /api/smtp-profiles` | `db.put({ _id: 'smtp-profile:' + uuid, ... })` |
| Payload | `{ nom, email, host, port, ... }` | Document PouchDB avec `_id` et `type` |
| Réponse | `ApiResponse<SmtpProfile>` | `{ ok, id, rev }` |
| Latence | ~200-500ms | ~10-50ms (local) |
| Offline | ❌ Impossible | ✅ Fonctionne offline |
