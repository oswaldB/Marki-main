# Workflow : Sauvegarder une note

## Écran
`impayes.html`

## Élément déclencheur
Bouton avec `@click="saveNote()"`

## Action
Ajouter une note à un impayé (historique de suivi)

## Description
- Ajoute une nouvelle note dans le tableau `notes` du document PouchDB
- Chaque note contient : contenu, auteur, date
- L'historique des notes est conservé (pas d'écrasement)
- La modification est synchronisée automatiquement avec CouchDB

## Data Model

**Page Function:** `impayesPage()`

**Données (depuis PouchDB):**
- `impayes` - liste des impayés
- `selectedImpaye` - impayé en cours d'édition
- `noteContent` - contenu de la nouvelle note

**Champs modifiés dans PouchDB:**
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

## PouchDB Operations

**Action:** Mettre à jour le document facture dans PouchDB avec la nouvelle note.

**Méthodes utilisées:**
1. `db.get('facture:' + impayeId)` - Récupérer le document avec sa révision
2. `db.put(doc)` - Sauvegarder le document modifié

**Sync:** La modification est automatiquement synchronisée avec CouchDB.



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
export async function saveNote() {
  // Implementation avec PouchDB
}
```

## Implementation (PouchDB)

```javascript
async saveNote(impayeId, content) {
  // 1. Validate
  if (!content.trim()) {
    this.toast('La note ne peut pas être vide', 'error');
    return;
  }
  
  // 2. Set saving state
  this.loading = true;
  this.error = null;
  
  try {
    // 3. Récupérer le document depuis PouchDB avec sa révision
    const doc = await db.get('facture:' + impayeId);
    
    // 4. Créer la nouvelle note
    const newNote = {
      id: `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      content: content.trim(),
      created_by: this.user?.id,
      created_by_name: this.user?.name,
      created_at: new Date().toISOString()
    };
    
    // 5. Ajouter la note au document
    if (!doc.notes) {
      doc.notes = [];
    }
    doc.notes.push(newNote);
    doc.updated_at = new Date().toISOString();
    
    // 6. Sauvegarder dans PouchDB (crée une nouvelle révision)
    const response = await db.put(doc);
    // response: { ok: true, id: 'facture:...', rev: '2-xxx...' }
    
    // 7. Mettre à jour l'UI (le changes listener mettra aussi à jour)
    const index = this.impayes.findIndex(item => item.id === impayeId);
    if (index !== -1) {
      this.impayes[index].notes = doc.notes;
      this.impayes[index].updated_at = doc.updated_at;
      this.impayes = [...this.impayes]; // Force recalcul
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
async saveNoteWithRetry(impayeId, content, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const doc = await db.get('facture:' + impayeId);
      
      const newNote = {
        id: `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        content: content.trim(),
        created_by: this.user?.id,
        created_by_name: this.user?.name,
        created_at: new Date().toISOString()
      };
      
      if (!doc.notes) doc.notes = [];
      doc.notes.push(newNote);
      doc.updated_at = new Date().toISOString();
      
      await db.put(doc);
      
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
  const impaye = this.selectedImpaye;
  if (!impaye || !impaye.notes) return [];
  
  // Tri par date décroissante (plus récente en premier)
  return [...impaye.notes].sort((a, b) => 
    new Date(b.created_at) - new Date(a.created_at)
  );
}
```

## Structure du document PouchDB (facture avec notes)

```javascript
{
  "_id": "facture:550e8400-...",
  "_rev": "3-abc123...",  // Révision mise à jour
  "type": "facture",
  "id": "F123",
  "nfacture": "F-2024-001",
  "reste_a_payer": 1500.00,
  "statut": "impaye",
  "notes": [
    {
      "id": "note_1690123456789_abc123",
      "content": "Client contacté par téléphone, promesse de paiement pour la semaine prochaine",
      "created_by": "user_001",
      "created_by_name": "Marie Martin",
      "created_at": "2026-07-10T10:00:00Z"
    },
    {
      "id": "note_1690123678901_def456",
      "content": "Relance email envoyée, pas de réponse",
      "created_by": "user_002",
      "created_by_name": "Jean Dupont",
      "created_at": "2026-07-08T14:30:00Z"
    }
  ],
  "created_at": "2026-07-01T09:00:00Z",
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
| Requête | `PUT /api/impayes/:id` | `db.get()` puis `db.put()` |
| Payload | `{ notes: [...], updated_at: ... }` | Modification directe du doc |
| Réponse | `ApiResponse<Impaye>` | `{ ok, id, rev }` |
| Gestion conflits | Verrouillage optimiste côté serveur | Détection `_rev` côté client |
| Sync | Non applicable | Automatique avec CouchDB |
| Latence | ~100-500ms | ~10-50ms (local) |
| Offline | ❌ Impossible | ✅ Fonctionne offline, sync reportée |
