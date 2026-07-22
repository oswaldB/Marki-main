# Workflow : Sauvegarder profil SMTP (PouchDB)

## Écran
`settings-smtp-detail.html`

## Élément déclencheur
Bouton avec `@click="saveProfil()"`

## Action
Enregistrer les modifications du profil dans PouchDB

## Description
- Persiste les changements dans PouchDB
- Valide la configuration
- Quitte le mode édition
- Synchronise avec CouchDB

## Data Model
**Page Function:** `settingsSmtpDetailPage()`

**Stores Alpine.js:**
- $store.ui

**Données (depuis PouchDB):**
- `profil` - profil SMTP depuis PouchDB
- `editedProfil` - profil en cours d'édition
- `db` - instance PouchDB

**États UI:**
- `loading`
- `error`
- `saving`
- `editMode`

## State Changes

**Modifications:**
- `saving` passe à true/false
- `editMode` passe à false après succès
- `profil` mis à jour avec les nouvelles valeurs et révision
- `error` ← message si échec

## PouchDB Operations

**Action:** Mettre à jour le profil SMTP dans PouchDB.

**Méthodes utilisées:**
1. `db.get('smtp-profile:' + id)` - Récupérer le document avec sa révision
2. Mettre à jour les champs modifiés
3. `db.put(doc)` - Sauvegarder le document modifié

**Sync:** La modification est automatiquement synchronisée avec CouchDB.

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
- **Point d'entrée** : Initialise la page Alpine.js avec PouchDB

### Fichier workflow
- **JS** : `frontend/app/settings-smtp-detail/js/save-changes.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/settings-smtp-detail/js/save-changes.js
export async function saveProfil() {
  // Implementation avec PouchDB
}
```

## Implementation (PouchDB)

```javascript
async saveProfil() {
  // 1. Validate
  if (!this.validateForm()) return;

  // 2. Set saving state
  this.saving = true;
  this.error = null;

  try {
    // 3. Récupérer le document depuis PouchDB avec sa révision
    const doc = await db.get(this.editedProfil._id);
    
    // 4. Mettre à jour les champs
    doc.nom = this.editedProfil.nom;
    doc.email = this.editedProfil.email;
    doc.host = this.editedProfil.host;
    doc.port = this.editedProfil.port;
    doc.secure = this.editedProfil.secure;
    doc.username = this.editedProfil.username;
    doc.password = this.editedProfil.password;
    doc.from_email = this.editedProfil.from_email;
    doc.from_name = this.editedProfil.from_name;
    doc.updated_at = new Date().toISOString();
    
    // 5. Sauvegarder dans PouchDB
    const response = await db.put(doc);
    // response: { ok: true, id: 'smtp-profile:...', rev: '2-xxx...' }
    
    // 6. Update local data
    this.profil = { ...doc, _rev: response.rev };
    
    // 7. Exit edit mode
    this.editMode = false;
    this.editedProfil = null;
    
    // 8. Notify
    this.toast('Modifications sauvegardées', 'success');
    
  } catch (error) {
    if (error.status === 409) {
      this.error = 'Conflit de version, veuillez réessayer';
      this.toast('Conflit de version', 'error');
    } else {
      this.error = error.message;
      this.toast(error.message, 'error');
    }
  } finally {
    this.saving = false;
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
| Requête | `PUT /api/smtp-profiles/:id` | `db.get()` puis `db.put()` |
| Payload | `{ nom, email, host, port, ... }` | Modification directe du doc |
| Réponse | `ApiResponse<SmtpProfile>` | `{ ok, id, rev }` |
| Gestion conflits | Backend | Détection `_rev` côté client |
| Latence | ~200-500ms | ~10-50ms (local) |
| Offline | ❌ Impossible | ✅ Fonctionne offline, sync reportée |
