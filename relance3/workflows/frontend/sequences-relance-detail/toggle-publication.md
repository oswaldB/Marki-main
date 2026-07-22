# Workflow : Publier/Dépublier séquence (PouchDB)

## Écran
`sequences-relance-detail.html`

## Élément déclencheur
Bouton avec `@click="togglePublication()"`

## Action
Basculer le statut de publication de la séquence

## Description
- Publie ou dépublie la séquence
- Une séquence publiée est active
- Une séquence dépubliée est en brouillon
- Sauvegarde immédiate dans PouchDB

## Data Model
**Page Function:** `sequencesRelanceDetailPage()`

**Stores Alpine.js:**
- $store.ui

**Données (depuis PouchDB):**
- `sequence` - séquence depuis PouchDB
- `etapes`
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
- `sequence.publiee` ← toggled
- Sauvegarde immédiate dans PouchDB

## PouchDB Operations

**Action:** Basculer le statut de publication de la séquence dans PouchDB.

**Méthodes utilisées:**
1. `db.get('sequence:' + id)` - Récupérer le document avec sa révision
2. Toggle `publiee`
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
            └── toggle-publication.js
```

### Fichier principal
- **HTML** : `frontend/app/sequences-relance-detail/index.html`
- **Point d'entrée** : Initialise la page Alpine.js avec PouchDB

### Fichier workflow
- **JS** : `frontend/app/sequences-relance-detail/js/toggle-publication.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/sequences-relance-detail/js/toggle-publication.js
export async function togglePublication() {
  // Implementation avec PouchDB
}
```

## Implementation (PouchDB)

```javascript
async togglePublication() {
  this.loading = true;
  
  try {
    // 1. Récupérer le document depuis PouchDB avec sa révision
    const doc = await db.get('sequence:' + this.sequenceId);
    
    // 2. Toggle le statut de publication
    doc.publiee = !doc.publiee;
    doc.updated_at = new Date().toISOString();
    
    // 3. Sauvegarder dans PouchDB
    const response = await db.put(doc);
    
    // 4. Mettre à jour l'UI
    this.sequence = { ...doc, _rev: response.rev };
    
    this.toast(
      doc.publiee ? 'Séquence publiée' : 'Séquence dépubliée',
      'success'
    );
    
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

- **Sauvegarde immédiate** : Le statut est persisté dans PouchDB immédiatement
- **Synchronisation** : Les changements sont synchronisés avec CouchDB
- **Feedback utilisateur** : Toast de confirmation avec le nouvel état

---

## Migration depuis l'ancienne architecture

| Aspect | Avant | Après (PouchDB) |
|--------|-------|-----------------|
| Action | Côté client uniquement | `db.get()` + `db.put()` |
| Persistance | Non persistante | Persistante dans PouchDB |
| Latence | Instantanée | ~10-50ms (local) |
| Offline | ❌ Impossible | ✅ Fonctionne offline |
