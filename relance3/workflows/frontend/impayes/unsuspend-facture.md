# Workflow : Réactiver une facture (PouchDB)

## Écran
`impayes.html`

## Élément déclencheur
Bouton avec `@click="unsuspendFacture(facture)"`

## Action
Réactiver une facture impayée suspendue

## Description
- Réinitialise les champs de suspension dans le document PouchDB
- La facture redevient visible dans la liste normale
- La modification est synchronisée avec CouchDB
- Régénère les relances si séquence attribuée (via changes listener)

## Data Model

**Page Function:** `impayesPage()`

**Données (depuis PouchDB):**
- `impayes` - liste des impayés
- `db` - instance PouchDB

**Champs modifiés dans le document PouchDB:**
- `is_suspended` ← `false` (ou `is_blacklisted` ← `0`)
- `suspended_at` ← `null`
- `suspension_motif` ← `null`

**États UI:**
- `loading`
- `error`

## State Changes

**Modifications:**
- `impayes[n].is_suspended` ← `false`

## PouchDB Operations

**Action:** Mettre à jour le document facture dans PouchDB pour réactiver.

**Méthodes utilisées:**
1. `db.get('facture:' + factureId)` - Récupérer le document avec sa révision
2. `db.put(doc)` - Sauvegarder le document modifié

**Sync:** La modification est automatiquement synchronisée avec CouchDB.



## Organisation des fichiers

```
frontend/
└── app/
    └── impayes/
        ├── index.html
        └── js/
            └── unsuspend-facture.js
```

### Fichier workflow
- **JS** : `frontend/app/impayes/js/unsuspend-facture.js`

```javascript
// frontend/app/impayes/js/unsuspend-facture.js
export async function unsuspendFacture(factureId) {
  // Implementation avec PouchDB
}
```

## Implementation (PouchDB)

```javascript
async unsuspendFacture(id) {
  this.loading = true;
  
  try {
    // 1. Récupérer le document depuis PouchDB avec sa révision
    const doc = await db.get('facture:' + id);
    
    // 2. Réinitialiser les champs de suspension
    doc.is_suspended = false; // ou doc.is_blacklisted = 0
    doc.suspended_at = null;
    doc.suspension_motif = null;
    doc.unsuspended_at = new Date().toISOString(); // Optionnel: date de réactivation
    
    // 3. Sauvegarder dans PouchDB (crée une nouvelle révision)
    const response = await db.put(doc);
    // response: { ok: true, id: 'facture:...', rev: '3-xxx...' }
    
    // 4. Mettre à jour l'UI (le changes listener mettra aussi à jour)
    const index = this.impayes.findIndex(item => item.id === id);
    if (index !== -1) {
      this.impayes[index].is_suspended = false;
      this.impayes[index].suspended_at = null;
      this.impayes[index].suspension_motif = null;
      this.impayes[index].unsuspended_at = doc.unsuspended_at;
      this.impayes = [...this.impayes]; // Force recalcul
    }
    
    // 5. Toast de confirmation
    this.toast('Facture réactivée', 'success');
    
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
async unsuspendFactureWithRetry(id, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const doc = await db.get('facture:' + id);
      
      doc.is_suspended = false;
      doc.suspended_at = null;
      doc.suspension_motif = null;
      doc.unsuspended_at = new Date().toISOString();
      
      await db.put(doc);
      
      // Mettre à jour l'UI
      const index = this.impayes.findIndex(item => item.id === id);
      if (index !== -1) {
        this.impayes[index].is_suspended = false;
        this.impayes[index].suspended_at = null;
        this.impayes[index].suspension_motif = null;
        this.impayes[index].unsuspended_at = doc.unsuspended_at;
        this.impayes = [...this.impayes];
      }
      
      this.toast('Facture réactivée', 'success');
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
```

## Structure du document PouchDB (après réactivation)

```javascript
{
  "_id": "facture:550e8400-...",
  "_rev": "3-abc123...",  // Nouvelle révision
  "type": "facture",
  "id": "F123",
  "nfacture": "F-2024-001",
  "reste_a_payer": 1500.00,
  "statut": "impaye",
  "is_suspended": false,
  "suspended_at": null,
  "suspension_motif": null,
  "unsuspended_at": "2026-07-21T15:30:00.000Z",
  "contact_id": "contact:..."
}
```

## Régénération des relances via Changes Listener

```javascript
// Écouter les changements de réactivation
db.changes({
  since: 'now',
  live: true,
  include_docs: true
}).on('change', (change) => {
  if (change.doc.type === 'facture' && !change.doc.is_suspended && change.doc._wasSuspended) {
    // La facture a été réactivée, régénérer les relances
    this.regenerateRelances(change.doc.contact_id, change.doc.id);
  }
});

// Ou utiliser un document event pour déclencher la régénération
async regenerateRelances(contactId, factureId) {
  // Vérifier si une séquence est attribuée au contact
  const sequences = await dbSequences.find({
    selector: {
      type: { $eq: 'sequence' },
      active: { $eq: true }
    }
  });
  
  if (sequences.docs.length > 0) {
    // Créer une nouvelle relance
    const relanceDoc = {
      _id: `relance:${this.generateUUID()}`,
      type: 'relance',
      contact_id: contactId,
      facture_id: factureId,
      sequence_id: sequences.docs[0]._id,
      niveau: 1,
      statut: 'pending',
      created_at: new Date().toISOString()
    };
    
    await dbRelances.put(relanceDoc);
  }
}
```

## Notes

- La réactivation rend la facture visible dans la liste normale
- Les relances sont régénérées automatiquement via le changes listener
- Voir workflow `suspend-facture` pour suspendre

---

## Migration depuis l'ancienne API

| Aspect | Avant (API) | Après (PouchDB) |
|--------|-------------|-----------------|
| Requête | `POST /api/impayes/:id/unsuspend` | `db.get()` puis `db.put()` |
| Réponse | `{ message, relances_crees }` | `{ ok, id, rev }` |
| Régénération relances | Backend automatique | Changes listener côté client |
| Gestion conflits | Verrouillage optimiste serveur | Détection `_rev` côté client |
| Latence | ~200-500ms | ~10-50ms (local) |
| Offline | ❌ Impossible | ✅ Fonctionne offline |
