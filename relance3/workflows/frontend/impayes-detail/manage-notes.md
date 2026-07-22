# Workflow Frontend: Gestion des Notes (Impayé + Contact) - PouchDB

## Description
Gestion des deux blocs de notes sur la page impayes-detail via **PouchDB local** :
- **Notes Facture** : Spécifiques à l'impayé (stockées dans le document `facture`)
- **Notes Contact** : Générales au payeur (stockées dans le document `contact`)

Les données sont synchronisées automatiquement avec CouchDB.

## UI/UX

### Layout des Notes

```
┌─────────────────────────────────────────────────────────────────┐
│  [sticky-note] NOTES                         [plus] Ajouter     │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────┬─────────────────────┐                   │
│  │ [file] FACTURE (2)  │  [user] CONTACT (5) │  ← Onglets       │
│  │  ═══════════════════│                     │     horizontaux  │
│  └─────────────────────┴─────────────────────┘                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ [comment] Ma note personnelle...                            │   │
│  │ [pen] Par Moi, il y a 2h    [edit] [trash] (boutons hover)│   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ [comment] Note d'un collègue...                             │   │
│  │ [pen] Par Marie D., hier                                    │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                   │
├─────────────────────────────────────────────────────────────────┤
│  [sticky-note] Écrivez votre note ici...                         │
│                                                                  │
│                                       [paper-plane] Ajouter    │
└─────────────────────────────────────────────────────────────────┘
```

### Comportement

1. **Bouton "Ajouter une note"** :
   - Situé dans l'en-tête de la section
   - Au clic, met le focus sur le textarea de saisie

2. **Navigation par onglets horizontaux** :
   - Clic sur "`<i class='fas fa-file'></i>` Facture" → Affiche les notes de l'impayé
   - Clic sur "`<i class='fas fa-user'></i>` Contact" → Affiche les notes du contact
   - L'onglet actif a une bordure sky-500 en bas et un fond léger

3. **Compteur de notes** :
   - Badge avec le nombre de notes sur chaque onglet
   - Mis à jour en temps réel via PouchDB changes

4. **Saisie rapide** :
   - Textarea en bas du panneau
   - Bouton "Ajouter" avec icône enveloppe
   - Raccourci clavier : Ctrl+Enter pour envoyer

---

## Data Model Alpine.js

```javascript
// Dans impayesDetailPage()
return {
  // ... autres propriétés ...
  
  // Notes depuis PouchDB
  activeNotesTab: 'impaye',      // 'impaye' | 'contact'
  notesImpaye: [],               // Notes extraites du document facture
  notesContact: [],              // Notes extraites du document contact
  
  // PouchDB
  db: null,                      // Instance PouchDB (factures)
  dbContacts: null,              // Instance PouchDB (contacts)
  
  // UI Notes
  newNoteContent: '',            // Texte en cours de saisie
  savingNote: false,             // État de sauvegarde
  showEditNoteModal: false,      // Modal d'édition
  editNoteForm: {                // Formulaire d'édition
    id: null,
    content: '',
    author: '',
    date: '',
    type: ''
  },
  // $refs.noteTextarea permet de focus le textarea depuis le bouton "Ajouter"
  
  // Methods
  async loadImpayeNotes(impayeId) { /* ... */ },
  async loadContactNotes(contactId) { /* ... */ },
  async saveNote(type) { /* ... */ },
  async deleteNote(type, noteId) { /* ... */ },
  openEditNote(type, note) { /* ... */ },    // Ouvre la modal d'édition
  confirmEditNote() { /* ... */ },            // Confirme la modification
  
  // Computed
  get currentNotes() {
    return this.activeNotesTab === 'impaye' ? this.notesImpaye : this.notesContact;
  },
  get notesCount() {
    return {
      impaye: this.notesImpaye.length,
      contact: this.notesContact.length
    };
  }
};
```

---

## Workflows PouchDB

### Workflow 1: Chargement Initial des Notes depuis PouchDB

```javascript
/**
 * @checkpoint LoadImpayeNotes
 * Charge les notes depuis le document facture PouchDB
 */
loadImpayeNotes: async function(impayeId) {
  try {
    // Récupérer le document facture depuis PouchDB
    const doc = await db.get('facture:' + impayeId);
    
    // Les notes sont stockées dans le champ notes_json ou notes
    this.notesImpaye = doc.notes || doc.notes_json || [];
    
    // Trier par date décroissante
    this.notesImpaye.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
  } catch (error) {
    console.error('Erreur chargement notes impayé:', error);
    this.notesImpaye = [];
  }
}

/**
 * @checkpoint LoadContactNotes
 * Charge les notes depuis le document contact PouchDB
 */
loadContactNotes: async function(contactId) {
  try {
    // Récupérer le document contact depuis PouchDB
    const doc = await dbContacts.get(contactId);
    
    // Les notes sont stockées dans le champ notes
    this.notesContact = doc.notes || [];
    
    // Trier par date décroissante
    this.notesContact.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
  } catch (error) {
    console.error('Erreur chargement notes contact:', error);
    this.notesContact = [];
  }
}
```

---

### Workflow 2: Ajouter une Note dans PouchDB

```javascript
/**
 * @checkpoint SaveNote
 * Sauvegarde une nouvelle note dans le document PouchDB
 * @param {string} type - 'impaye' ou 'contact'
 */
saveNote: async function(type) {
  if (!this.newNoteContent.trim()) return;
  
  this.savingNote = true;
  
  try {
    const now = new Date().toISOString();
    const newNote = {
      id: `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      content: this.newNoteContent.trim(),
      created_by: this.user?.id,
      created_by_name: this.user?.name || 'Moi',
      created_at: now,
      updated_at: now
    };
    
    if (type === 'impaye') {
      // 1. Récupérer le document facture
      const doc = await db.get('facture:' + this.impaye.id);
      
      // 2. Ajouter la note
      if (!doc.notes) doc.notes = [];
      doc.notes.unshift(newNote);
      doc.updated_at = now;
      
      // 3. Sauvegarder dans PouchDB
      await db.put(doc);
      
      // 4. Mettre à jour l'UI
      this.notesImpaye.unshift(newNote);
      
    } else {
      // 1. Récupérer le document contact
      const doc = await dbContacts.get(this.contact.id);
      
      // 2. Ajouter la note
      if (!doc.notes) doc.notes = [];
      doc.notes.unshift(newNote);
      doc.updated_at = now;
      
      // 3. Sauvegarder dans PouchDB
      await dbContacts.put(doc);
      
      // 4. Mettre à jour l'UI
      this.notesContact.unshift(newNote);
    }
    
    // 5. Reset le formulaire
    this.newNoteContent = '';
    this.showToast('Note ajoutée', 'success');
    
  } catch (error) {
    if (error.status === 409) {
      this.showToast('Conflit de version, veuillez réessayer', 'error');
    } else {
      this.showToast('Erreur lors de l\'ajout', 'error');
    }
  } finally {
    this.savingNote = false;
  }
}
```

---

### Workflow 3: Supprimer une Note dans PouchDB

```javascript
/**
 * @checkpoint DeleteNote
 * Supprime une note du document PouchDB après confirmation
 */
deleteNote: async function(type, noteId) {
  if (!confirm('Supprimer cette note ?')) return;
  
  try {
    const now = new Date().toISOString();
    
    if (type === 'impaye') {
      // 1. Récupérer le document facture
      const doc = await db.get('facture:' + this.impaye.id);
      
      // 2. Filtrer la note à supprimer
      doc.notes = (doc.notes || []).filter(n => n.id !== noteId);
      doc.updated_at = now;
      
      // 3. Sauvegarder dans PouchDB
      await db.put(doc);
      
      // 4. Mettre à jour l'UI
      this.notesImpaye = this.notesImpaye.filter(n => n.id !== noteId);
      
    } else {
      // 1. Récupérer le document contact
      const doc = await dbContacts.get(this.contact.id);
      
      // 2. Filtrer la note à supprimer
      doc.notes = (doc.notes || []).filter(n => n.id !== noteId);
      doc.updated_at = now;
      
      // 3. Sauvegarder dans PouchDB
      await dbContacts.put(doc);
      
      // 4. Mettre à jour l'UI
      this.notesContact = this.notesContact.filter(n => n.id !== noteId);
    }
    
    this.showToast('Note supprimée', 'success');
    
  } catch (error) {
    if (error.status === 409) {
      this.showToast('Conflit de version, veuillez réessayer', 'error');
    } else {
      this.showToast('Erreur lors de la suppression', 'error');
    }
  }
}
```

---

### Workflow 4: Modifier une Note dans PouchDB

```javascript
/**
 * @checkpoint OpenEditNote
 * Ouvre la modal d'édition avec les données de la note
 */
openEditNote: function(type, note) {
  this.editNoteForm = { 
    id: note.id, 
    content: note.content, 
    author: note.created_by_name, 
    date: this.formatDate(note.created_at),
    type: type
  };
  this.showEditNoteModal = true;
}

/**
 * @checkpoint ConfirmEditNote
 * Sauvegarde les modifications de la note dans PouchDB
 */
confirmEditNote: async function() {
  const { type, id, content } = this.editNoteForm;
  
  if (!content.trim()) return;
  
  try {
    const now = new Date().toISOString();
    
    if (type === 'impaye') {
      // 1. Récupérer le document facture
      const doc = await db.get('facture:' + this.impaye.id);
      
      // 2. Mettre à jour la note
      const note = doc.notes.find(n => n.id === id);
      if (note) {
        note.content = content.trim();
        note.updated_at = now;
      }
      doc.updated_at = now;
      
      // 3. Sauvegarder dans PouchDB
      await db.put(doc);
      
      // 4. Mettre à jour l'UI
      const localNote = this.notesImpaye.find(n => n.id === id);
      if (localNote) {
        localNote.content = content.trim();
        localNote.updated_at = now;
      }
      
    } else {
      // 1. Récupérer le document contact
      const doc = await dbContacts.get(this.contact.id);
      
      // 2. Mettre à jour la note
      const note = doc.notes.find(n => n.id === id);
      if (note) {
        note.content = content.trim();
        note.updated_at = now;
      }
      doc.updated_at = now;
      
      // 3. Sauvegarder dans PouchDB
      await dbContacts.put(doc);
      
      // 4. Mettre à jour l'UI
      const localNote = this.notesContact.find(n => n.id === id);
      if (localNote) {
        localNote.content = content.trim();
        localNote.updated_at = now;
      }
    }
    
    this.showEditNoteModal = false;
    this.showToast('Note modifiée', 'success');
    
  } catch (error) {
    if (error.status === 409) {
      this.showToast('Conflit de version, veuillez réessayer', 'error');
    } else {
      this.showToast('Erreur lors de la modification', 'error');
    }
  }
}
```

---

## Live Sync avec PouchDB

```javascript
/**
 * @checkpoint SetupNotesListeners
 * Configure les listeners pour les changements temps réel
 */
setupNotesListeners: function() {
  // Listener sur les factures (notes impayé)
  db.changes({
    since: 'now',
    live: true,
    include_docs: true
  }).on('change', (change) => {
    if (change.doc._id === 'facture:' + this.impaye.id && change.doc.notes) {
      this.notesImpaye = change.doc.notes.sort((a, b) => 
        new Date(b.created_at) - new Date(a.created_at)
      );
    }
  });
  
  // Listener sur les contacts (notes contact)
  dbContacts.changes({
    since: 'now',
    live: true,
    include_docs: true
  }).on('change', (change) => {
    if (change.doc._id === this.contact.id && change.doc.notes) {
      this.notesContact = change.doc.notes.sort((a, b) => 
        new Date(b.created_at) - new Date(a.created_at)
      );
    }
  });
}
```

---

## Template HTML (Alpine.js)

```html
<!-- Section Notes -->
<div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
  <!-- Header avec bouton Ajouter -->
  <div class="p-4 border-b border-slate-200 flex items-center justify-between">
    <h2 class="text-lg font-semibold text-slate-900">
      <i class="fas fa-sticky-note text-slate-400 mr-2"></i>Notes
    </h2>
    <button @click="$refs.noteTextarea.focus()" 
            class="text-xs px-3 py-1.5 bg-sky-50 text-sky-600 hover:bg-sky-100 
                   rounded-lg font-medium transition-colors flex items-center gap-1.5">
      <i class="fas fa-plus"></i>
      Ajouter une note
    </button>
  </div>
  
  <!-- Onglets horizontaux -->
  <div class="flex border-b border-slate-200">
    <button @click="activeNotesTab = 'impaye'"
            :class="{ 
              'border-b-2 border-sky-500 text-sky-600 bg-sky-50/50': activeNotesTab === 'impaye', 
              'text-slate-500 hover:text-slate-700 hover:bg-slate-50': activeNotesTab !== 'impaye' 
            }"
            class="flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2">
      <i class="fas fa-file"></i>
      <span>Facture</span>
      <span class="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-slate-200 text-slate-600" 
            x-text="notesCount.impaye"></span>
    </button>
    
    <button @click="activeNotesTab = 'contact'"
            :class="{ 
              'border-b-2 border-sky-500 text-sky-600 bg-sky-50/50': activeNotesTab === 'contact', 
              'text-slate-500 hover:text-slate-700 hover:bg-slate-50': activeNotesTab !== 'contact' 
            }"
            class="flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2">
      <i class="fas fa-user"></i>
      <span>Contact</span>
      <span class="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-slate-200 text-slate-600" 
            x-text="notesCount.contact"></span>
    </button>
  </div>
  
  <!-- Contenu -->
  <div class="p-4">
    <!-- Liste des notes -->
    <div class="space-y-3 mb-4 max-h-64 overflow-y-auto">
      <template x-for="note in currentNotes" :key="note.id">
        <div class="bg-slate-50 rounded-lg p-3 group hover:bg-slate-100 transition-colors">
          <p class="text-sm text-slate-700" x-text="note.content"></p>
          <div class="flex items-center justify-between mt-2 text-xs text-slate-500">
            <span>
              <i class="fas fa-pen text-slate-400 mr-1"></i>
              <span x-text="note.created_by_name"></span>, 
              <span x-text="formatDateRelative(note.created_at)"></span>
            </span>
            <div class="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <!-- Bouton édition visible si isAuthor -->
              <button @click="openEditNote(activeNotesTab, note)"
                      x-show="note.created_by === user?.id"
                      class="text-sky-500 hover:text-sky-700"
                      title="Modifier">
                <i class="fas fa-edit"></i>
              </button>
              <!-- Bouton suppression visible si isAuthor -->
              <button @click="deleteNote(activeNotesTab, note.id)"
                      x-show="note.created_by === user?.id"
                      class="text-red-500 hover:text-red-700"
                      title="Supprimer">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>
        </div>
      </template>
      
      <div x-show="currentNotes.length === 0" class="text-center text-slate-400 py-8">
        Aucune note
      </div>
    </div>
    
    <!-- Saisie rapide -->
    <div class="border-t border-slate-200 pt-3">
      <textarea x-model="newNoteContent"
                x-ref="noteTextarea"
                @keydown.ctrl.enter="saveNote(activeNotesTab)"
                @keydown.meta.enter="saveNote(activeNotesTab)"
                placeholder="Écrivez votre note ici..."
                class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                rows="3"></textarea>
      <div class="flex justify-end mt-2">
        <button @click="saveNote(activeNotesTab)"
                :disabled="!newNoteContent.trim() || savingNote"
                class="px-4 py-2 bg-sky-600 text-white text-sm font-medium rounded-lg hover:bg-sky-700 disabled:opacity-50 flex items-center gap-2">
          <i x-show="!savingNote" class="fas fa-paper-plane"></i>
          <span x-show="!savingNote">Ajouter</span>
          <span x-show="savingNote"><i class="fas fa-spinner fa-spin mr-1"></i> Envoi...</span>
        </button>
      </div>
    </div>
  </div>
</div>
```

---

## Structure du document PouchDB (exemple)

```javascript
// Document facture avec notes
{
  "_id": "facture:550e8400-...",
  "_rev": "3-abc123...",
  "type": "facture",
  "id": "F123",
  "notes": [
    {
      "id": "note_1690123456789_abc123",
      "content": "Client contacté par téléphone",
      "created_by": "user_001",
      "created_by_name": "Marie Martin",
      "created_at": "2026-07-21T10:00:00Z",
      "updated_at": "2026-07-21T10:00:00Z"
    },
    {
      "id": "note_1690123678901_def456",
      "content": "Relance email envoyée",
      "created_by": "user_002",
      "created_by_name": "Jean Dupont",
      "created_at": "2026-07-21T14:30:00Z",
      "updated_at": "2026-07-21T14:30:00Z"
    }
  ],
  "updated_at": "2026-07-21T14:30:00Z"
}
```

---

## Modal d'Édition de Note

```html
<!-- Modal Édition Note -->
<div x-show="showEditNoteModal" x-cloak class="fixed inset-0 z-50 flex items-center justify-center p-4" x-transition.opacity>
  <div class="absolute inset-0 bg-slate-500/75" @click="showEditNoteModal = false"></div>
  <div class="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6" x-transition.scale>
    <h3 class="text-lg font-semibold text-slate-900 mb-4">
      <i class="fas fa-edit text-sky-500 mr-2"></i>Modifier la note
    </h3>
    <div class="space-y-4">
      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1.5">Contenu *</label>
        <textarea x-model="editNoteForm.content" rows="4" class="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm" placeholder="Modifier votre note..."></textarea>
      </div>
      <div class="text-xs text-slate-500">
        Par <span x-text="editNoteForm.author"></span> - <span x-text="editNoteForm.date"></span>
      </div>
    </div>
    <div class="flex items-center justify-end gap-2 mt-6">
      <button @click="showEditNoteModal = false" class="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg text-sm font-medium">Annuler</button>
      <button @click="confirmEditNote()" :disabled="!editNoteForm.content.trim()" class="px-4 py-2 bg-sky-500 hover:bg-sky-600 disabled:bg-slate-300 text-white rounded-lg text-sm font-medium">
        <i class="fas fa-save mr-1"></i>Enregistrer
      </button>
    </div>
  </div>
</div>
```

---

## Validation

- **Content** : requis, 1-2000 caractères
- **Type** : uniquement 'impaye' ou 'contact'
- **Note ID** : format valide (note_xxxx)

---

## Migration depuis l'ancienne API

| Aspect | Avant (API) | Après (PouchDB) |
|--------|-------------|-----------------|
| Chargement | `GET /api/impayes/:id/notes` | `db.get('facture:' + id)` |
| Création | `POST /api/impayes/:id/notes` | Modification doc puis `db.put()` |
| Modification | `PUT /api/impayes/:id/notes/:noteId` | Modification doc puis `db.put()` |
| Suppression | `DELETE /api/impayes/:id/notes/:noteId` | `filter()` puis `db.put()` |
| Stockage | Table SQL séparée | Champ `notes` dans le document |
| Temps réel | Polling | `db.changes()` |
| Latence | ~100-300ms par opération | ~10-50ms (local) |
| Offline | ❌ Impossible | ✅ Fonctionne offline |

---

## Gestion des Erreurs

| Code | Message | Action |
|------|---------|--------|
| 409 | "Conflit de version, veuillez réessayer" | Retry avec nouvelle révision |
| PouchDB error | "Base de données locale non disponible" | Alert |
| Document not found | "Document introuvable dans PouchDB" | Alert |
