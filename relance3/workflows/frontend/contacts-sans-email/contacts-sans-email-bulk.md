---
id: contacts-sans-email-bulk
type: frontend
folder: specs/workflows/frontend/contacts-sans-email/
description: Actions en masse sur les contacts sans email via PouchDB bulk
depends_on: [contacts-sans-email-load]
screen: contacts-sans-email
global: false
mockup_entry: specs/mockups/contacts-sans-email.html
---

# contacts-sans-email-bulk : Actions en masse

## Description

Permet de définir le même email forcé pour plusieurs contacts sans email simultanément via **PouchDB bulk operations**.
Les modifications sont faites localement puis synchronisées avec CouchDB.

## Flow

```javascript
/**
 * @action Sélectionner plusieurs contacts
 * @checkpoint bulk-selection-changed
 * State: { selectedContacts: [id1, id2, ...] }
 * UI: Cases à cocher sur chaque card
 */

/**
 * @action Ouvrir modale d'action en masse
 * @checkpoint bulk-modal-opened
 * Affiche: "X contacts sélectionnés"
 */

/**
 * @action Définir email forcé en masse
 * @checkpoint bulk-email-force-requested
 * 
 * PouchDB bulk:
 * 1. Récupérer tous les documents: db.allDocs({ keys: contactIds })
 * 2. Modifier chaque doc: doc.emailForce = email
 * 3. Sauvegarder en bulk: db.bulkDocs(docs)
 */

/**
 * @action Traiter réponse
 * @checkpoint bulk-complete
 * Success: Mise à jour de la liste (via changes listener) + toast
 * Partial: Affiche les erreurs par contact (conflits de révision)
 */
```

## PouchDB Operations

### Mise à jour bulk avec email forcé

```javascript
async bulkSetEmailForce(contactIds, emailForce) {
  try {
    // Validation email
    if (!isValidEmail(emailForce)) {
      throw new Error('Email invalide');
    }
    
    // 1. Récupérer tous les documents avec leurs révisions
    const result = await db.allDocs({
      keys: contactIds.map(id => 'contact:' + id),
      include_docs: true
    });
    
    // 2. Préparer les documents mis à jour
    const docsToUpdate = result.rows
      .filter(row => row.doc) // Exclure les documents non trouvés
      .map(row => {
        const doc = row.doc;
        doc.emailForce = emailForce;
        doc.emailForceUpdatedAt = new Date().toISOString();
        doc.bulkUpdated = true; // Flag optionnel
        return doc;
      });
    
    // 3. Sauvegarder en bulk
    const response = await db.bulkDocs(docsToUpdate);
    
    // Analyser les résultats
    const success = response.filter(r => r.ok);
    const errors = response.filter(r => r.error);
    
    return {
      success: errors.length === 0,
      updated: success.length,
      errors: errors.map(e => ({
        contact_id: e.id.replace('contact:', ''),
        error: e.name === 'conflict' ? 'Conflit de version' : e.message
      }))
    };
    
  } catch (err) {
    return {
      success: false,
      updated: 0,
      errors: [{ contact_id: 'global', error: err.message }]
    };
  }
}
```

### Gestion des conflits en bulk

```javascript
// Si des conflits surviennent, récupérer les dernières révisions
// et réessayer pour les documents en échec
async retryBulkUpdate(failedDocs) {
  // Récupérer les dernières révisions
  const keys = failedDocs.map(d => d.id);
  const latest = await db.allDocs({ keys, include_docs: true });
  
  // Mettre à jour avec les nouvelles révisions
  const retryDocs = latest.rows.map(row => {
    const doc = row.doc;
    doc.emailForce = emailForce;
    return doc;
  });
  
  // Réessayer
  return await db.bulkDocs(retryDocs);
}
```

## State

```javascript
// Reactive data
{
  selectedContacts: [],      // IDs des contacts sélectionnés
  showBulkModal: false,
  bulkEmailForce: '',        // Email forcé à appliquer
  bulkLoading: false
}

// Méthodes
selectContact(contactId, selected) {
  if (selected) {
    this.selectedContacts.push(contactId);
  } else {
    this.selectedContacts = this.selectedContacts.filter(id => id !== contactId);
  }
}

async applyBulkEmailForce() {
  if (this.selectedContacts.length === 0 || !this.bulkEmailForce) return;
  
  this.bulkLoading = true;
  
  try {
    const result = await bulkSetEmailForce(
      this.selectedContacts, 
      this.bulkEmailForce
    );
    
    if (result.success) {
      this.toast(`${result.updated} contacts mis à jour`);
      this.selectedContacts = [];
      this.showBulkModal = false;
    } else if (result.updated > 0) {
      // Succès partiel
      this.toast(`${result.updated} mis à jour, ${result.errors.length} erreurs`, 'warning');
      console.error('Erreurs:', result.errors);
    } else {
      this.toast('Erreur lors de la mise à jour', 'error');
    }
    
  } catch (err) {
    this.toast('Erreur: ' + err.message, 'error');
  } finally {
    this.bulkLoading = false;
  }
}
```

## Response PouchDB

```javascript
// Réponse de db.bulkDocs()
[
  { ok: true, id: 'contact:123', rev: '2-abc...' },
  { ok: true, id: 'contact:456', rev: '2-def...' },
  { 
    error: 'conflict', 
    id: 'contact:789', 
    reason: 'Document update conflict' 
  }
]
```

## UI

```
┌─────────────────────────────────────┐
│  3 contacts sélectionnés              │
│                                       │
│  Email forcé à appliquer:             │
│  [finance@entreprise.com         ]    │
│                                       │
│  [Définir email forcé]  [Annuler]     │
└─────────────────────────────────────┘
```

## Checkpoints attendus

1. `bulk-selection-changed` - Sélection modifiée
2. `bulk-modal-opened` - Modale d'action en masse ouverte
3. `bulk-email-force-requested` - Mise à jour bulk lancée
4. `bulk-complete` - Opération terminée (succès ou partiel)

## Avantages de bulkDocs

| Aspect | API individuelle | PouchDB bulkDocs |
|--------|------------------|------------------|
| Nombre de requêtes | N (une par contact) | 1 |
| Performance | N x latence réseau | 1 x latence locale |
| Atomicité | Non | Oui (tous ou rien possible) |
| Offline | ❌ | ✅ |
| Rollback | Complexe | Facile (pas de sync immédiate) |

## Fichiers liés

- Mockup: `specs/mockups/contacts-sans-email.html`

---

## Migration depuis l'ancienne API

| Avant (API) | Après (PouchDB) |
|-------------|-----------------|
| `POST /api/contacts/bulk-set-email-force` | `db.allDocs()` + `db.bulkDocs()` |
| `contact_ids` array | `keys: contactIds.map(id => 'contact:' + id)` |
| Réponse avec `updated` et `errors` | Analyse du résultat `bulkDocs` |
| Mise à jour UI via response | UI mise à jour via `changes` event |
