# Workflow Frontend: Gestion des Notes (Impayé + Contact)

## Description
Gestion des deux blocs de notes sur la page impayes-detail :
- **Notes Facture** : Spécifiques à l'impayé (colonne `impayes.notes_json`)
- **Notes Contact** : Générales au payeur (colonne `contacts.notes`)

## UI/UX

### Layout des Notes

```
┌─────────────────────────────────────────────────────────────────┐
│  📝 NOTES                                    [+ Ajouter]        │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────────────────────────┐ │
│  │  📄 FACTURE     │  │  Contenu des notes                  │ │
│  │                 │  │                                     │ │
│  │  Note 1         │  │  ┌─────────────────────────────┐   │ │
│  │  Note 2    ────│──│──│ 💬 Texte de la note...      │   │ │
│  │                 │  │  │ ✏️ Par Admin, il y a 2h     │   │ │
│  │  [2 notes]      │  │  │    🗑️ Supprimer            │   │ │
│  │                 │  │  └─────────────────────────────┘   │ │
│  │                 │  │                                     │ │
│  │  👤 CONTACT     │  │  ┌─────────────────────────────┐   │ │
│  │                 │  │  │ 💬 Autre note...            │   │ │
│  │  Note 1         │  │  │ ✏️ Par Admin, hier          │   │ │
│  │  Note 2    ────│──│──│    🗑️ Supprimer            │   │ │
│  │  Note 3         │  │  └─────────────────────────────┘   │ │
│  │  Note 4         │  │                                     │ │
│  │  Note 5    ────│──│──│                                     │ │
│  │                 │  │                                     │ │
│  │  [5 notes]      │  │  ┌─────────────────────────────┐   │ │
│  │                 │  │  │ 📝 Nouvelle note...         │   │ │
│  │                 │  │  │ [Enregistrer]               │   │ │
│  │                 │  │  └─────────────────────────────┘   │ │
│  └─────────────────┘  └─────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Comportement

1. **Navigation par onglets verticaux** :
   - Clic sur "📄 FACTURE" → Affiche les notes de l'impayé
   - Clic sur "👤 CONTACT" → Affiche les notes du contact

2. **Compteur de notes** :
   - Badge avec le nombre de notes sur chaque onglet
   - Mis à jour en temps réel

3. **Saisie rapide** :
   - Textarea en bas du panneau
   - Sauvegarde instantanée (Enter + Ctrl/Cmd)

---

## Data Model Alpine.js

```javascript
// Dans impayesDetailPage()
return {
  // ... autres propriétés ...
  
  // Notes
  activeNotesTab: 'impaye',      // 'impaye' | 'contact'
  notesImpaye: [],               // Note[]
  notesContact: [],              // Note[]
  
  // UI Notes
  newNoteContent: '',            // Texte en cours de saisie
  savingNote: false,             // État de sauvegarde
  noteToDelete: null,            // Note à confirmer pour suppression
  
  // Methods
  async loadImpayeNotes(impayeId) { /* ... */ },
  async loadContactNotes(contactId) { /* ... */ },
  async saveNote(type) { /* ... */ },           // type: 'impaye' | 'contact'
  async deleteNote(type, noteId) { /* ... */ },
  switchNotesTab(tab) { /* ... */ },
  
  // Computed
  get currentNotes() {
    return this.activeNotesTab === 'impaye' ? this.notesImpaye : this.notesContact;
  },
  get notesCount() {
    return {
      impaye: this.notesImpaye?.length || 0,
      contact: this.notesContact?.length || 0
    };
  }
};
```

---

## Workflows

### Workflow 1: Chargement Initial des Notes

```javascript
/**
 * @checkpoint LoadImpayeNotes
 * Charge les notes de l'impayé
 */
loadImpayeNotes: async function(impayeId) {
  const token = localStorage.getItem('marki_token');
  const response = await fetch(`/api/impayes/${impayeId}/notes`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  if (response.status === 401) {
    window.location.href = '/login';
    return;
  }
  
  const data = await response.json();
  this.notesImpaye = data.data?.notes || [];
}

/**
 * @checkpoint LoadContactNotes
 * Charge les notes du contact
 */
loadContactNotes: async function(contactId) {
  const token = localStorage.getItem('marki_token');
  const response = await fetch(`/api/contacts/${contactId}/notes`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  if (response.status === 401) {
    window.location.href = '/login';
    return;
  }
  
  const data = await response.json();
  this.notesContact = data.data?.notes || [];
}
```

---

### Workflow 2: Ajouter une Note

```javascript
/**
 * @checkpoint SaveNote
 * Sauvegarde une nouvelle note
 * @param {string} type - 'impaye' ou 'contact'
 */
saveNote: async function(type) {
  if (!this.newNoteContent.trim()) return;
  
  this.savingNote = true;
  
  try {
    const token = localStorage.getItem('marki_token');
    const id = type === 'impaye' ? this.impaye.id : this.contact.id;
    const endpoint = type === 'impaye' 
      ? `/api/impayes/${id}/notes`
      : `/api/contacts/${id}/notes`;
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ content: this.newNoteContent.trim() })
    });
    
    if (response.status === 401) {
      window.location.href = '/login';
      return;
    }
    
    const data = await response.json();
    
    if (data.success) {
      // Ajouter à la liste locale
      if (type === 'impaye') {
        this.notesImpaye.unshift(data.data.note);
      } else {
        this.notesContact.unshift(data.data.note);
      }
      
      this.newNoteContent = '';
      this.showToast('Note ajoutée', 'success');
    }
  } finally {
    this.savingNote = false;
  }
}
```

---

### Workflow 3: Supprimer une Note

```javascript
/**
 * @checkpoint DeleteNote
 * Supprime une note après confirmation
 */
deleteNote: async function(type, noteId) {
  if (!confirm('Supprimer cette note ?')) return;
  
  try {
    const token = localStorage.getItem('marki_token');
    const id = type === 'impaye' ? this.impaye.id : this.contact.id;
    const endpoint = type === 'impaye'
      ? `/api/impayes/${id}/notes/${noteId}`
      : `/api/contacts/${id}/notes/${noteId}`;
    
    const response = await fetch(endpoint, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.status === 401) {
      window.location.href = '/login';
      return;
    }
    
    const data = await response.json();
    
    if (data.success) {
      // Supprimer de la liste locale
      if (type === 'impaye') {
        this.notesImpaye = this.notesImpaye.filter(n => n.id !== noteId);
      } else {
        this.notesContact = this.notesContact.filter(n => n.id !== noteId);
      }
      
      this.showToast('Note supprimée', 'success');
    }
  } catch (error) {
    this.showToast('Erreur lors de la suppression', 'error');
  }
}
```

---

## Template HTML (Jinja2)

```html
<!-- Section Notes -->
<div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
  <div class="p-4 border-b border-slate-200 flex items-center justify-between">
    <h2 class="text-lg font-semibold text-slate-900">📝 Notes</h2>
    <span class="text-sm text-slate-500" x-text="notesCount.impaye + notesCount.contact + ' note(s)'">
    </span>
  </div>
  
  <div class="flex">
    <!-- Onglets verticaux -->
    <div class="w-32 border-r border-slate-200 bg-slate-50">
      <!-- Onglet Facture -->
      <button @click="activeNotesTab = 'impaye'"
              :class="{ 'bg-white border-l-4 border-sky-500': activeNotesTab === 'impaye', 
                        'border-l-4 border-transparent hover:bg-slate-100': activeNotesTab !== 'impaye' }"
              class="w-full p-3 text-left text-sm font-medium transition-colors">
        <div class="flex items-center gap-2">
          <span>📄</span>
          <span>Facture</span>
        </div>
        <div class="text-xs text-slate-500 mt-1" x-text="notesCount.impaye + ' note(s)'"></div>
      </button>
      
      <!-- Onglet Contact -->
      <button @click="activeNotesTab = 'contact'"
              :class="{ 'bg-white border-l-4 border-sky-500': activeNotesTab === 'contact', 
                        'border-l-4 border-transparent hover:bg-slate-100': activeNotesTab !== 'contact' }"
              class="w-full p-3 text-left text-sm font-medium transition-colors">
        <div class="flex items-center gap-2">
          <span>👤</span>
          <span>Contact</span>
        </div>
        <div class="text-xs text-slate-500 mt-1" x-text="notesCount.contact + ' note(s)'"></div>
      </button>
    </div>
    
    <!-- Contenu -->
    <div class="flex-1 p-4">
      <!-- Liste des notes -->
      <div class="space-y-3 mb-4 max-h-64 overflow-y-auto">
        <template x-for="note in currentNotes" :key="note.id">
          <div class="bg-slate-50 rounded-lg p-3 group">
            <p class="text-sm text-slate-700" x-text="note.content"></p>
            <div class="flex items-center justify-between mt-2 text-xs text-slate-500">
              <span>
                ✏️ <span x-text="note.created_by_name"></span>, 
                <span x-text="formatDateRelative(note.created_at)"></span>
              </span>
              <button @click="deleteNote(activeNotesTab, note.id)"
                      class="text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity">
                🗑️
              </button>
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
                  @keydown.ctrl.enter="saveNote(activeNotesTab)"
                  @keydown.meta.enter="saveNote(activeNotesTab)"
                  placeholder="Ajouter une note... (Ctrl+Enter pour envoyer)"
                  class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                  rows="2"></textarea>
        <div class="flex justify-end mt-2">
          <button @click="saveNote(activeNotesTab)"
                  :disabled="!newNoteContent.trim() || savingNote"
                  class="px-3 py-1.5 bg-sky-600 text-white text-sm rounded-lg hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed">
            <span x-show="!savingNote">Enregistrer</span>
            <span x-show="savingNote">⌛</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</div>
```

---

## API Endpoints Résumé

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/impayes/:id/notes` | Notes de l'impayé |
| POST | `/api/impayes/:id/notes` | Ajouter note impayé |
| DELETE | `/api/impayes/:id/notes/:noteId` | Supprimer note impayé |
| GET | `/api/contacts/:id/notes` | Notes du contact |
| POST | `/api/contacts/:id/notes` | Ajouter note contact |
| DELETE | `/api/contacts/:id/notes/:noteId` | Supprimer note contact |

---

## Validation

- **Content** : requis, 1-2000 caractères
- **Type** : uniquement 'impaye' ou 'contact'
- **Note ID** : format valide (note_xxxx)

---

## Gestion des Erreurs

| Code | Message | Action |
|------|---------|--------|
| 401 | Token expiré | Redirection /login |
| 404 | Contact/Impayé non trouvé | Toast erreur |
| 404 | Note non trouvée | Toast erreur |
| 400 | Contenu requis | Toast validation |
| 500 | Erreur serveur | Toast erreur + log |
