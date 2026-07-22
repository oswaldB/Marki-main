---
id: contacts-blacklist-remove
type: frontend
folder: specs/workflows/frontend/contacts-blacklist/
description: Retire un contact de la blacklist via PouchDB
depends_on: [contacts-blacklist-load]
screen: contacts-blacklist
global: false
mockup_entry: specs/mockups/contacts-blacklist.html
---

# contacts-blacklist-remove : Retirer de la blacklist

## Description

Retire un contact de la blacklist via **PouchDB**. Le contact reçra à nouveau les relances automatiques.
La modification est effectuée localement puis synchronisée automatiquement avec CouchDB.

## Flow

```javascript
/**
 * @action Confirmer l'action
 * @checkpoint unblacklist-confirm
 * Dialog: "Retirer [nom] de la blacklist ?"
 */

/**
 * @action Mettre à jour dans PouchDB
 * @checkpoint unblacklist-db-called
 * 
 * PouchDB:
 * 1. Récupérer le document: db.get('contact:{id}')
 * 2. Modifier: doc.isBlacklisted = 0, doc.statut = 'actif'
 * 3. Sauvegarder: db.put(doc)
 * 
 * Auto-sync: Le changement est poussé vers CouchDB
 */

/**
 * @action Mettre à jour l'UI
 * @checkpoint unblacklist-complete
 * - Toast: "[nom] a été retiré de la blacklist"
 * - Le contact est automatiquement retiré de la liste (via changes listener)
 * - Mettre à jour le compteur
 */

/**
 * @action Erreur
 * @checkpoint unblacklist-error
 * Toast: "Erreur: [message]"
 */
```

## PouchDB Operations

### Retirer de la blacklist

```javascript
async unblacklistContact(contact) {
  try {
    // Récupérer le document avec sa révision
    const doc = await db.get('contact:' + contact.id);
    
    // Modifier les champs
    doc.isBlacklisted = 0;
    doc.statut = 'actif';
    doc.unblacklistedAt = new Date().toISOString();
    
    // Sauvegarder localement
    const response = await db.put(doc);
    // response: { ok: true, id: 'contact:...', rev: '3-xxx...' }
    
    // Toast succès
    showToast(`${contact.nomComplet} a été retiré de la blacklist`, 'success');
    
  } catch (err) {
    if (err.status === 409) {
      // Conflit: recharger et réessayer
      showToast('Conflit de version, veuillez réessayer', 'error');
    } else {
      showToast(`Erreur: ${err.message}`, 'error');
    }
  }
}
```

## State

```javascript
// Confirmer le retrait de la blacklist
async confirmUnblacklist(contact) {
  if (!confirm(`Retirer ${contact.nomComplet} de la blacklist ?`)) {
    return;
  }
  
  try {
    const doc = await db.get('contact:' + contact.id);
    doc.isBlacklisted = 0;
    doc.statut = 'actif';
    doc.unblacklistedAt = new Date().toISOString();
    await db.put(doc);
    
    // Le contact sera automatiquement retiré de la liste
    // par le changes listener de contacts-blacklist-load
    showToast(`${contact.nomComplet} a été retiré de la blacklist`, 'success');
    
  } catch (err) {
    showToast('Erreur: ' + err.message, 'error');
  }
}
```

## UI Update automatique

Le retrait de la liste est géré automatiquement par le `changes` listener :

```javascript
// Dans contacts-blacklist-load
db.changes({
  since: 'now',
  live: true,
  include_docs: true
}).on('change', (change) => {
  if (change.doc.type === 'contact') {
    const isBlacklisted = change.doc.isBlacklisted === 1 || 
                          change.doc.statut === 'blacklist';
    
    if (!isBlacklisted) {
      // Retirer de la liste locale
      this.contacts = this.contacts.filter(c => c._id !== change.doc._id);
      this.filteredContacts = this.filteredContacts.filter(c => c._id !== change.doc._id);
    }
  }
});
```

## Confirmation Dialog

```
┌─────────────────────────────────────┐
│  Confirmer                          │
├─────────────────────────────────────┤
│  Retirer Lucas Petit de la          │
│  blacklist ?                        │
│                                     │
│  Le contact recevra à nouveau les   │
│  relances automatiques.             │
│                                     │
├─────────────────────────────────────┤
│  [Annuler]    [Confirmer]          │
└─────────────────────────────────────┘
```

## Checkpoints attendus

1. `unblacklist-confirm` → Dialog de confirmation affiché
2. `unblacklist-db-called` → Mise à jour PouchDB effectuée
3. `unblacklist-complete` → Contact retiré (via changes listener)
4. `unblacklist-error` → Erreur lors de la mise à jour

## Exemple de données avant/après

```javascript
// Avant (dans PouchDB)
{
  "_id": "contact:550e8400-...",
  "_rev": "2-abc123...",
  "type": "contact",
  "id": "123",
  "nomComplet": "Lucas Petit",
  "statut": "blacklist",
  "isBlacklisted": 1
}

// Après retrait (dans PouchDB, puis sync CouchDB)
{
  "_id": "contact:550e8400-...",
  "_rev": "3-def456...",  // ← Nouvelle révision
  "type": "contact",
  "id": "123",
  "nomComplet": "Lucas Petit",
  "statut": "actif",
  "isBlacklisted": 0,
  "unblacklistedAt": "2026-07-21T15:30:00.000Z"
}
```

## Fichiers liés

- Mockup: `specs/mockups/contacts-blacklist.html`

---

## Migration depuis l'ancienne API

| Avant (API) | Après (PouchDB) |
|-------------|-----------------|
| `PUT /api/contacts/{id}` avec `is_blacklisted: 0` | `db.get('contact:{id}')` puis `db.put(doc)` |
| Mise à jour UI manuelle | UI mise à jour automatique via `changes` event |
| Pas de révision | Gestion `_rev` obligatoire |
