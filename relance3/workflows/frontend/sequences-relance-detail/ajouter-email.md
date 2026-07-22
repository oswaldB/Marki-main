# Workflow : Ajouter un email (PouchDB)

## Écran
`sequences-relance-detail.html`

## Élément déclencheur
Bouton avec `@click="ajouterEmail()"`

## Action
Ajouter un nouvel email à la séquence dans PouchDB

## Description
- Crée un nouvel email vide dans la séquence
- Ajoute à la fin de la liste des étapes
- Ouvre l'édition du nouvel email
- Synchronise avec CouchDB

## Data Model
**Page Function:** `sequencesRelanceDetailPage()`

**Stores Alpine.js:**
- $store.ui

**Données (depuis PouchDB):**
- `sequence` - séquence depuis PouchDB
- `etapes` - étapes/emails de la séquence
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
- `etapes` ← nouvel email ajouté
- `hasChanges` ← `true`
- `showEtapeModal` ← `true` (optionnel)

## PouchDB Operations

**Action:** Ajouter un nouvel email au document séquence dans PouchDB.

**Méthodes utilisées:**
1. `db.get('sequence:' + sequenceId)` - Récupérer le document avec sa révision
2. Ajouter le nouvel email au tableau `emails`
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
            └── ajouter-email.js
```

### Fichier principal
- **HTML** : `frontend/app/sequences-relance-detail/index.html`
- **Point d'entrée** : Initialise la page Alpine.js avec PouchDB

### Fichier workflow
- **JS** : `frontend/app/sequences-relance-detail/js/ajouter-email.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/sequences-relance-detail/js/ajouter-email.js
export async function ajouterEmail() {
  // Implementation avec PouchDB
}
```

## Implementation (PouchDB)

```javascript
async ajouterEmail() {
  this.loading = true;
  
  try {
    // 1. Récupérer la séquence depuis PouchDB avec sa révision
    const doc = await db.get('sequence:' + this.sequenceId);
    
    // 2. Créer le nouvel email
    const nouvelEmail = {
      email_index: (doc.emails?.length || 0) + 1,
      delai: 7, // délai par défaut en jours
      objet: '',
      corps: '',
      actif: true
    };
    
    // 3. Ajouter au tableau emails
    if (!doc.emails) doc.emails = [];
    doc.emails.push(nouvelEmail);
    doc.updated_at = new Date().toISOString();
    
    // 4. Sauvegarder dans PouchDB
    const response = await db.put(doc);
    // response: { ok: true, id: 'sequence:...', rev: '2-xxx...' }
    
    // 5. Mettre à jour l'UI
    this.etapes = [...doc.emails];
    this.editingEtape = nouvelEmail;
    this.showEtapeModal = true;
    this.hasChanges = false; // sauvegardé
    
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

- **Nouvel email** : Créé avec des valeurs par défaut (délai 7 jours, vide)
- **Index auto-incrémenté** : Basé sur la longueur actuelle du tableau
- **Édition immédiate** : Ouvre le modal d'édition après création
- **Synchronisation** : La séquence est immédiatement synchronisée avec CouchDB

---

## Migration depuis l'ancienne architecture

| Aspect | Avant (API) | Après (PouchDB) |
|--------|-------------|-----------------|
| Requête | `POST /api/sequences/:id/emails` | `db.get()` puis `db.put()` |
| Payload | `{ email_index, delai, objet, corps }` | Ajout direct au tableau |
| Réponse | `ApiResponse<Sequence>` | `{ ok, id, rev }` |
| Gestion conflits | Backend | Détection `_rev` côté client |
| Latence | ~100-300ms | ~10-50ms (local) |
| Offline | ❌ Impossible | ✅ Fonctionne offline, sync reportée |
