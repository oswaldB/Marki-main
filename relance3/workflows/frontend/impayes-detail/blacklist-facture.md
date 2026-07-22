# Workflow : Blacklister la facture (PouchDB)

## Écran
`impayes-detail.html`

## Élément déclencheur
Bouton avec `@click="openBlacklistModal()"`

## Action
Blacklister un impayé pour désactiver les relances automatiques

## Description
- Ouvre un modal pour saisir le motif de blacklist
- Met à jour les champs `is_blacklisted`, `blacklist_date`, `blacklist_motif` dans le document PouchDB
- Empêche les futures relances automatiques sur cette facture
- La modification est synchronisée automatiquement avec CouchDB

## Data Model

**Page Function:** `impayesDetailPage()`

**Données (depuis PouchDB):**
- `impaye` - impayé en cours de visualisation (document PouchDB)
- `blacklistMotif` - motif saisi par l'utilisateur
- `db` - instance PouchDB

**Champs modifiés dans le document PouchDB:**
- `is_blacklisted` ← `true` (ou `isBlacklisted` ← `1`)
- `blacklist_date` ← date actuelle (ISO)
- `blacklist_motif` ← texte saisi

**États UI:**
- `loading`
- `error`
- `showBlacklistModal`
- `blacklistMotif`

## State Changes

**Modifications:**
- `impaye.is_blacklisted` ← `true`
- `impaye.blacklist_date` ← date
- `impaye.blacklist_motif` ← texte

## PouchDB Operations

**Action:** Mettre à jour le document facture dans PouchDB avec les champs de blacklist.

**Méthodes utilisées:**
1. `db.get('facture:' + impayeId)` - Récupérer le document avec sa révision
2. `db.put(doc)` - Sauvegarder le document modifié

**Sync:** La modification est automatiquement synchronisée avec CouchDB.



## Organisation des fichiers

```
frontend/
└── app/
    └── impayes-detail/
        ├── index.html
        └── js/
            └── blacklist-facture.js
```

### Fichier workflow
- **JS** : `frontend/app/impayes-detail/js/blacklist-facture.js`

```javascript
// frontend/app/impayes-detail/js/blacklist-facture.js
export async function blacklistFacture() {
  // Implementation avec PouchDB
}
```

## Implementation (PouchDB)

```javascript
async blacklistFacture(impayeId, motif) {
  // 1. Validate
  if (!motif.trim()) {
    this.toast('Le motif est obligatoire', 'error');
    return;
  }
  
  // 2. Set loading
  this.loading = true;
  
  try {
    // 3. Récupérer le document depuis PouchDB avec sa révision
    const doc = await db.get('facture:' + impayeId);
    
    // 4. Modifier les champs de blacklist
    doc.is_blacklisted = true; // ou doc.isBlacklisted = 1
    doc.blacklist_date = new Date().toISOString();
    doc.blacklist_motif = motif.trim();
    doc.updated_at = new Date().toISOString();
    
    // 5. Sauvegarder dans PouchDB (crée une nouvelle révision)
    const response = await db.put(doc);
    // response: { ok: true, id: 'facture:...', rev: '2-xxx...' }
    
    // 6. Update local (le changes listener mettra aussi à jour)
    this.impaye.is_blacklisted = true;
    this.impaye.blacklist_date = doc.blacklist_date;
    this.impaye.blacklist_motif = motif.trim();
    this.impaye._rev = response.rev; // Mettre à jour la révision
    
    // 7. Close modal
    this.showBlacklistModal = false;
    this.blacklistMotif = '';
    
    // 8. Notify
    this.toast('Facture blacklistée', 'success');
    
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
async blacklistFactureWithRetry(impayeId, motif, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const doc = await db.get('facture:' + impayeId);
      
      doc.is_blacklisted = true;
      doc.blacklist_date = new Date().toISOString();
      doc.blacklist_motif = motif.trim();
      doc.updated_at = new Date().toISOString();
      
      await db.put(doc);
      
      // Mettre à jour l'UI
      this.impaye.is_blacklisted = true;
      this.impaye.blacklist_date = doc.blacklist_date;
      this.impaye.blacklist_motif = motif.trim();
      
      this.showBlacklistModal = false;
      this.blacklistMotif = '';
      this.toast('Facture blacklistée', 'success');
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

## Structure du document PouchDB (après blacklist)

```javascript
{
  "_id": "facture:550e8400-...",
  "_rev": "2-abc123...",  // Nouvelle révision
  "type": "facture",
  "id": "F123",
  "nfacture": "F-2024-001",
  "reste_a_payer": 1500.00,
  "statut": "impaye",
  "is_blacklisted": true,
  "blacklist_date": "2026-07-21T16:30:00.000Z",
  "blacklist_motif": "Client insolvable",
  "updated_at": "2026-07-21T16:30:00.000Z",
  "contact_id": "contact:..."
}
```

## Notes

- Une facture blacklistée ne recevra plus de relances automatiques
- Le motif est obligatoire pour tracer la raison du blacklisting
- La modification est immédiatement disponible localement et sera sync avec CouchDB
- Pour retirer de la blacklist, mettre `is_blacklisted: false` (voir workflow dé-blacklist)

---

## Migration depuis l'ancienne API

| Aspect | Avant (API) | Après (PouchDB) |
|--------|-------------|-----------------|
| Requête | `PUT /api/impayes/:id` | `db.get()` puis `db.put()` |
| Payload | `{ is_blacklisted, blacklist_date, blacklist_motif }` | Modification directe du doc |
| Réponse | `ApiResponse<Impaye>` | `{ ok, id, rev }` |
| Gestion conflits | Verrouillage optimiste serveur | Détection `_rev` côté client |
| Latence | ~100-500ms | ~10-50ms (local) |
| Offline | ❌ Impossible | ✅ Fonctionne offline, sync reportée |
