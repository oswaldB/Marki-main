# Workflow : Éditer une note (PouchDB)

## Écran
`relances.html`

## Élément déclencheur
Bouton avec `@click="editNote(payeur)"`

## Action
Ouvrir l'édition de la note sur une relance

## Description
- Affiche un champ d'édition
- Permet de modifier la note existante
- Sauvegarde dans PouchDB au blur ou sur validation

## Data Model
**Page Function:** `relancesPage()`

**Stores Alpine.js:**
- $store.ui

**Données (depuis PouchDB):**
- `payeurs` - payeurs depuis PouchDB
- `stats` - statistiques calculées côté client
- `sequences` - séquences depuis PouchDB
- `searchQuery`
- `filterStatut`
- `editorContent`
- `editorMode`
- `editingNote` - note en cours d'édition
- `db` - instance PouchDB

**États UI:**
- `loading`
- `error`
- `expandedPayeur`
- `showNewRelanceModal`
- `showEditRelanceModal`
- `showSequenceModal`

## State Changes

**Modifications:**
- `editingNote` ← note en cours d'édition
- États UI spécifiques selon implémentation

## PouchDB Operations

**Action :** Sauvegarder la note modifiée dans le document relance ou payeur.

**Méthodes utilisées :**
1. `db.get('relance:' + relanceId)` - Récupérer le document
2. Modifier le champ `note`
3. `db.put(doc)` - Sauvegarder le document modifié

**Sync :** La modification est automatiquement synchronisée avec CouchDB.

## API Calls

**Pas d'appel API** - Action côté client uniquement avec PouchDB

## Organisation des fichiers

```
frontend/
└── app/
    └── relances/
        ├── index.html
        ├── components/
        │   └── (composants partagés)
        └── js/
            └── edit-note.js
```

### Fichier principal
- **HTML** : `frontend/app/relances/index.html`
- **Point d'entrée** : Initialise la page Alpine.js avec PouchDB

### Fichier workflow
- **JS** : `frontend/app/relances/js/edit-note.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/relances/js/edit-note.js
export async function editNote() {
  // Implementation avec PouchDB
}
```

## Implementation

```javascript
// Ouvrir l'édition de note
editNote(relance) {
  // 1. Préparer l'édition
  this.editingNote = {
    relanceId: relance._id,
    noteContent: relance.note || ''
  };
  
  // 2. Focus sur le champ d'édition (optionnel)
  this.$nextTick(() => {
    const textarea = document.getElementById('note-editor');
    if (textarea) textarea.focus();
  });
}

// Sauvegarder la note (au blur ou sur validation)
async saveNote() {
  if (!this.editingNote) return;
  
  this.loading = true;
  
  try {
    // 1. Récupérer le document depuis PouchDB
    const doc = await db.get(this.editingNote.relanceId);
    
    // 2. Mettre à jour la note
    doc.note = this.editingNote.noteContent.trim();
    doc.updated_at = new Date().toISOString();
    
    // 3. Sauvegarder dans PouchDB
    await db.put(doc);
    
    // 4. Mettre à jour l'UI (le changes listener mettra aussi à jour)
    const index = this.relances.findIndex(r => r._id === this.editingNote.relanceId);
    if (index !== -1) {
      this.relances[index].note = doc.note;
      this.relances[index].updated_at = doc.updated_at;
    }
    
    // 5. Réinitialiser l'état d'édition
    this.editingNote = null;
    
    // 6. Notify
    this.toast('Note sauvegardée', 'success');
    
  } catch (error) {
    if (error.status === 409) {
      this.error = 'Conflit de version, veuillez réessayer';
      this.toast('Conflit de version, veuillez réessayer', 'error');
    } else {
      this.error = error.message;
      this.toast(error.message, 'error');
    }
  } finally {
    this.loading = false;
  }
}

// Annuler l'édition
cancelEditNote() {
  this.editingNote = null;
}

// Sauvegarde automatique au blur
handleBlur() {
  this.saveNote();
}
```

## Notes

- **Sauvegarde PouchDB** : La note est sauvegardée dans le document relance
- **Sync automatique** : Les modifications sont synchronisées avec CouchDB
- **Mode édition** : L'état `editingNote` permet de savoir quelle relance est en cours d'édition
- **Au blur** : La sauvegarde peut se faire automatiquement quand l'utilisateur quitte le champ
- **Gestion conflits** : En cas de conflit (409), une alerte est affichée

---

## Migration depuis l'ancienne architecture

| Aspect | Avant | Après (PouchDB) |
|--------|-------|-----------------|
| Stockage note | Champ dans relance (SQLite) | Champ dans document PouchDB |
| Sauvegarde | `PUT /api/relances/:id` | `db.get()` + `db.put()` |
| Réponse | `ApiResponse<Relance>` | `{ ok, id, rev }` |
| Latence | ~100-300ms | ~10-50ms (local) |
| Offline | ❌ Impossible | ✅ Fonctionne offline |
