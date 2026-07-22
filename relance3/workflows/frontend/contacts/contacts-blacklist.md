---
id: contacts-blacklist
type: frontend
folder: specs/workflows/frontend/contacts/
description: Confirme et applique le blacklistage d'un contact via PouchDB
depends_on: [contacts-load-all]
screen: contacts
global: false
mockup_entry: specs/mockups/contacts.html
---

# contacts-blacklist : Blacklister un contact

## Description

Ouvre une modale de confirmation avant de blacklister un contact. 
Le contact blacklisté reste visible dans la liste avec un badge "BlackListé" mais est exclu des relances automatiques.

La mise à jour est effectuée **localement via PouchDB** puis synchronisée automatiquement avec CouchDB.

## Élément déclencheur

Bouton "Blacklister" (icône 🚫) dans :
- La card d'une entreprise (header)
- La card d'une personne (header)
- La sous-card d'un collaborateur
- La sous-card d'un contact lié

## Flow du Workflow

```javascript
/**
 * @action Ouvrir la modale de confirmation
 * @param {Object} contact - Le contact à blacklister
 * @checkpoint blacklist-modal-opened
 * State: {
 *   contactToBlacklist: contact,
 *   showBlacklistModal: true
 * }
 */

/**
 * @action Confirmer le blacklistage
 * @checkpoint blacklist-confirmed
 * 
 * PouchDB: 
 * 1. Récupérer le document: db.get('contact:{id}')
 * 2. Modifier: doc.statut = 'blacklist', doc.isBlacklisted = 1
 * 3. Sauvegarder: db.put(doc)
 * 
 * Auto-sync: Le changement est poussé vers CouchDB
 * 
 * Success:
 *   - Ferme la modale
 *   - Toast success
 *   - Le badge "BlackListé" apparaît sur la card (via changes listener)
 * Error:
 *   - Toast error (conflit de révision, etc.)
 *   - Garde modale ouverte
 */

/**
 * @action Annuler (facultatif)
 * State: { showBlacklistModal: false, contactToBlacklist: null }
 */
```

## PouchDB Operations

### Blacklister un contact

```javascript
// Récupérer le document avec sa révision
const doc = await db.get('contact:' + contactId);

// Modifier les champs
doc.statut = 'blacklist';
doc.isBlacklisted = 1;
doc.blacklistedAt = new Date().toISOString(); // Optionnel: timestamp

// Sauvegarder (crée une nouvelle révision)
const response = await db.put(doc);
// response: { ok: true, id: 'contact:...', rev: '2-xxx...' }
```

### Gestion des conflits

```javascript
try {
  const doc = await db.get('contact:' + contactId);
  doc.statut = 'blacklist';
  doc.isBlacklisted = 1;
  await db.put(doc);
} catch (err) {
  if (err.status === 409) {
    // Conflit: recharger et réessayer
    const doc = await db.get('contact:' + contactId, { conflicts: true });
    doc.statut = 'blacklist';
    doc.isBlacklisted = 1;
    await db.put(doc);
  } else {
    throw err;
  }
}
```

## State

```javascript
// Ouvrir modale de confirmation
openBlacklistConfirm(contact) {
  this.contactToBlacklist = contact;
  this.showBlacklistModal = true;
}

// Confirmer (PouchDB version)
async confirmBlacklist() {
  if (!this.contactToBlacklist) return;
  
  try {
    // Récupérer la dernière version du doc
    const doc = await db.get('contact:' + this.contactToBlacklist.id);
    
    // Modifier
    doc.statut = 'blacklist';
    doc.isBlacklisted = 1;
    doc.blacklistedAt = new Date().toISOString();
    
    // Sauvegarder localement
    await db.put(doc);
    
    // Succès - le changes listener mettra à jour l'UI
    this.showBlacklistModal = false;
    this.contactToBlacklist = null;
    
    // Toast success
    this.toast('Contact blacklisted avec succès');
    
  } catch (err) {
    // Gestion erreur
    this.toast('Erreur: ' + err.message, 'error');
  }
}

// Annuler
cancelBlacklist() {
  this.showBlacklistModal = false;
  this.contactToBlacklist = null;
}
```

## UI - Structure de la modale

```
┌─────────────────────────────────────┐
│  CONFIRMER LE BLACKLISTAGE      [X] │ ← Header rouge
├─────────────────────────────────────┤
│                                     │
│  ⚠️ Êtes-vous sûr de vouloir       │
│     blacklister ce contact ?       │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ 🏢 ACME Corporation          │   │  ← Ou 👤 pour personne
│  │ contact@acme.fr              │   │
│  │ 3 impayés                    │   │
│  └─────────────────────────────┘   │
│                                     │
│  Ce contact sera exclu des          │
│  relances automatiques et ne      │
│  pourra plus recevoir d'emails.   │
│                                     │
├─────────────────────────────────────┤
│  [Annuler]    [🚫 Confirmer]       │
└─────────────────────────────────────┘
```

## Checkpoints attendus

1. `blacklist-modal-opened` → Modale ouverte avec contact à blacklister
2. `blacklist-confirmed` → Blacklistage confirmé et sauvegardé dans PouchDB

## Affichage après blacklistage

Le contact blacklisté reste visible avec :
- Badge rouge "BlackListé" dans l'en-tête de la card
- Conservation de toutes les fonctionnalités (email forcé, view detail)
- Le bouton "Blacklister" peut devenir "Retirer de la blacklist" (optionnel)

L'UI se met à jour automatiquement grâce au `changes` listener de PouchDB :

```javascript
// Dans le workflow contacts-load-all
db.changes({
  since: 'now',
  live: true,
  include_docs: true
}).on('change', (change) => {
  if (change.doc.type === 'contact') {
    // Mettre à jour le contact dans la liste
    updateContactInList(change.doc);
  }
});
```

## Exemple de données avant/après

```javascript
// Avant (dans PouchDB)
{
  "_id": "contact:550e8400-...",
  "_rev": "1-abc123...",
  "type": "contact",
  "id": "M3",
  "nomComplet": "Global Industries SA",
  "statut": "actif",
  "isBlacklisted": 0
}

// Après confirmation (dans PouchDB, puis sync CouchDB)
{
  "_id": "contact:550e8400-...",
  "_rev": "2-def456...",  // ← Nouvelle révision
  "type": "contact",
  "id": "M3",
  "nomComplet": "Global Industries SA",
  "statut": "blacklist",
  "isBlacklisted": 1,
  "blacklistedAt": "2026-07-21T10:30:00.000Z"
}
```

## Badge affiché

```html
<span class="bg-red-100 text-red-700 rounded-full px-2 py-0.5 text-xs">
  <i class="fas fa-ban mr-1"></i>BlackListé
</span>
```

## Déblacklistage (optionnel)

Pour retirer un contact de la blacklist :

```javascript
const doc = await db.get('contact:' + contactId);
doc.statut = 'actif';
doc.isBlacklisted = 0;
doc.unblacklistedAt = new Date().toISOString();
await db.put(doc);
```

## Fichiers liés

- Mockup: `specs/mockups/contacts.html`
- Composant: `app/templates/contacts/workflows/blacklist.html`

---

## Migration depuis l'ancienne API

| Avant (API) | Après (PouchDB) |
|-------------|-----------------|
| `PUT /api/contacts/{id}/blacklist` | `db.get('contact:{id}')` puis `db.put(doc)` |
| `fetch()` avec headers | Opération locale immédiate |
| Mise à jour UI via response | UI mise à jour via `changes` event |
| Pas de gestion conflits | Gestion `_rev` pour éviter conflits |
