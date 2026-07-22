# Workflow : Réactiver une facture (PouchDB)

## Écran
`impayes-detail.html`

## Élément déclencheur
Bouton avec `@click="unsuspendFacture(impaye)"`

## Action
Réactiver une facture impayée suspendue via PouchDB

## Description
- Réinitialise les champs de suspension dans le document PouchDB
- La facture redevient visible dans la liste normale
- Conserve l'historique dans `blacklist_date` et `blacklist_motif` (optionnel)
- La modification est synchronisée automatiquement avec CouchDB

## Data Model

**Page Function:** `impayesDetailPage()`

**Données (depuis PouchDB):**
- `impaye` - impayé en cours de visualisation (document PouchDB)
- `db` - instance PouchDB

**Champs modifiés dans le document PouchDB:**
- `is_blacklisted` ← `false` (ou `isBlacklisted` ← `0`)
- `is_suspended` ← `false`
- `unsuspended_at` ← date actuelle (optionnel, pour audit)
- `updated_at` ← date actuelle

**États UI:**
- `loading`
- `error`

## State Changes

**Modifications:**
- `impaye.is_suspended` ← `false`
- `impaye.statut` ← "impayee" (ou statut précédent)

## PouchDB Operations

**Action:** Mettre à jour le document facture dans PouchDB pour réactiver.

**Méthodes utilisées:**
1. `db.get('facture:' + id)` - Récupérer le document avec sa révision
2. Réinitialiser les champs de suspension
3. `db.put(doc)` - Sauvegarder le document modifié

**Sync:** La modification est automatiquement synchronisée avec CouchDB.

## Organisation des fichiers

```
frontend/
└── app/
    └── impayes-detail/
        ├── index.html
        └── js/
            └── unsuspend-facture.js
```

### Fichier workflow
- **JS** : `frontend/app/impayes-detail/js/unsuspend-facture.js`

```javascript
// frontend/app/impayes-detail/js/unsuspend-facture.js
export async function unsuspendFacture() {
  // Implementation avec PouchDB
}
```

## Implementation (PouchDB)

```javascript
async unsuspendFacture(id) {
  // 1. Set loading
  this.loading = true;
  
  try {
    // 2. Récupérer le document depuis PouchDB avec sa révision
    const doc = await db.get('facture:' + id);
    
    // 3. Réinitialiser les champs de suspension
    doc.is_blacklisted = false; // ou doc.isBlacklisted = 0
    doc.is_suspended = false;
    doc.statut = 'impayee'; // ou statut précédent
    doc.unsuspended_at = new Date().toISOString(); // Pour audit
    doc.updated_at = new Date().toISOString();
    
    // Optionnel: conserver l'historique de suspension
    // doc.suspension_history = doc.suspension_history || [];
    // doc.suspension_history.push({
    //   suspended_at: doc.suspended_at,
    //   unsuspended_at: doc.unsuspended_at,
    //   motif: doc.suspension_motif
    // });
    
    // 4. Sauvegarder dans PouchDB (crée une nouvelle révision)
    const response = await db.put(doc);
    // response: { ok: true, id: 'facture:...', rev: '3-xxx...' }
    
    // 5. Update local (le changes listener mettra aussi à jour)
    this.impaye.is_blacklisted = false;
    this.impaye.is_suspended = false;
    this.impaye.statut = 'impayee';
    this.impaye.unsuspended_at = doc.unsuspended_at;
    this.impaye._rev = response.rev;
    
    // 6. Mettre à jour dans la liste si présent
    const index = this.factures.findIndex(item => item.id === id);
    if (index !== -1) {
      this.factures[index].is_blacklisted = false;
      this.factures[index].is_suspended = false;
      this.factures[index].statut = 'impayee';
    }
    
    // 7. Notify
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
      
      doc.is_blacklisted = false;
      doc.is_suspended = false;
      doc.statut = 'impayee';
      doc.unsuspended_at = new Date().toISOString();
      doc.updated_at = new Date().toISOString();
      
      await db.put(doc);
      
      // Mettre à jour l'UI
      this.impaye.is_blacklisted = false;
      this.impaye.is_suspended = false;
      this.impaye.statut = 'impayee';
      
      // Mettre à jour dans la liste
      const index = this.factures.findIndex(item => item.id === id);
      if (index !== -1) {
        this.factures[index].is_blacklisted = false;
        this.factures[index].is_suspended = false;
        this.factures[index].statut = 'impayee';
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
  "id": "FAC-2024-001",
  "nfacture": "F-2024-001",
  "statut": "impayee",
  "is_blacklisted": false,
  "is_suspended": false,
  "blacklist_date": "2024-01-10T10:00:00Z",  // Conservé pour audit
  "blacklist_motif": "Client en litige",       // Conservé pour audit
  "suspended_at": "2024-01-10T10:00:00Z",      // Conservé pour audit
  "unsuspended_at": "2024-01-15T14:30:00Z",    // Date de réactivation
  "updated_at": "2024-01-15T14:30:00Z",
  ...
}
```

## Régénération des relances via Changes Listener (optionnel)

```javascript
// Écouter les changements de réactivation
db.changes({
  since: 'now',
  live: true,
  include_docs: true
}).on('change', (change) => {
  if (change.doc.type === 'facture' && 
      change.doc.is_suspended === false && 
      change.doc._wasSuspended) {
    // La facture a été réactivée, régénérer les relances
    this.regenerateRelances(change.doc.contact_id, change.doc.id);
  }
});
```

## Notes

- La réactivation rend la facture visible dans la liste normale
- Les champs `blacklist_date` et `blacklist_motif` sont conservés pour audit
- Voir workflow `suspend-facture` pour suspendre

---

## Migration depuis l'ancienne API

| Aspect | Avant (API) | Après (PouchDB) |
|--------|-------------|-----------------|
| Requête | `POST /api/impayes/{id}/unsuspend` | `db.get()` puis `db.put()` |
| Payload | Aucun | Modification directe du doc |
| Réponse | `{ success, data: { id, statut, is_suspended, dateReactivation } }` | `{ ok, id, rev }` |
| Gestion conflits | Backend | Détection `_rev` côté client |
| Latence | ~200-500ms | ~10-50ms (local) |
| Offline | ❌ Impossible | ✅ Fonctionne offline, sync reportée |
