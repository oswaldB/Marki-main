---
id: contacts-set-email-force
type: frontend
folder: specs/workflows/frontend/contacts/
description: Définit un email forcé pour un contact via PouchDB avec recherche parmi les contacts existants
depends_on: [contacts-load-all]
screen: contacts
global: false
mockup_entry: specs/mockups/contacts.html
---

# contacts-set-email-force : Définir email forcé

## Description

Ouvre une modale permettant de définir un email de relance forcé pour un contact. 
L'utilisateur peut :
1. Saisir manuellement un email
2. Chercher et sélectionner un autre contact existant pour hériter de son email

La modification est sauvegardée **localement dans PouchDB** puis synchronisée avec CouchDB.

## Élément déclencheur

Bouton "Email forcé" dans :
- La card d'une entreprise (header)
- La card d'une personne (header)
- La sous-card d'un collaborateur
- La sous-card d'un contact lié

## Flow du Workflow

```javascript
/**
 * @action Ouvrir la modale set-email-force
 * @param {Object} contact - Le contact à modifier
 * @checkpoint email-force-modal-opened
 * State: {
 *   selectedContact: contact,
 *   showEmailForceModal: true,
 *   emailForceValue: contact.emailForce || '',
 *   emailForceSearch: ''
 * }
 */

/**
 * @action Rechercher des contacts
 * @checkpoint email-force-search
 * Input: emailForceQuery (3 caractères min pour lancer la recherche)
 * Filtres: 
 *   - Type M (entreprises) ou P sans entreprise
 *   - Non blacklistés
 *   - Exclut le contact courant
 * Source: PouchDB local (contacts déjà chargés en mémoire)
 * Output: emailForceEntreprises[] + emailForcePersonnes[]
 */

/**
 * @action Sélectionner un contact dans les résultats
 * @checkpoint email-force-contact-selected
 * @param {Object} selectedContact - Contact choisi
 * State: { 
 *   selectedContact: newContact,
 *   emailForceValue: selectedContact.emailForce || selectedContact.email || ''
 * }
 */

/**
 * @action Sauvegarder l'email forcé
 * @checkpoint email-force-saved
 * 
 * PouchDB:
 * 1. Récupérer le document: db.get('contact:{id}')
 * 2. Modifier: doc.emailForce = emailForceValue
 * 3. Sauvegarder: db.put(doc)
 * 
 * Auto-sync: Le changement est poussé vers CouchDB
 * 
 * Success: 
 *   - Met à jour le contact localement (via changes listener)
 *   - Ferme la modale
 *   - Toast success
 * Error: Toast error (conflit de révision), garde modale ouverte
 */
```

## PouchDB Operations

### Sauvegarder l'email forcé

```javascript
// Validation email
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Sauvegarder via PouchDB
async saveEmailForce() {
  if (!this.selectedContact || !this.emailForceValue) return;
  
  if (!isValidEmail(this.emailForceValue)) {
    this.toast('Email invalide', 'error');
    return;
  }
  
  try {
    // Récupérer le document avec sa révision
    const doc = await db.get('contact:' + this.selectedContact.id);
    
    // Modifier l'email forcé
    doc.emailForce = this.emailForceValue;
    doc.emailForceUpdatedAt = new Date().toISOString();
    
    // Sauvegarder localement
    const response = await db.put(doc);
    // response: { ok: true, id: 'contact:...', rev: '2-xxx...' }
    
    // Succès - l'UI se met à jour automatiquement via changes listener
    this.showEmailForceModal = false;
    this.selectedContact = null;
    this.emailForceValue = '';
    this.toast('Email forcé enregistré');
    
  } catch (err) {
    if (err.status === 409) {
      // Conflit: recharger et réessayer
      this.toast('Conflit de version, veuillez réessayer', 'error');
    } else {
      this.toast('Erreur: ' + err.message, 'error');
    }
  }
}
```

### Supprimer l'email forcé

```javascript
async removeEmailForce(contactId) {
  try {
    const doc = await db.get('contact:' + contactId);
    delete doc.emailForce;
    delete doc.emailForceUpdatedAt;
    await db.put(doc);
    this.toast('Email forcé supprimé');
  } catch (err) {
    this.toast('Erreur: ' + err.message, 'error');
  }
}
```

## State

```javascript
// Ouvrir modale
openSetEmailForce(contact) {
  this.selectedContact = contact;
  this.showEmailForceModal = true;
  this.emailForceValue = contact?.emailForce || '';
  this.emailForceSearch = '';
}

// Sauvegarder (PouchDB version)
async saveEmailForce() {
  if (!this.selectedContact || !this.emailForceValue) return;
  
  // Validation
  if (!isValidEmail(this.emailForceValue)) {
    this.toast('Email invalide', 'error');
    return;
  }
  
  try {
    const doc = await db.get('contact:' + this.selectedContact.id);
    doc.emailForce = this.emailForceValue;
    await db.put(doc);
    
    // Réinitialiser
    this.showEmailForceModal = false;
    this.selectedContact = null;
    this.emailForceValue = '';
    this.toast('Email forcé enregistré');
    
  } catch (err) {
    this.toast('Erreur: ' + err.message, 'error');
  }
}
```

## Computed Properties - Recherche (locale)

```javascript
// Entreprises disponibles pour l'email forcé
// Source: contacts déjà en mémoire (chargés par contacts-load-all)
get emailForceEntreprises() {
  if (!this.emailForceSearch) {
    return this.contacts
      .filter(c => c.typePersonne === 'M' && 
                  c.statut !== 'blacklist' && 
                  !c.isBlacklisted)
      .slice(0, 5);
  }
  const q = this.emailForceSearch.toLowerCase();
  return this.contacts
    .filter(c => c.typePersonne === 'M' && 
                c.statut !== 'blacklist' && 
                !c.isBlacklisted && 
                (c.nomComplet?.toLowerCase() || '').includes(q))
    .slice(0, 5);
}

// Personnes sans entreprise disponibles
get emailForcePersonnes() {
  if (!this.emailForceSearch) {
    return this.contacts
      .filter(c => c.typePersonne === 'P' && 
                  !c.entrepriseId && 
                  !c.societesLiees &&
                  c.statut !== 'blacklist' && 
                  !c.isBlacklisted)
      .slice(0, 5);
  }
  const q = this.emailForceSearch.toLowerCase();
  return this.contacts
    .filter(c => c.typePersonne === 'P' && 
                !c.entrepriseId && 
                !c.societesLiees &&
                c.statut !== 'blacklist' && 
                !c.isBlacklisted &&
                (c.nomComplet?.toLowerCase() || '').includes(q))
    .slice(0, 5);
}
```

## UI - Structure de la modale

```
┌─────────────────────────────────────┐
│  DÉFINIR UN EMAIL FORCÉ         [X] │
├─────────────────────────────────────┤
│                                     │
│  Contact sélectionné               │
│  ┌─────────────────────────────┐   │
│  │ Marie Lefebvre              │   │
│  │ Email: marie@email.com      │   │
│  │ Email forcé: pro@email.com  │   │  ← Affiché si existe
│  └─────────────────────────────┘   │
│                                     │
│  Email forcé                       │
│  [finance@entreprise.fr       ]    │  ← Input modifiable
│                                     │
│  ──────────────────────────────────│
│                                     │
│  Ou sélectionnez un autre contact  │
│  [🔍 Rechercher un contact...]     │  ← Input recherche
│                                     │
│  Entreprises (2)                   │  ← Section si résultats
│  ┌─────────────────────────────┐   │
│  │ 🏢 ACME Corporation     [✓] │   │  ← Sélectionné si cliqué
│  │    contact@acme.fr          │   │
│  └─────────────────────────────┘   │
│  ┌─────────────────────────────┐   │
│  │ 🏢 TechStart SARL      [F]  │   │  ← Badge [F] si email forcé
│  │    finance@techstart.fr   │   │
│  └─────────────────────────────┘   │
│                                     │
│  Personnes sans entreprise (1)     │
│  ┌─────────────────────────────┐   │
│  │ 👤 Emma Moreau                │   │
│  │    emma.pro@consultant.fr     │   │
│  └─────────────────────────────┘   │
│                                     │
├─────────────────────────────────────┤
│  [Annuler]    [Enregistrer]        │
└─────────────────────────────────────┘
```

## Checkpoints attendus

1. `email-force-modal-opened` → Modale ouverte avec contact
2. `email-force-search` → Recherche lancée (filtrage local)
3. `email-force-contact-selected` → Contact sélectionné dans la liste
4. `email-force-saved` → Email forcé sauvegardé dans PouchDB

## Validation

| Champ | Règle | Message d'erreur |
|-------|-------|------------------|
| emailForceValue | Format email valide | "Email invalide" |
| emailForceValue | Requis | "L'email est requis" |

## Exemple de données avant/après

```javascript
// Avant (dans PouchDB)
{
  "_id": "contact:550e8400-...",
  "_rev": "1-abc123...",
  "type": "contact",
  "id": "M3",
  "nomComplet": "ACME Corporation",
  "email": "contact@acme.fr",
  "emailForce": null
}

// Après sauvegarde (dans PouchDB, puis sync CouchDB)
{
  "_id": "contact:550e8400-...",
  "_rev": "2-def456...",  // ← Nouvelle révision
  "type": "contact",
  "id": "M3",
  "nomComplet": "ACME Corporation",
  "email": "contact@acme.fr",
  "emailForce": "finance@acme.fr",
  "emailForceUpdatedAt": "2026-07-21T14:30:00.000Z"
}
```

## Fichiers liés

- Mockup: `specs/mockups/contacts.html`
- Composant: `app/templates/contacts/workflows/set-email-force.html`

---

## Migration depuis l'ancienne API

| Avant (API) | Après (PouchDB) |
|-------------|-----------------|
| `PUT /api/contacts/{id}` avec `email_force` | `db.get('contact:{id}')` puis `db.put(doc)` |
| Recherche contacts via API | Recherche locale sur `this.contacts` déjà en mémoire |
| Pas de révision | Gestion `_rev` obligatoire |
| Mise à jour UI via response | UI mise à jour via `changes` event PouchDB |
