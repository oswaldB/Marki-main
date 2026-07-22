# Workflow : Confirmer suppression profil SMTP (PouchDB)

## Écran
`settings-smtp.html`

## Élément déclencheur
Bouton avec `@click="confirmDeleteProfil()"` (dans modal confirmation)

## Action
Confirmer et exécuter la suppression du profil dans PouchDB

## Description
- Supprime le profil de PouchDB (suppression logique)
- Met à jour la liste locale
- Synchronise avec CouchDB

## Data Model
**Page Function:** `settingsSmtpPage()`

**Stores Alpine.js:**
- $store.ui

**Données (depuis PouchDB):**
- `profils` - profils SMTP depuis PouchDB
- `deletingProfil` - profil en cours de suppression
- `db` - instance PouchDB

**États UI:**
- `loading`
- `error`
- `showDeleteModal`

## State Changes

**Modifications:**
- `profils` filtré (suppression)
- `deletingProfil` réinitialisé
- `showDeleteModal` ← false

## PouchDB Operations

**Action:** Supprimer un profil SMTP de PouchDB (suppression logique avec `actif: false`).

**Méthodes utilisées:**
1. `db.get('smtp-profile:' + id)` - Récupérer le document avec sa révision
2. Mettre à jour `actif: false` et `deleted_at`
3. `db.put(doc)` - Sauvegarder le document modifié

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
            └── confirm-delete-profil.js
```

### Fichier principal
- **HTML** : `frontend/app/settings-smtp/index.html`
- **Point d'entrée** : Initialise la page Alpine.js avec PouchDB

### Fichier workflow
- **JS** : `frontend/app/settings-smtp/js/confirm-delete-profil.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/settings-smtp/js/confirm-delete-profil.js
export async function confirmDeleteProfil() {
  // Implementation avec PouchDB
}
```

## Implementation (PouchDB)

```javascript
async confirmDeleteProfil() {
  this.loading = true;
  this.error = null;
  
  const id = this.deletingProfil._id;
  
  try {
    // 1. Récupérer le document depuis PouchDB avec sa révision
    const doc = await db.get(id);
    
    // 2. Suppression logique (soft delete)
    doc.actif = false;
    doc.deleted_at = new Date().toISOString();
    doc.updated_at = new Date().toISOString();
    
    // 3. Sauvegarder dans PouchDB
    await db.put(doc);
    
    // 4. Mettre à jour la liste locale (filtrer)
    this.profils = this.profils.filter(item => item._id !== id);
    
    // 5. Close modal
    this.showDeleteModal = false;
    
    // 6. Reset
    this.deletingProfil = null;
    
    // 7. Notify
    this.toast('Profil SMTP supprimé', 'success');
    
  } catch (error) {
    if (error.status === 409) {
      this.error = 'Conflit de version, veuillez réessayer';
      this.toast('Conflit de version', 'error');
    } else {
      this.error = error.message;
      this.toast(error.message, 'error');
    }
  } finally {
    this.loading = false;
  }
}
```

## Notes

- **Suppression logique** : Le profil est marqué comme `actif: false` (pas de suppression physique)
- **Synchronisation** : Les changements sont synchronisés avec CouchDB

---

## Migration depuis l'ancienne architecture

| Aspect | Avant (API) | Après (PouchDB) |
|--------|-------------|-----------------|
| Requête | `DELETE /api/smtp-profiles/:id` | `db.get()` + `db.put()` avec suppression logique |
| Réponse | `ApiResponse<void>` | `{ ok, id, rev }` |
| Suppression | Physique | Logique (`actif: false`) |
| Latence | ~200-500ms | ~10-50ms (local) |
| Offline | ❌ Impossible | ✅ Fonctionne offline |
