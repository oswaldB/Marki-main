---
id: contacts-sans-email-set-email-force
type: frontend
folder: specs/workflows/frontend/contacts-sans-email/
description: Définit un email forcé pour un contact sans email via PouchDB
depends_on: [contacts-sans-email-load]
screen: contacts-sans-email
global: false
mockup_entry: specs/mockups/contacts-sans-email.html
---

# contacts-sans-email-set-email-force : Définir email forcé (sans email)

## Description

Identique au workflow contacts-set-email-force mais adapté pour la page sans-email via **PouchDB**.
Après sauvegarde réussie, le contact est automatiquement retiré de la liste (car il a maintenant un email forcé) via le `changes` listener.

## Flow

```javascript
/**
 * @action Ouvrir la modale
 * @checkpoint email-force-modal-opened
 * State: { showEmailForceModal: true, selectedContact: contact }
 */

/**
 * @action Rechercher contacts existants
 * @checkpoint email-force-search
 * Input: emailSearchQuery
 * Output: Liste des contacts avec email (filtrage local sur données PouchDB)
 */

/**
 * @action Sauvegarder
 * @checkpoint email-force-saved
 * 
 * PouchDB:
 * 1. Récupérer le document: db.get('contact:{id}')
 * 2. Modifier: doc.emailForce = email
 * 3. Sauvegarder: db.put(doc)
 * 
 * Après succès:
 * 1. Toast: "Email forcé enregistré"
 * 2. Le contact est automatiquement retiré de la liste (via changes listener)
 * 3. Mettre à jour le compteur
 * 4. Fermer la modale
 */
```

## PouchDB Operations

### Sauvegarder l'email forcé

```javascript
async saveEmailForceForSansEmail(contact, emailForce) {
  try {
    // Validation email
    if (!isValidEmail(emailForce)) {
      this.toast('Email invalide', 'error');
      return;
    }
    
    // Récupérer le document avec sa révision
    const doc = await db.get('contact:' + contact.id);
    
    // Modifier l'email forcé
    doc.emailForce = emailForce;
    doc.emailForceUpdatedAt = new Date().toISOString();
    
    // Sauvegarder localement
    const response = await db.put(doc);
    
    // Toast succès
    this.toast('Email forcé enregistré');
    
    // Fermer la modale
    this.showEmailForceModal = false;
    this.selectedContact = null;
    this.emailForceValue = '';
    
    // Le contact sera automatiquement retiré de la liste
    // par le changes listener de contacts-sans-email-load
    // car il a maintenant un email forcé
    
  } catch (err) {
    if (err.status === 409) {
      this.toast('Conflit de version, veuillez réessayer', 'error');
    } else {
      this.toast('Erreur: ' + err.message, 'error');
    }
  }
}
```

## Différence avec contacts-set-email-force

Après sauvegarde réussie dans PouchDB, le retrait de la liste est **automatique** via le `changes` listener :

```javascript
// Dans contacts-sans-email-load
db.changes({
  since: 'now',
  live: true,
  include_docs: true
}).on('change', (change) => {
  if (change.doc.type === 'contact') {
    const hasEmail = change.doc.email || change.doc.emailForce;
    const existingIndex = this.contacts.findIndex(c => c._id === change.doc._id);
    
    if (hasEmail && existingIndex !== -1) {
      // Retirer de la liste - le contact a maintenant un email
      this.contacts.splice(existingIndex, 1);
      this.filteredContacts = this.filteredContacts.filter(c => c._id !== change.doc._id);
    }
  }
});
```

## Recherche locale de contacts avec email

```javascript
// Recherche parmi les contacts existants (filtrage local)
get contactsWithEmail() {
  if (!this.emailSearchQuery || this.emailSearchQuery.length < 2) {
    // Retourner les 5 premiers contacts avec email
    return this.allContacts
      .filter(c => c.email || c.emailForce)
      .slice(0, 5);
  }
  
  const q = this.emailSearchQuery.toLowerCase();
  return this.allContacts
    .filter(c => 
      (c.email || c.emailForce) &&
      (c.nomComplet?.toLowerCase().includes(q) ||
       c.email?.toLowerCase().includes(q))
    )
    .slice(0, 5);
}
```

## State

```javascript
// Reactive data
{
  selectedContact: null,
  showEmailForceModal: false,
  emailForceValue: '',
  emailSearchQuery: ''
}

// Méthodes
openEmailForceModal(contact) {
  this.selectedContact = contact;
  this.emailForceValue = contact.emailForce || '';
  this.showEmailForceModal = true;
}

async confirmSaveEmailForce() {
  if (!this.selectedContact || !this.emailForceValue) return;
  
  await saveEmailForceForSansEmail(this.selectedContact, this.emailForceValue);
}
```

## API PouchDB

| Action | Méthode PouchDB |
|--------|-----------------|
| Récupérer contact | `db.get('contact:{id}')` |
| Sauvegarder | `db.put(doc)` |
| Recherche contacts | Filtrage local sur `this.allContacts` |

## UI spécifique

- Modale avec thème orange/amber
- Message d'aide: "Cet email sera utilisé pour les relances"
- Sélection parmi contacts existants avec email

## Checkpoints attendus

1. `email-force-modal-opened` → Modale ouverte
2. `email-force-search` → Recherche locale effectuée
3. `email-force-saved` → Email forcé sauvegardé dans PouchDB
4. `email-force-complete` → Contact retiré automatiquement de la liste

## Fichiers liés

- Mockup: `specs/mockups/contacts-sans-email.html`

---

## Migration depuis l'ancienne API

| Avant (API) | Après (PouchDB) |
|-------------|-----------------|
| `PUT /api/contacts/{id}` avec `email_force` | `db.get('contact:{id}')` puis `db.put(doc)` |
| Retrait manuel de la liste | Retrait automatique via `changes` listener |
| Recherche via API | Recherche locale sur données en mémoire |
