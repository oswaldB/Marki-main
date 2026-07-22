# Workflow : Suspendre une facture (PouchDB)

## Écran
`impayes.html`

## Élément déclencheur
Bouton avec `@click="suspendFacture(facture)"`

## Action
Suspendre une facture impayée (la masquer temporairement)

## Description
- Met à jour les champs de suspension dans le document PouchDB
- La facture reste dans la base mais est masquée dans la liste
- Le motif de suspension est enregistré
- La modification est synchronisée avec CouchDB
- Les relances en cours sont annulées via changes listener

## Data Model

**Page Function:** `impayesPage()`

**Données (depuis PouchDB):**
- `impayes` - liste des impayés
- `db` - instance PouchDB

**Champs modifiés dans le document PouchDB:**
- `is_suspended` ← `true` (ou `is_blacklisted` ← `1`)
- `suspended_at` ← date actuelle (ISO)
- `suspension_motif` ← motif saisi par l'utilisateur

**États UI:**
- `loading`
- `error`
- `showSuspendModal`
- `suspensionMotif` - saisie utilisateur

## State Changes

**Modifications:**
- `impayes[n].is_suspended` ← `true`
- `impayes[n].suspended_at` ← date
- `impayes[n].suspension_motif` ← texte

## PouchDB Operations

**Action:** Mettre à jour le document facture dans PouchDB avec les champs de suspension.

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
            └── suspend-facture.js
```

### Fichier workflow
- **JS** : `frontend/app/impayes/js/suspend-facture.js`

```javascript
// frontend/app/impayes/js/suspend-facture.js
export async function suspendFacture(factureId, motif) {
  // Implementation avec PouchDB
}
```

## Implementation (PouchDB)

```javascript
async suspendFacture(id, motif) {
  if (!motif.trim()) {
    this.toast('Veuillez saisir un motif', 'error');
    return;
  }
  
  this.loading = true;
  
  try {
    // 1. Récupérer le document depuis PouchDB avec sa révision
    const doc = await db.get('facture:' + id);
    
    // 2. Modifier les champs de suspension
    doc.is_suspended = true; // ou doc.is_blacklisted = 1
    doc.suspended_at = new Date().toISOString();
    doc.suspension_motif = motif.trim();
    
    // 3. Sauvegarder dans PouchDB (crée une nouvelle révision)
    const response = await db.put(doc);
    // response: { ok: true, id: 'facture:...', rev: '2-xxx...' }
    
    // 4. Mettre à jour l'UI (le changes listener mettra aussi à jour)
    const index = this.impayes.findIndex(item => item.id === id);
    if (index !== -1) {
      this.impayes[index].is_suspended = true;
      this.impayes[index].suspended_at = doc.suspended_at;
      this.impayes[index].suspension_motif = motif;
      this.impayes = [...this.impayes]; // Force recalcul
    }
    
    // 5. Close modal
    this.showSuspendModal = false;
    this.suspensionMotif = '';
    
    // 6. Toast de confirmation
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
      
      doc.is_suspended = true;
      doc.suspended_at = new Date().toISOString();
      doc.suspension_motif = motif.trim();
      
      await db.put(doc);
      
      // Mettre à jour l'UI
      const index = this.impayes.findIndex(item => item.id === id);
      if (index !== -1) {
        this.impayes[index].is_suspended = true;
        this.impayes[index].suspended_at = doc.suspended_at;
        this.impayes[index].suspension_motif = motif;
        this.impayes = [...this.impayes];
      }
      
      this.showSuspendModal = false;
      this.suspensionMotif = '';
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
  "id": "F123",
  "nfacture": "F-2024-001",
  "reste_a_payer": 1500.00,
  "statut": "impaye",
  "is_suspended": true,
  "suspended_at": "2026-07-21T14:30:00.000Z",
  "suspension_motif": "Client en vacances",
  "contact_id": "contact:..."
}
```

## Annulation des relances via Changes Listener

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

// Ou utiliser un document event pour déclencher l'annulation
async cancelRelancesForContact(contactId) {
  const relances = await dbRelances.find({
    selector: {
      type: { $eq: 'relance' },
      contact_id: { $eq: contactId },
      statut: { $eq: 'pending' }
    }
  });
  
  // Annuler chaque relance
  for (const relance of relances.docs) {
    relance.statut = 'cancelled';
    relance.cancelled_at = new Date().toISOString();
    relance.cancel_reason = 'Facture suspendue';
    await dbRelances.put(relance);
  }
}
```

## Notes

- La suspension est **logique** (pas de suppression physique)
- Les impayés suspendus sont filtrés par défaut dans la liste
- Les relances en cours sont annulées via le changes listener
- Voir workflow `unsuspend-facture` pour réactiver

---

## Migration depuis l'ancienne API

| Aspect | Avant (API) | Après (PouchDB) |
|--------|-------------|-----------------|
| Requête | `POST /api/impayes/:id/suspend` | `db.get()` puis `db.put()` |
| Payload | `{ motif: string }` | Modification directe du doc |
| Réponse | `{ message, relances_annulees }` | `{ ok, id, rev }` |
| Annulation relances | Backend automatique | Changes listener côté client |
| Gestion conflits | Verrouillage optimiste serveur | Détection `_rev` côté client |
| Latence | ~200-500ms | ~10-50ms (local) |
| Offline | ❌ Impossible | ✅ Fonctionne offline |
