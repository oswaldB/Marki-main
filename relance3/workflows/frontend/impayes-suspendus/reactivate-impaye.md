# Workflow : Réactiver un impayé suspendu (PouchDB)

## Écran
`impayes-suspendus.html`

## Élément déclencheur
Bouton avec `@click="reactiverImpaye(impaye)"`

## Action
Réactiver une facture précédemment suspendue via PouchDB

## Description
- Enlève le statut suspendu dans le document PouchDB
- Retourne la facture au cycle de relance
- La modification est synchronisée automatiquement avec CouchDB
- Rafraîchit la liste des suspendus

## Data Model
**Page Function:** `impayesSuspendusPage()`

**Stores Alpine.js:**
- $store.ui

**Données (depuis PouchDB):**
- `facturesSuspendues` - liste des factures suspendues
- `searchQuery`
- `filterMotif`
- `selectedFacture`
- `reactivateData`
- `db` - instance PouchDB

**États UI:**
- `loading`
- `error`
- `showReactivateModal`

## State Changes

**Modifications:**
- `facture.is_suspended` ← `false`
- `facture.statut` ← "impayee"
- `facture.unsuspended_at` ← date actuelle

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
    └── impayes-suspendus/
        ├── index.html
        ├── components/
        │   └── (composants partagés)
        └── js/
            └── reactivate-impaye.js
```

### Fichier principal
- **HTML** : `frontend/app/impayes-suspendus/index.html`
- **Point d'entrée** : Initialise la page Alpine.js avec PouchDB

### Fichier workflow
- **JS** : `frontend/app/impayes-suspendus/js/reactivate-impaye.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/impayes-suspendus/js/reactivate-impaye.js
export async function reactivateImpaye() {
  // Implementation avec PouchDB
}
```

## Implementation (PouchDB)

```javascript
async reactivateFacture(id) {
  // 1. Set loading
  this.loading = true;
  
  try {
    // 2. Récupérer le document depuis PouchDB avec sa révision
    const doc = await db.get('facture:' + id);
    
    // 3. Réinitialiser les champs de suspension
    doc.is_suspended = false;
    doc.statut = 'impayee';
    doc.unsuspended_at = new Date().toISOString();
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
    
    // 5. Remove from suspended list (le changes listener mettra aussi à jour)
    this.facturesSuspendues = this.facturesSuspendues.filter(item => item.id !== id);
    
    // 6. Close modal
    this.showReactivateModal = false;
    
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
async reactivateFactureWithRetry(id, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const doc = await db.get('facture:' + id);
      
      doc.is_suspended = false;
      doc.statut = 'impayee';
      doc.unsuspended_at = new Date().toISOString();
      doc.updated_at = new Date().toISOString();
      
      await db.put(doc);
      
      // Mettre à jour l'UI
      this.facturesSuspendues = this.facturesSuspendues.filter(item => item.id !== id);
      this.showReactivateModal = false;
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
  "is_suspended": false,
  "statut": "impayee",
  "suspension_motif": "Client en vacances",  // Conservé pour audit
  "suspended_at": "2024-01-10T10:00:00Z",    // Conservé pour audit
  "unsuspended_at": "2024-01-15T14:30:00Z",    // Date de réactivation
  "updated_at": "2024-01-15T14:30:00Z"
}
```

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
