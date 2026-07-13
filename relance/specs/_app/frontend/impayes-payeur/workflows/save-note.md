# Workflow : Sauvegarder une note payeur

## Écran
`impayes-payeur.html`

## Élément déclencheur
Bouton avec `@click="saveNote(payeur.id)"`

## Action
Ajouter une note à un payeur (historique de suivi client)

## Description
- Ajoute une nouvelle note dans le tableau `notes` du contact
- Chaque note contient : contenu, auteur, date
- L'historique des notes est conservé (pas d'écrasement)

## Data Model

**Page Function:** `impayesPayeurPage()`

**Données:**
- `payeurs` - liste des payeurs avec leurs impayés
- `selectedPayeur` - payeur en cours d'édition
- `noteContent` - contenu de la nouvelle note

**Champs modifiés dans `contacts`:**
- `notes` ← tableau avec nouvelle note ajoutée
- `updated_at` ← date actuelle

**Structure d'une Note:**
```javascript
{
  id: string,              // note_{timestamp}_{random}
  content: string,         // Contenu textuel
  created_by: string,      // ID utilisateur
  created_by_name: string, // Nom utilisateur (dénormalisé)
  created_at: string       // ISO 8601
}
```

**États UI:**
- `loading`
- `error`
- `noteContent` - saisie utilisateur
- `showNoteModal`

## State Changes

**Modifications:**
- `contacts[n].notes` ← push nouvelle note
- `contacts[n].updated_at` ← date

## API Calls

**Endpoint:** `PUT /api/contacts/:id`

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

**Table:** `contacts`

**Champ modifié:** `notes` (array)

**Response:** `ApiResponse<Contact>`



## Organisation des fichiers

```
frontend/
└── app/
    └── impayes-payeur/
        ├── index.html
        ├── components/
        │   └── (composants partagés)
        └── js/
            └── save-note.js
```

### Fichier principal
- **HTML** : `frontend/app/impayes-payeur/index.html`
- **Point d'entrée** : Initialise la page Alpine.js

### Fichier workflow
- **JS** : `frontend/app/impayes-payeur/js/save-note.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/impayes-payeur/js/save-note.js
export function saveNote() {
  // Implementation du workflow
}
```

## Implementation

```javascript
async saveNote(payeurId, content) {
  // 1. Validate
  if (!content.trim()) {
    Alpine.store('ui').addToast('La note ne peut pas être vide', 'error');
    return;
  }
  
  // 2. Set saving state
  this.loading = true;
  this.error = null;
  
  try {
    // 3. Get current payeur (contact)
    const payeur = this.payeurs.find(item => item.id === payeurId);
    if (!payeur) throw new Error('Payeur non trouvé');
    
    // 4. Create new note
    const newNote = {
      id: `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      content: content.trim(),
      created_by: Alpine.store('auth').user.id,
      created_by_name: Alpine.store('auth').user.name,
      created_at: new Date().toISOString()
    };
    
    // 5. Merge with existing notes
    const updatedNotes = [...(payeur.notes || []), newNote];
    
    // 6. Call API
    const response = await fetch(`/api/contacts/${payeurId}`, {
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
    const index = this.payeurs.findIndex(item => item.id === payeurId);
    if (index !== -1) {
      this.payeurs[index].notes = updatedNotes;
      this.payeurs[index].updated_at = data.data.updated_at;
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
  const payeur = this.selectedPayeur;
  if (!payeur || !payeur.notes) return [];
  
  // Tri par date décroissante (plus récente en premier)
  return [...payeur.notes].sort((a, b) => 
    new Date(b.created_at) - new Date(a.created_at)
  );
}
```

## Exemple YAML stocké

```yaml
# contacts/contact_001.yml
id: "contact_001"
type: "contact"
nom: "Dupont"
prenom: "Marie"
email: "marie.dupont@client.fr"
# ... autres champs ...
notes:
  - id: "note_1690123456789_abc123"
    content: "Promesse de paiement pour la semaine prochaine"
    created_by: "user_001"
    created_by_name: "Jean Martin"
    created_at: "2026-07-10T10:00:00Z"
  - id: "note_1690123678901_def456"
    content: "Client injoignable par téléphone"
    created_by: "user_002"
    created_by_name: "Alice Dupont"
    created_at: "2026-07-08T14:30:00Z"
created_at: "2026-06-01T09:00:00Z"
updated_at: "2026-07-10T10:00:00Z"
```

## Notes

- Les notes sont **ajoutées** (pas remplacées) - historique complet conservé
- Chaque note a un ID unique pour pouvoir être supprimée individuellement si besoin
- L'auteur est dénormalisé (`created_by_name`) pour affichage rapide sans jointure
- Tri par défaut : du plus récent au plus ancien
