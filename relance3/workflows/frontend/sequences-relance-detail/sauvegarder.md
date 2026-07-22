# Workflow : Sauvegarder séquence (PouchDB)

## Écran
`sequences-relance-detail.html`

## Élément déclencheur
Bouton avec `@click="sauvegarder()"`

## Action
Enregistrer les modifications de la séquence dans PouchDB

## Description
- Persiste tous les changements dans PouchDB
- Synchronise avec CouchDB
- Affiche confirmation

## Data Model
**Page Function:** `sequencesRelanceDetailPage()`

**Stores Alpine.js:**
- $store.ui

**Données (depuis PouchDB):**
- `sequence` - séquence depuis PouchDB
- `etapes` - étapes modifiées
- `modeles` - modèles modifiés
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
- `saving` ← `true` → `false`
- `hasChanges` ← `false`
- `sequence` ← mise à jour avec révision

## PouchDB Operations

**Action:** Mettre à jour la séquence complète dans PouchDB.

**Méthodes utilisées:**
1. `db.get('sequence:' + id)` - Récupérer le document avec sa révision
2. Mettre à jour les champs modifiés
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
            └── sauvegarder.js
```

### Fichier principal
- **HTML** : `frontend/app/sequences-relance-detail/index.html`
- **Point d'entrée** : Initialise la page Alpine.js avec PouchDB

### Fichier workflow
- **JS** : `frontend/app/sequences-relance-detail/js/sauvegarder.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/sequences-relance-detail/js/sauvegarder.js
export async function sauvegarder() {
  // Implementation avec PouchDB
}
```

## Implementation (PouchDB)

```javascript
async sauvegarder() {
  this.saving = true;
  this.error = null;
  
  try {
    // 1. Récupérer le document depuis PouchDB avec sa révision
    const doc = await db.get('sequence:' + this.sequenceId);
    
    // 2. Mettre à jour les champs
    doc.nom = this.sequence.nom;
    doc.validation_obligatoire = this.sequence.validation_obligatoire;
    doc.emails = this.etapes; // tableau des emails
    doc.regles_attribution = this.reglesAttribution;
    doc.modeles_email = this.modeles;
    doc.updated_at = new Date().toISOString();
    
    // 3. Sauvegarder dans PouchDB
    const response = await db.put(doc);
    // response: { ok: true, id: 'sequence:...', rev: '2-xxx...' }
    
    // 4. Mettre à jour l'état local
    this.sequence = { ...doc, _rev: response.rev };
    this.hasChanges = false;
    
    // 5. Notify
    this.toast('Séquence sauvegardée', 'success');
    
  } catch (error) {
    if (error.status === 409) {
      this.error = 'Conflit de version, veuillez réessayer';
      this.toast('Conflit de version', 'error');
    } else {
      this.error = error.message;
      this.toast(error.message, 'error');
    }
  } finally {
    this.saving = false;
  }
}
```

## Données sauvegardées dans PouchDB

- `sequence.nom` : Nom de la séquence
- `sequence.validation_obligatoire` : Booléen
- `sequence.emails[]` : Tableau des emails avec leurs scénarios
  - `email_index` (number) : Position de l'email dans la séquence
  - `delai` (number) : Délai en jours
  - `objet` (string) : Template d'objet
  - `corps` (string) : Template HTML du corps
  - `scenarios[]` (array) : Les 4 scénarios
- `sequence.regles_attribution` : Règles d'attribution
- `sequence.modeles_email` : Modèles d'email

---

## Migration depuis l'ancienne API

| Aspect | Avant (API) | Après (PouchDB) |
|--------|-------------|-----------------|
| Requête | `PUT /api/sequences/:id` | `db.get()` puis `db.put()` |
| Payload | `{ nom, validationObligatoire, emails, reglesAttribution }` | Modification directe du doc |
| Réponse | `{ success, sequence, message }` | `{ ok, id, rev }` |
| Gestion conflits | Backend | Détection `_rev` côté client |
| Latence | ~200-500ms | ~10-50ms (local) |
| Offline | ❌ Impossible | ✅ Fonctionne offline, sync reportée |
