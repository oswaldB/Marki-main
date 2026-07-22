# Workflow : Blacklister via validation (PouchDB)

## Écran
`relances-validation.html`

## Élément déclencheur
Bouton avec `@click="blacklisterRelance()"`

## Action
Blacklister le payeur depuis validation via PouchDB

## Description
- Ajoute le payeur à la blacklist dans PouchDB
- Annule la relance en cours
- Désactive les futures relances
- Synchronise avec CouchDB

## Data Model
**Page Function:** `relancesValidationPage()`

**Stores Alpine.js:**
- $store.ui

**Données (depuis PouchDB):**
- `relancesAValider` - relances depuis PouchDB
- `selectedRelances`
- `selectAll`
- `dbContacts` - instance PouchDB contacts
- `db` - instance PouchDB relances

**États UI:**
- `loading`
- `error`
- `previewMode`
- `previewRelance`
- `processing`

## State Changes

**Modifications:**
- `relancesAValider` ← filtrée (relance retirée)
- Contact mis à jour dans PouchDB

## PouchDB Operations

**Action:** Mettre à jour le contact dans PouchDB pour le blacklister.

**Méthodes utilisées:**
1. `dbContacts.get('contact:' + contactId)` - Récupérer le contact avec sa révision
2. Mettre à jour `is_blacklisted: true`
3. `dbContacts.put(doc)` - Sauvegarder le document modifié

**Sync:** La modification est automatiquement synchronisée avec CouchDB.

## Organisation des fichiers

```
frontend/
└── app/
    └── relances-validation/
        ├── index.html
        ├── components/
        │   └── (composants partagés)
        └── js/
            └── blacklister-relance.js
```

### Fichier principal
- **HTML** : `frontend/app/relances-validation/index.html`
- **Point d'entrée** : Initialise la page Alpine.js avec PouchDB

### Fichier workflow
- **JS** : `frontend/app/relances-validation/js/blacklister-relance.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/relances-validation/js/blacklister-relance.js
export async function blacklisterRelance() {
  // Implementation avec PouchDB
}
```

## Implementation (PouchDB)

```javascript
async blacklisterRelance(relance) {
  // 1. Set loading
  this.loading = true;
  
  try {
    // 2. Récupérer le contact depuis PouchDB avec sa révision
    const contactDoc = await dbContacts.get('contact:' + relance.contact_id);
    
    // 3. Mettre à jour le statut blacklist
    contactDoc.is_blacklisted = true;
    contactDoc.blacklisted_at = new Date().toISOString();
    contactDoc.updated_at = new Date().toISOString();
    
    // 4. Sauvegarder dans PouchDB
    const response = await dbContacts.put(contactDoc);
    // response: { ok: true, id: 'contact:...', rev: '2-xxx...' }
    
    // 5. Annuler la relance en cours
    const relanceDoc = await db.get('relance:' + reliance.id);
    relanceDoc.statut = 'annulee';
    relanceDoc.annulee_raison = 'payeur_blackliste';
    relanceDoc.updated_at = new Date().toISOString();
    await db.put(relanceDoc);
    
    // 6. Remove relance from validation list
    this.relancesAValider = this.relancesAValider.filter(item => item.id !== relance.id);
    
    // 7. Notify
    this.toast('Payeur blacklisté', 'success');
    
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

---

## Migration depuis l'ancienne API

| Aspect | Avant (API) | Après (PouchDB) |
|--------|-------------|-----------------|
| Requête | `POST /api/contacts/:id/blacklist` | `dbContacts.get()` + `dbContacts.put()` |
| Payload | `{ is_blacklisted: true, updated_at: ... }` | Modification directe du doc |
| Réponse | `ApiResponse<Contact>` | `{ ok, id, rev }` |
| Gestion conflits | Backend | Détection `_rev` côté client |
| Annulation relance | API séparée | `db.put()` dans la même transaction |
| Latence | ~200-500ms | ~20-50ms (local) |
| Offline | ❌ Impossible | ✅ Fonctionne offline, sync reportée |
