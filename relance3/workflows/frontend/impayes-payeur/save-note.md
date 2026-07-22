# Workflow : Sauvegarder une note payeur (PouchDB)

## Écran
`impayes-payeur.html`

## Élément déclencheur
Bouton avec `@click="saveNote(payeur.id)"`

## Action
Ajouter une note à un payeur (historique de suivi client) via PouchDB

## Description
- Ajoute une nouvelle note dans le tableau `notes` du document contact PouchDB
- Chaque note contient : contenu, auteur, date
- L'historique des notes est conservé (pas d'écrasement)
- La modification est synchronisée automatiquement avec CouchDB

## Data Model

**Page Function:** `impayesPayeurPage()`

**Données (depuis PouchDB):**
- `payeurs` - liste des payeurs avec leurs impayés
- `selectedPayeur` - payeur en cours d'édition
- `noteContent` - contenu de la nouvelle note
- `dbContacts` - instance PouchDB

**Champs modifiés dans le document PouchDB (contact):**
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

## PouchDB Operations

**Action:** Mettre à jour le document contact dans PouchDB avec la nouvelle note.

**Méthodes utilisées:**
1. `dbContacts.get('contact:' + payeurId)` - Récupérer le document avec sa révision
2. Ajouter la note au tableau `notes`
3. `dbContacts.put(doc)` - Sauvegarder le document modifié

**Sync:** La modification est automatiquement synchronisée avec CouchDB.

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
- **Point d'entrée** : Initialise la page Alpine.js avec PouchDB

### Fichier workflow
- **JS** : `frontend/app/impayes-payeur/js/save-note.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/impayes-payeur/js/save-note.js
export async function saveNote() {
  // Implementation avec PouchDB
}
```

## Implementation (PouchDB)

```javascript
async saveNote(payeurId, content) {
  // 1. Validate
  if (!content.trim()) {
    this.toast('La note ne peut pas être vide', 'error');
    return;
  }
  
  // 2. Set saving state
  this.loading = true;
  this.error = null;
  
  try {
    // 3. Récupérer le document contact depuis PouchDB avec sa révision
    const doc = await dbContacts.get('contact:' + payeurId);
    
    // 4. Créer la nouvelle note
    const newNote = {
      id: `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      content: content.trim(),
      created_by: this.user?.id,
      created_by_name: this.user?.name || 'Moi',
      created_at: new Date().toISOString()
    };
    
    // 5. Ajouter la note au document
    if (!doc.notes) doc.notes = [];
    doc.notes.unshift(newNote);
    doc.updated_at = new Date().toISOString();
    
    // 6. Sauvegarder dans PouchDB (crée une nouvelle révision)
    const response = await dbContacts.put(doc);
    // response: { ok: true, id: 'contact:...', rev: '2-xxx...' }
    
    // 7. Mettre à jour l'UI (le changes listener mettra aussi à jour)
    const payeurIndex = this.payeurs.findIndex(item => item.id === payeurId);
    if (payeurIndex !== -1) {
      this.payeurs[payeurIndex].notes = doc.notes;
      this.payeurs[payeurIndex].updated_at = doc.updated_at;
      this.payeurs = [...this.payeurs]; // Force recalcul
    }
    
    // 8. Close modal
    this.showNoteModal = false;
    this.noteContent = '';
    
    // 9. Notify
    this.toast('Note ajoutée', 'success');
    
  } catch (error) {
    if (error.status === 409) {
      // Conflit: recharger et réessayer
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

// Gestion des conflits avec retry
async saveNoteWithRetry(payeurId, content, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const doc = await dbContacts.get('contact:' + payeurId);
      
      const newNote = {
        id: `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        content: content.trim(),
        created_by: this.user?.id,
        created_by_name: this.user?.name || 'Moi',
        created_at: new Date().toISOString()
      };
      
      if (!doc.notes) doc.notes = [];
      doc.notes.unshift(newNote);
      doc.updated_at = new Date().toISOString();
      
      await dbContacts.put(doc);
      
      // Mettre à jour l'UI
      const payeurIndex = this.payeurs.findIndex(item => item.id === payeurId);
      if (payeurIndex !== -1) {
        this.payeurs[payeurIndex].notes = doc.notes;
        this.payeurs = [...this.payeurs];
      }
      
      this.showNoteModal = false;
      this.noteContent = '';
      this.toast('Note ajoutée', 'success');
      return;
      
    } catch (error) {
      if (error.status === 409 && attempt < maxRetries) {
        // Attendre un peu avant de réessayer
        await new Promise(r => setTimeout(r, 100 * attempt));
        continue;
      }
      throw error;
    }
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

## Structure du document PouchDB (contact avec notes)

```javascript
{
  "_id": "contact:550e8400-...",
  "_rev": "2-abc123...",  // Nouvelle révision
  "type": "contact",
  "id": "contact_001",
  "nom": "Dupont",
  "prenom": "Marie",
  "email": "marie.dupont@client.fr",
  "notes": [
    {
      "id": "note_1690123456789_abc123",
      "content": "Promesse de paiement pour la semaine prochaine",
      "created_by": "user_001",
      "created_by_name": "Jean Martin",
      "created_at": "2026-07-10T10:00:00Z"
    },
    {
      "id": "note_1690123678901_def456",
      "content": "Client injoignable par téléphone",
      "created_by": "user_002",
      "created_by_name": "Alice Dupont",
      "created_at": "2026-07-08T14:30:00Z"
    }
  ],
  "created_at": "2026-06-01T09:00:00Z",
  "updated_at": "2026-07-10T10:00:00Z"
}
```

## Notes

- Les notes sont **ajoutées** (pas remplacées) - historique complet conservé
- Chaque note a un ID unique pour pouvoir être supprimée individuellement si besoin
- L'auteur est dénormalisé (`created_by_name`) pour affichage rapide sans jointure
- Tri par défaut : du plus récent au plus ancien
- **Gestion des conflits :** Si deux utilisateurs modifient simultanément, PouchDB détecte le conflit (status 409) et il faut réessayer

---

## Migration depuis l'ancienne API

| Aspect | Avant (API) | Après (PouchDB) |
|--------|-------------|-----------------|
| Requête | `PUT /api/contacts/:id` | `dbContacts.get()` puis `dbContacts.put()` |
| Payload | `{ notes: [...], updated_at: ... }` | Modification directe du doc |
| Réponse | `ApiResponse<Contact>` | `{ ok, id, rev }` |
| Gestion conflits | Verrouillage optimiste côté serveur | Détection `_rev` côté client |
| Latence | ~100-500ms | ~10-50ms (local) |
| Offline | ❌ Impossible | ✅ Fonctionne offline, sync reportée |
