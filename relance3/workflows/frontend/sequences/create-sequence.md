# Workflow : Créer une séquence (PouchDB)

## Écran
`sequences.html`

## Élément déclencheur
Bouton avec `@click="createSequence()"` dans le modal de nouvelle séquence

## Action
Créer une nouvelle séquence dans PouchDB

## Description
- Valide les données du formulaire (nom, type_sequence)
- Crée la séquence dans PouchDB avec emails vides par défaut
- Synchronise avec CouchDB
- Rafraîchit la liste des séquences
- Ferme le modal
- Redirige vers l'édition pour configurer les emails

## Data Model
**Page Function:** `sequencesPage()`

**Données (depuis PouchDB):**
- `newSequence` - données du formulaire (nom, type_sequence, actif)
- `sequences` - liste des séquences
- `db` - instance PouchDB

**États UI:**
- `loading`
- `error`
- `showNewSequenceModal`

## State Changes

**Modifications:**
- `loading` → `true` → `false`
- `sequences` ← nouvelle séquence ajoutée
- `showNewSequenceModal` → `false`

## PouchDB Operations

**Action:** Créer un nouveau document séquence dans PouchDB.

**Méthodes utilisées:**
- `db.put(doc)` - Créer le document avec un ID généré

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
            └── create-sequence.js
```

### Fichier principal
- **HTML** : `frontend/app/sequences/index.html`
- **Point d'entrée** : Initialise la page Alpine.js avec PouchDB

### Fichier workflow
- **JS** : `frontend/app/sequences/js/create-sequence.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/sequences/js/create-sequence.js
export async function createSequence() {
  // Implementation avec PouchDB
}
```

## Implementation (PouchDB)

```javascript
async createSequence() {
  // 1. Validate form
  if (!this.newSequence.nom || !this.newSequence.type_sequence) {
    this.toast('Veuillez remplir tous les champs obligatoires', 'error');
    return;
  }
  
  // 2. Set loading
  this.loading = true;
  this.error = null;
  
  try {
    // 3. Prepare document PouchDB
    const sequenceDoc = {
      _id: 'sequence:' + this.generateUUID(),
      type: 'sequence',
      nom: this.newSequence.nom,
      type_sequence: this.newSequence.type_sequence,
      actif: true,
      emails: [],
      validation_obligatoire: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // 4. Create in PouchDB
    const response = await db.put(sequenceDoc);
    // response: { ok: true, id: 'sequence:...', rev: '1-xxx...' }
    
    // 5. Update local array
    this.sequences.unshift({ ...sequenceDoc, _rev: response.rev });
    
    // 6. Close modal
    this.showNewSequenceModal = false;
    this.newSequence = this.getInitialState();
    
    // 7. Redirect to edit page
    window.location.href = `/sequences-relance-detail.html?id=${sequenceDoc._id}`;
    
    // 8. Notify
    this.toast('Séquence créée', 'success');
    
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

- La séquence est créée avec un tableau `emails` vide
- L'utilisateur est redirigé vers la page d'édition pour configurer les emails
- `type_sequence` peut être `relances` ou `suivi`
- L'ID est généré côté client avec UUID pour éviter les conflits

---

## Migration depuis l'ancienne API

| Aspect | Avant (API) | Après (PouchDB) |
|--------|-------------|-----------------|
| Requête | `POST /api/sequences` | `db.put(doc)` |
| ID génération | Backend auto-incrément | UUID côté client |
| Réponse | `ApiResponse<Sequence>` | `{ ok, id, rev }` |
| Latence | ~100-300ms | ~10-50ms (local) |
| Offline | ❌ Impossible | ✅ Création offline, sync reportée |
