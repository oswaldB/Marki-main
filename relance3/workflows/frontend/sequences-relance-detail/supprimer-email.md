# Workflow : Supprimer email (PouchDB)

## Écran
`sequences-relance-detail.html`

## Élément déclencheur
Bouton avec `@click="supprimerEmail(idx)"`

## Action
Supprimer un email de la séquence dans PouchDB

## Description
- Demande confirmation
- Supprime définitivement de PouchDB
- Réorganise les indices
- Synchronise avec CouchDB

## Data Model
**Page Function:** `sequencesRelanceDetailPage()`

**Stores Alpine.js:**
- $store.ui

**Données (depuis PouchDB):**
- `sequence` - séquence depuis PouchDB
- `etapes` - liste des étapes
- `modeles`
- `activeTab`
- `draggingEtape`
- `editingEtape`
- `editorInstance`
- `db` - instance PouchDB

**États UI:**
- `loading`
- `error`
- `saving`
- `hasChanges`
- `showEtapeModal`
- `showModeleModal`
- `showDeleteEtapeModal`

## State Changes

**Modifications:**
- `etapes` ← email supprimé et indices réorganisés
- `hasChanges` ← `false` (après sauvegarde)

## PouchDB Operations

**Action:** Supprimer un email du tableau `emails` dans la séquence PouchDB.

**Méthodes utilisées:**
1. `db.get('sequence:' + id)` - Récupérer le document avec sa révision
2. Supprimer l'email du tableau et réorganiser les indices
3. `db.put(doc)` - Sauvegarder le document modifié

**Sync:** La modification est automatiquement synchronisée avec CouchDB.

## Organisation des fichiers

```
frontend/
└── app/
    └── sequences-relance-detail/
        ├── index.html
        ├── components/
        │   └── (composants partagés)
        └── js/
            └── supprimer-email.js
```

### Fichier principal
- **HTML** : `frontend/app/sequences-relance-detail/index.html`
- **Point d'entrée** : Initialise la page Alpine.js avec PouchDB

### Fichier workflow
- **JS** : `frontend/app/sequences-relance-detail/js/supprimer-email.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/sequences-relance-detail/js/supprimer-email.js
export async function supprimerEmail() {
  // Implementation avec PouchDB
}
```

## Implementation (PouchDB)

```javascript
async supprimerEmail(index) {
  // 1. Confirm action
  if (!confirm('Supprimer cet email ?')) return;
  
  this.loading = true;
  
  try {
    // 2. Récupérer le document depuis PouchDB avec sa révision
    const doc = await db.get('sequence:' + this.sequenceId);
    
    // 3. Supprimer l'email du tableau
    doc.emails.splice(index, 1);
    
    // 4. Réorganiser les indices
    doc.emails.forEach((email, idx) => {
      email.email_index = idx + 1;
    });
    
    doc.updated_at = new Date().toISOString();
    
    // 5. Sauvegarder dans PouchDB
    const response = await db.put(doc);
    // response: { ok: true, id: 'sequence:...', rev: '2-xxx...' }
    
    // 6. Mettre à jour l'UI
    this.etapes = [...doc.emails];
    this.sequence = { ...doc, _rev: response.rev };
    
    // 7. Notify
    this.toast('Email supprimé', 'success');
    
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

- **Confirmation** : Demande confirmation avant suppression
- **Réorganisation** : Les indices des emails sont réorganisés après suppression
- **Synchronisation** : La modification est immédiatement synchronisée avec CouchDB

---

## Migration depuis l'ancienne architecture

| Aspect | Avant | Après (PouchDB) |
|--------|-------|-----------------|
| Action | Côté client uniquement | `db.get()` + `db.put()` |
| Persistence | Non persistant | Persistant dans PouchDB |
| Réorganisation | Côté client | Côté client puis `db.put()` |
| Latence | Instantanée | ~10-50ms (local) |
| Offline | ❌ Impossible | ✅ Fonctionne offline, sync reportée |
