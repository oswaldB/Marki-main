# Workflow : Suspendre la facture (PouchDB)

## Écran
`impayes-detail.html`

## Élément déclencheur
Bouton avec `@click="showEditFactureModal = true"`

## Action
Afficher le formulaire de suspension et suspendre la facture via PouchDB

## Description
- Ouvre le formulaire de suspension
- Permet de saisir un motif
- Met à jour le statut en "suspendu" dans le document PouchDB
- Synchronise automatiquement avec CouchDB

## Data Model
**Page Function:** `impayesDetailPage()`

**Stores Alpine.js:**
- $store.ui

**Données (depuis PouchDB):**
- `facture` - document PouchDB de la facture
- `historiquePaiements`
- `historiqueRelances`
- `activeTab`
- `db` - instance PouchDB

**États UI:**
- `loading`
- `error`
- `showMarkAsPaidModal`
- `showAddRelanceModal`
- `showEditFactureModal`

## State Changes

**Modifications:**
- `facture.statut` ← "suspendue"
- `facture.is_suspended` ← true
- `facture.suspension_motif` ← motif saisi
- `facture.suspended_at` ← date actuelle

## PouchDB Operations

**Action:** Mettre à jour le document facture dans PouchDB avec les champs de suspension.

**Méthodes utilisées:**
1. `db.get('facture:' + id)` - Récupérer le document avec sa révision
2. Modifier les champs de suspension
3. `db.put(doc)` - Sauvegarder le document modifié

**Sync:** La modification est automatiquement synchronisée avec CouchDB.

## Organisation des fichiers

```
frontend/
└── app/
    └── impayes-detail/
        ├── index.html
        ├── components/
        │   └── (composants partagés)
        └── js/
            └── suspend-facture.js
```

### Fichier principal
- **HTML** : `frontend/app/impayes-detail/index.html`
- **Point d'entrée** : Initialise la page Alpine.js avec PouchDB

### Fichier workflow
- **JS** : `frontend/app/impayes-detail/js/suspend-facture.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/impayes-detail/js/suspend-facture.js
export async function suspendFacture() {
  // Implementation avec PouchDB
}
```

## Implementation (PouchDB)

```javascript
async suspendFacture(id, motif) {
  // 1. Validate
  if (!motif.trim()) {
    this.toast('Le motif est obligatoire', 'error');
    return;
  }
  
  // 2. Set loading
  this.loading = true;
  
  try {
    // 3. Récupérer le document depuis PouchDB avec sa révision
    const doc = await db.get('facture:' + id);
    
    // 4. Modifier les champs de suspension
    doc.statut = 'suspendue';
    doc.is_suspended = true;
    doc.suspension_motif = motif.trim();
    doc.suspended_at = new Date().toISOString();
    doc.updated_at = new Date().toISOString();
    
    // 5. Sauvegarder dans PouchDB (crée une nouvelle révision)
    const response = await db.put(doc);
    // response: { ok: true, id: 'facture:...', rev: '2-xxx...' }
    
    // 6. Update local (le changes listener mettra aussi à jour)
    this.facture.statut = 'suspendue';
    this.facture.is_suspended = true;
    this.facture.suspension_motif = motif.trim();
    this.facture.suspended_at = doc.suspended_at;
    this.facture._rev = response.rev;
    
    // 7. Mettre à jour dans la liste si présent
    const index = this.factures.findIndex(item => item.id === id);
    if (index !== -1) {
      this.factures[index].statut = 'suspendue';
      this.factures[index].is_suspended = true;
    }
    
    // 8. Fermer le modal
    this.showEditFactureModal = false;
    
    // 9. Notify
    this.toast('Facture suspendue', 'success');
    
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
async suspendFactureWithRetry(id, motif, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const doc = await db.get('facture:' + id);
      
      doc.statut = 'suspendue';
      doc.is_suspended = true;
      doc.suspension_motif = motif.trim();
      doc.suspended_at = new Date().toISOString();
      doc.updated_at = new Date().toISOString();
      
      await db.put(doc);
      
      // Mettre à jour l'UI
      this.facture.statut = 'suspendue';
      this.facture.is_suspended = true;
      this.facture.suspension_motif = motif.trim();
      
      // Mettre à jour dans la liste
      const index = this.factures.findIndex(item => item.id === id);
      if (index !== -1) {
        this.factures[index].statut = 'suspendue';
        this.factures[index].is_suspended = true;
      }
      
      this.showEditFactureModal = false;
      this.toast('Facture suspendue', 'success');
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

## Structure du document PouchDB (après suspension)

```javascript
{
  "_id": "facture:550e8400-...",
  "_rev": "2-abc123...",  // Nouvelle révision
  "type": "facture",
  "id": "FAC-2024-001",
  "nfacture": "F-2024-001",
  "statut": "suspendue",
  "is_suspended": true,
  "suspension_motif": "Client en litige",
  "suspended_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z",
  ...
}
```

## Annulation des relances via Changes Listener (optionnel)

```javascript
// Écouter les changements de suspension
db.changes({
  since: 'now',
  live: true,
  include_docs: true
}).on('change', (change) => {
  if (change.doc.type === 'facture' && change.doc.is_suspended) {
    // Annuler les relances en cours pour ce contact
    this.cancelRelancesForContact(change.doc.contact_id);
  }
});
```

---

## Migration depuis l'ancienne API

| Aspect | Avant (API) | Après (PouchDB) |
|--------|-------------|-----------------|
| Requête | `POST /api/impayes/{id}/suspend` | `db.get()` puis `db.put()` |
| Payload | `{ motif: string }` | Modification directe du doc |
| Réponse | `{ success, data: { id, statut, dateSuspension } }` | `{ ok, id, rev }` |
| Gestion conflits | Backend | Détection `_rev` côté client |
| Latence | ~200-500ms | ~10-50ms (local) |
| Offline | ❌ Impossible | ✅ Fonctionne offline, sync reportée |
