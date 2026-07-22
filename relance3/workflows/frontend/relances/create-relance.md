# Workflow : Créer une relance (PouchDB)

## Écran
`relances.html`

## Élément déclencheur
Bouton avec `@click="createRelance()"` dans le modal de nouvelle relance

## Action
Créer une nouvelle relance dans PouchDB

## Description
- Valide les données du formulaire
- Crée le document relance dans PouchDB
- La relance est synchronisée automatiquement avec CouchDB
- Rafraîchit la liste des relances
- Ferme le modal

## Data Model
**Page Function:** `relancesPage()`

**Données (depuis PouchDB):**
- `newRelance` - données du formulaire (contact_id, sequence_id, impayes_ids, etc.)
- `relances` - liste des relances existantes
- `db` - instance PouchDB

**États UI:**
- `loading`
- `error`
- `showNewRelanceModal`

## State Changes

**Modifications:**
- `loading` → `true` → `false`
- `relances` ← nouvelle relance ajoutée (le changes listener mettra aussi à jour)
- `showNewRelanceModal` → `false`

## PouchDB Operations

**Action:** Créer un nouveau document relance dans PouchDB.

**Méthodes utilisées:**
- `db.post(doc)` - Créer le document avec un ID auto-généré
- OU `db.put(doc)` si on génère l'ID manuellement

**Structure du document:**
```javascript
{
  "_id": "relance:550e8400-e29b-41d4-a716-446655440000",
  "type": "relance",
  "contact_id": "contact:abc123",
  "sequence_id": "sequence:def456",
  "impaye_ids": ["facture:imp_001", "facture:imp_002"],
  "statut": "brouillon",
  "objet": "Relance factures impayées",
  "corps": "Contenu de l'email...",
  "created_at": "2026-07-12T10:00:00Z"
}
```

**Sync:** La création est automatiquement synchronisée avec CouchDB.

## Organisation des fichiers

```
frontend/
└── app/
    └── relances/
        ├── index.html
        ├── components/
        │   └── (composants partagés)
        └── js/
            └── create-relance.js
```

### Fichier principal
- **HTML** : `frontend/app/relances/index.html`
- **Point d'entrée** : Initialise la page Alpine.js avec PouchDB

### Fichier workflow
- **JS** : `frontend/app/relances/js/create-relance.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/relances/js/create-relance.js
export async function createRelance() {
  // Implementation avec PouchDB
}
```

## Implementation (PouchDB)

```javascript
async createRelance() {
  // 1. Validate form
  if (!this.newRelance.contact_id || !this.newRelance.sequence_id) {
    this.toast('Veuillez remplir tous les champs obligatoires', 'error');
    return;
  }
  
  // 2. Set loading
  this.loading = true;
  this.error = null;
  
  try {
    // 3. Préparer le document PouchDB
    const newRelanceDoc = {
      _id: 'relance:' + this.generateUUID(),
      type: 'relance',
      contact_id: this.newRelance.contact_id,
      sequence_id: this.newRelance.sequence_id,
      impaye_ids: this.newRelance.impaye_ids || [],
      statut: 'brouillon',
      objet: this.newRelance.objet || '',
      corps: this.newRelance.corps || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // 4. Créer dans PouchDB
    const response = await db.put(newRelanceDoc);
    // response: { ok: true, id: 'relance:...', rev: '1-xxx...' }
    
    // 5. Mettre à jour l'UI (le changes listener mettra aussi à jour)
    this.relances.unshift({ ...newRelanceDoc, _rev: response.rev });
    
    // 6. Close modal
    this.showNewRelanceModal = false;
    this.newRelance = this.getInitialState();
    
    // 7. Notify
    this.toast('Relance créée avec succès', 'success');
    
  } catch (error) {
    this.error = error.message;
    this.toast(error.message, 'error');
  } finally {
    this.loading = false;
  }
}

generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

getInitialState() {
  return {
    contact_id: null,
    sequence_id: null,
    impaye_ids: [],
    objet: '',
    corps: ''
  };
}
```

## Structure du document PouchDB créé

```javascript
{
  "_id": "relance:550e8400-e29b-41d4-a716-446655440000",
  "_rev": "1-abc123...",
  "type": "relance",
  "contact_id": "contact:abc123",
  "sequence_id": "sequence:def456",
  "impaye_ids": ["facture:imp_001", "facture:imp_002"],
  "statut": "brouillon",
  "objet": "Relance factures impayées",
  "corps": "Madame, Monsieur,\n\nNous vous rappelons...",
  "created_at": "2026-07-12T10:00:00Z",
  "updated_at": "2026-07-12T10:00:00Z"
}
```

## Notes

- La relance est créée avec le statut `brouillon` par défaut
- L'utilisateur peut ensuite l'éditer avant envoi
- Voir workflow `send-relance.md` pour l'envoi effectif
- L'ID est généré côté client avec UUID pour éviter les conflits

---

## Migration depuis l'ancienne API

| Aspect | Avant (API) | Après (PouchDB) |
|--------|-------------|-----------------|
| Requête | `POST /api/relances` | `db.put(doc)` |
| ID génération | Backend auto-incrément | UUID côté client |
| Réponse | `ApiResponse<Relance>` | `{ ok, id, rev }` |
| Latence | ~100-300ms | ~10-50ms (local) |
| Offline | ❌ Impossible | ✅ Création offline, sync reportée |
