# Workflow : Valider une relance (PouchDB)

## Écran
`relances-validation.html`

## Élément déclencheur
Bouton avec `@click="validerRelance()"`

## Action
Approuver l'envoi d'une relance via PouchDB

## Description
- Marque la relance comme validée dans PouchDB
- Change le statut en `pret pour envoi`
- Retire de la liste à valider
- Synchronise avec CouchDB

## Data Model
**Page Function:** `relancesValidationPage()`

**Stores Alpine.js:**
- $store.ui

**Données (depuis PouchDB):**
- `relancesAValider` - relances depuis PouchDB
- `selectedRelances`
- `selectAll`
- `db` - instance PouchDB

**États UI:**
- `loading`
- `error`
- `previewMode`
- `previewRelance`
- `processing`

## State Changes

**Modifications:**
- Relance mise à jour dans PouchDB (valide = true)
- `relancesAValider` ← filtrée (relance retirée)

## PouchDB Operations

**Action:** Mettre à jour la relance dans PouchDB pour la marquer comme validée.

**Méthodes utilisées:**
1. `db.get('relance:' + id)` - Récupérer le document avec sa révision
2. Mettre à jour `valide: true` et `statut: 'pret pour envoi'`
3. `db.put(doc)` - Sauvegarder le document modifié

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
            └── valider-relance.js
```

### Fichier principal
- **HTML** : `frontend/app/relances-validation/index.html`
- **Point d'entrée** : Initialise la page Alpine.js avec PouchDB

### Fichier workflow
- **JS** : `frontend/app/relances-validation/js/valider-relance.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/relances-validation/js/valider-relance.js
export async function validerRelance() {
  // Implementation avec PouchDB
}
```

## Implementation (PouchDB)

```javascript
async validerRelance(id) {
  this.loading = true;
  
  try {
    // 1. Récupérer le document depuis PouchDB avec sa révision
    const doc = await db.get('relance:' + id);
    
    // 2. Mettre à jour le statut
    doc.valide = true;
    doc.statut = 'pret pour envoi';
    doc.validated_at = new Date().toISOString();
    doc.validated_by = this.user?.id;
    doc.updated_at = new Date().toISOString();
    
    // 3. Sauvegarder dans PouchDB
    const response = await db.put(doc);
    // response: { ok: true, id: 'relance:...', rev: '2-xxx...' }
    
    // 4. Remove from validation list (le changes listener mettra aussi à jour)
    this.relancesAValider = this.relancesAValider.filter(
      item => item._id !== 'relance:' + id
    );
    
    // 5. Notify
    this.toast('Relance validée', 'success');
    
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
| Requête | `POST /api/relances/:id/validate` | `db.get()` puis `db.put()` |
| Payload | Aucun | Modification directe du doc |
| Réponse | `{ message, relance }` | `{ ok, id, rev }` |
| Gestion conflits | Backend | Détection `_rev` côté client |
| Latence | ~100-300ms | ~10-50ms (local) |
| Offline | ❌ Impossible | ✅ Fonctionne offline, sync reportée |
