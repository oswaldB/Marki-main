# Workflow : Sauvegarder l'édition (PouchDB)

## Écran
`relances-calendrier.html`

## Élément déclencheur
Bouton avec `@click="saveEdit()"`

## Action
Enregistrer les modifications de la relance dans PouchDB

## Description
- Valide les modifications
- Met à jour la relance dans PouchDB
- Synchronise avec CouchDB
- Rafraîchit le calendrier

## Data Model
**Page Function:** `relancesCalendrierPage()`

**Stores Alpine.js:**
- $store.ui

**Données (depuis PouchDB):**
- `relancesProgrammees` - relances depuis PouchDB
- `currentDate`
- `viewMode`
- `selectedDate`
- `relancesDuJour`
- `editingItem` - relance en cours d'édition
- `db` - instance PouchDB

**États UI:**
- `loading`
- `error`
- `saving`

## State Changes

**Modifications:**
- `saving` ← `true` → `false`
- `error` ← message si échec
- `relancesProgrammees` ← mise à jour locale après sauvegarde

## PouchDB Operations

**Action:** Mettre à jour la relance dans PouchDB.

**Méthodes utilisées:**
1. `db.get('relance:' + id)` - Récupérer le document avec sa révision
2. Mettre à jour les champs modifiés
3. `db.put(doc)` - Sauvegarder le document modifié

**Sync:** La modification est automatiquement synchronisée avec CouchDB.

## Organisation des fichiers

```
frontend/
└── app/
    └── relances-calendrier/
        ├── index.html
        ├── components/
        │   └── (composants partagés)
        └── js/
            └── save-edit.js
```

### Fichier principal
- **HTML** : `frontend/app/relances-calendrier/index.html`
- **Point d'entrée** : Initialise la page Alpine.js avec PouchDB

### Fichier workflow
- **JS** : `frontend/app/relances-calendrier/js/save-edit.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/relances-calendrier/js/save-edit.js
export async function saveEdit() {
  // Implementation avec PouchDB
}
```

## Implementation (PouchDB)

```javascript
async saveEdit() {
  // 1. Validate
  if (!this.validateForm()) return;
  
  // 2. Set saving state
  this.saving = true;
  this.error = null;
  
  try {
    // 3. Récupérer le document depuis PouchDB avec sa révision
    const doc = await db.get('relance:' + this.editingItem.id);
    
    // 4. Mettre à jour les champs
    doc.objet = this.editingItem.objet;
    doc.corps = this.editingItem.corps;
    doc.date_envoi_programmee = this.editingItem.date_envoi;
    doc.updated_at = new Date().toISOString();
    
    // 5. Sauvegarder dans PouchDB
    const response = await db.put(doc);
    // response: { ok: true, id: 'relance:...', rev: '2-xxx...' }
    
    // 6. Mettre à jour le calendrier local
    const index = this.relancesProgrammees.findIndex(
      r => r._id === 'relance:' + this.editingItem.id
    );
    if (index !== -1) {
      this.relancesProgrammees[index] = { ...doc, _rev: response.rev };
    }
    
    // 7. Regrouper par jour
    this.groupRelancesByDay();
    
    // 8. Close modal
    this.selectedRelance = null;
    this.editingItem = null;
    
    // 9. Notify
    this.toast('Modifications sauvegardées', 'success');
    
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

validateForm() {
  if (!this.editingItem.objet?.trim()) {
    this.error = 'L\'objet est obligatoire';
    return false;
  }
  if (!this.editingItem.corps?.trim()) {
    this.error = 'Le corps est obligatoire';
    return false;
  }
  if (!this.editingItem.date_envoi) {
    this.error = 'La date d\'envoi est obligatoire';
    return false;
  }
  return true;
}
```

---

## Migration depuis l'ancienne API

| Aspect | Avant (API) | Après (PouchDB) |
|--------|-------------|-----------------|
| Requête | `PUT /api/relances/:id` | `db.get()` puis `db.put()` |
| Payload | `{ objet, corps, date_envoi, statut, updated_at }` | Modification directe du doc |
| Réponse | `ApiResponse<Relance>` | `{ ok, id, rev }` |
| Gestion conflits | Backend | Détection `_rev` côté client |
| Latence | ~100-300ms | ~10-50ms (local) |
| Offline | ❌ Impossible | ✅ Fonctionne offline, sync reportée |
