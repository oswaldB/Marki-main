# Workflow : Dupliquer une séquence (PouchDB)

## Écran
`sequences.html`

## Élément déclencheur
Bouton avec `@click="duplicateSequence(sequence)"`

## Action
Créer une copie d'une séquence existante dans PouchDB

## Description
- Duplique la séquence avec un nouveau nom
- Copie tous les emails et leur configuration
- La nouvelle séquence est inactive par défaut
- Synchronise avec CouchDB
- Redirige vers l'édition de la nouvelle séquence

## Data Model
**Page Function:** `sequencesPage()`

**Données (depuis PouchDB):**
- `sequence` - la séquence à dupliquer
- `sequences` - liste des séquences
- `db` - instance PouchDB

**États UI:**
- `loading`
- `error`

## State Changes

**Modifications:**
- `loading` → `true` → `false`
- `sequences` ← nouvelle séquence ajoutée

## PouchDB Operations

**Action:** Créer un nouveau document séquence dans PouchDB basé sur une séquence existante.

**Méthodes utilisées:**
- `db.put(doc)` - Créer le document avec un nouvel ID

**Sync:** La création est automatiquement synchronisée avec CouchDB.

## Organisation des fichiers

```
frontend/
└── app/
    └── sequences/
        ├── index.html
        ├── components/
        │   └── (composants partagés)
        └── js/
            └── duplicate-sequence.js
```

### Fichier principal
- **HTML** : `frontend/app/sequences/index.html`
- **Point d'entrée** : Initialise la page Alpine.js avec PouchDB

### Fichier workflow
- **JS** : `frontend/app/sequences/js/duplicate-sequence.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/sequences/js/duplicate-sequence.js
export async function duplicateSequence() {
  // Implementation avec PouchDB
}
```

## Implementation (PouchDB)

```javascript
async duplicateSequence(sequence) {
  // 1. Confirm action
  if (!confirm(`Dupliquer la séquence "${sequence.nom}" ?`)) return;
  
  // 2. Set loading
  this.loading = true;
  this.error = null;
  
  try {
    // 3. Prepare document PouchDB (copy with new ID)
    const newSequenceDoc = {
      _id: 'sequence:' + this.generateUUID(),
      type: 'sequence',
      nom: `Copie de ${sequence.nom}`,
      type_sequence: sequence.type_sequence,
      actif: false, // Inactive by default
      emails: sequence.emails || [],
      validation_obligatoire: sequence.validation_obligatoire || false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // 4. Create in PouchDB
    const response = await db.put(newSequenceDoc);
    // response: { ok: true, id: 'sequence:...', rev: '1-xxx...' }
    
    // 5. Update local array
    this.sequences.unshift({ ...newSequenceDoc, _rev: response.rev });
    
    // 6. Redirect to edit page
    window.location.href = `/sequences-relance-detail.html?id=${newSequenceDoc._id}`;
    
    // 7. Notify
    this.toast('Séquence dupliquée', 'success');
    
  } catch (error) {
    this.error = error.message;
    this.toast(error.message, 'error');
  } finally {
    this.loading = false;
  }
}

generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
```

## Notes

- La séquence dupliquée est créée avec le statut `inactif` (actif: false)
- L'utilisateur doit l'activer manuellement après modification
- Tous les emails et leur configuration sont copiés
- Le nom est préfixé par "Copie de "
- L'ID est généré côté client avec UUID pour éviter les conflits

---

## Migration depuis l'ancienne API

| Aspect | Avant (API) | Après (PouchDB) |
|--------|-------------|-----------------|
| Requête | `POST /api/sequences` | `db.put(doc)` |
| ID génération | Backend | UUID côté client |
| Réponse | `ApiResponse<Sequence>` | `{ ok, id, rev }` |
| Latence | ~100-300ms | ~10-50ms (local) |
| Offline | ❌ Impossible | ✅ Fonctionne offline, sync reportée |
