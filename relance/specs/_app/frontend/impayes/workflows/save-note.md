# Workflow : Sauvegarder une note

## Écran
`impayes.html`

## Élément déclencheur
Bouton avec `@click="saveNote()"`

## Action
Ajouter une note à un impayé (historique de suivi)

## Description
- Ajoute une nouvelle note dans le tableau `notes` de l'impayé
- Chaque note contient : contenu, auteur, date
- L'historique des notes est conservé (pas d'écrasement)

## Data Model

**Page Function:** `impayesPage()`

**Données:**
- `impayes` - liste des impayés
- `selectedImpaye` - impayé en cours d'édition
- `noteContent` - contenu de la nouvelle note

**Champs modifiés dans `impayes`:**
- `notes` ← tableau avec nouvelle note ajoutée
- `updated_at` ← date actuelle

**Structure d'une Note:**
```javascript
{
  id: string,           // note_{timestamp}_{random}
  content: string,      // Contenu textuel
  created_by: string,   // ID utilisateur
  created_by_name: string, // Nom utilisateur (dénormalisé)
  created_at: string      // ISO 8601
}
```

**États UI:**
- `loading`
- `error`
- `noteContent` - saisie utilisateur
- `showNoteModal`

## State Changes

**Modifications:**
- `impayes[n].notes` ← push nouvelle note
- `impayes[n].updated_at` ← date

## API Calls

**Endpoint:** `PUT /api/impayes/:id`

**Payload:**
```json
{
  "notes": [
    ...existingNotes,
    {
      "id": "note_1690123456789_abc123",
      "content": "Texte de la note saisie par l'utilisateur",
      "created_by": "user_001",
      "created_by_name": "Jean Dupont",
      "created_at": "2026-07-10T15:30:00Z"
    }
  ],
  "updated_at": "2026-07-10T15:30:00Z"
}
```

**Table:** `impayes`

**Champ modifié:** `notes` (array)

**Response:** `ApiResponse<Impaye>`

## Organisation des fichiers

```
frontend/
└── app/
    └── impayes/
        ├── index.html
        └── js/
            └── save-note.js
```

### Fichier workflow
- **JS** : `frontend/app/impayes/js/save-note.js`

```javascript
// frontend/app/impayes/js/save-note.js
export function saveNote() {
  // Implementation du workflow
}
```

## Implementation

```javascript
async saveNote(impayeId, content) {
  // 1. Validate
  if (!content.trim()) {
    Alpine.store('ui').addToast('La note ne peut pas être vide', 'error');
    return;
  }
  
  // 2. Set saving state
  this.loading = true;
  this.error = null;
  
  try {
    // 3. Get current impaye
    const impaye = this.impayes.find(item => item.id === impayeId);
    if (!impaye) throw new Error('Impayé non trouvé');
    
    // 4. Create new note
    const newNote = {
      id: `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      content: content.trim(),
      created_by: Alpine.store('auth').user.id,
      created_by_name: Alpine.store('auth').user.name,
      created_at: new Date().toISOString()
    };
    
    // 5. Merge with existing notes
    const updatedNotes = [...(impaye.notes || []), newNote];
    
    // 6. Call API
    const response = await fetch(`/api/impayes/${impayeId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        notes: updatedNotes,
        updated_at: new Date().toISOString()
      })
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error?.message);
    }
    
    // 7. Update local array
    const index = this.impayes.findIndex(item => item.id === impayeId);
    if (index !== -1) {
      this.impayes[index].notes = updatedNotes;
      this.impayes[index].updated_at = data.data.updated_at;
    }
    
    // 8. Close modal
    this.showNoteModal = false;
    this.noteContent = '';
    
    // 9. Notify
    Alpine.store('ui').addToast('Note ajoutée', 'success');
    
  } catch (error) {
    this.error = error.message;
    Alpine.store('ui').addToast(error.message, 'error');
  } finally {
    this.loading = false;
  }
}

// Affichage des notes (dans le template)
get sortedNotes() {
  const impaye = this.selectedImpaye;
  if (!impaye || !impaye.notes) return [];
  
  // Tri par date décroissante (plus récente en premier)
  return [...impaye.notes].sort((a, b) => 
    new Date(b.created_at) - new Date(a.created_at)
  );
}
```

## Exemple YAML stocké

```yaml
# impayes/imp_001.yml
id: "imp_001"
type: "impaye"
# ... autres champs ...
notes:
  - id: "note_1690123456789_abc123"
    content: "Client contacté par téléphone, promesse de paiement pour la semaine prochaine"
    created_by: "user_001"
    created_by_name: "Marie Martin"
    created_at: "2026-07-10T10:00:00Z"
  - id: "note_1690123678901_def456"
    content: "Relance email envoyée, pas de réponse"
    created_by: "user_002"
    created_by_name: "Jean Dupont"
    created_at: "2026-07-08T14:30:00Z"
created_at: "2026-07-01T09:00:00Z"
updated_at: "2026-07-10T10:00:00Z"
```

## Notes

- Les notes sont **ajoutées** (pas remplacées) - historique complet conservé
- Chaque note a un ID unique pour pouvoir être supprimée individuellement si besoin
- L'auteur est dénormalisé (`created_by_name`) pour affichage rapide sans jointure
- Tri par défaut : du plus récent au plus ancien
