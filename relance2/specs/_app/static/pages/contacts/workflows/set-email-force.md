# Workflow : Définir email forcé

## Écran
`contacts.html`

## Description
Ouvre une modale permettant de définir un email de relance forcé pour un contact. L'email forcé remplace l'email principal lors de l'envoi des relances.

## Actions possibles

### 1. Ouvrir la modale
**Élément déclencheur:** Bouton "Définir email forcé" dans le menu actions du contact

**Data:**
- `selectedContactForEmailForce` ← contact sélectionné
- `emailForceMode` ← 'remove' si contact a déjà un email forcé, sinon 'select'
- `selectedContactEmail` ← ''
- `manualEmailForce` ← ''
- `emailForceSearchQuery` ← ''
- `emailForceSearchResults` ← []
- `showSetEmailForceModal` ← true

### 2. Rechercher un contact existant
**Élément déclencheur:** Input de recherche dans la modale

**Action:** `searchEmailForceContacts()`
- Filtre les contacts (exclut le contact courant, nécessite un email)
- Recherche sur nom, email, entreprise
- Limite à 10 résultats

**State:**
- `emailForceSearchResults` ← contacts filtrés

### 3. Sélectionner un contact
**Élément déclencheur:** Clique sur un résultat de recherche

**State:**
- `selectedContactEmail` ← email du contact sélectionné
- `emailForceSearchQuery` ← nom complet + email (affichage)
- `emailForceSearchResults` ← [] (vide la liste)

### 4. Saisir un email manuel
**Élément déclencheur:** Radio "Renseigner un email" + input

**State:**
- `emailForceMode` ← 'manual'
- `manualEmailForce` ← valeur saisie

### 5. Supprimer l'email forcé
**Élément déclencheur:** Radio "Supprimer l'email forcé" (visible uniquement si email forcé existe)

**State:**
- `emailForceMode` ← 'remove'

### 6. Sauvegarder
**Élément déclencheur:** Bouton "Enregistrer"

**Action:** `saveEmailForce()`
- Appel API pour sauvegarder en base de données
- Si `emailForceMode === 'remove'`: supprime l'email forcé (envoie `null` ou chaîne vide)
- Si `emailForceMode === 'select'` et `selectedContactEmail`: définit l'email forcé
- Si `emailForceMode === 'manual'` et `manualEmailForce`: définit l'email forcé
- Met à jour `selectedContact` si ouvert depuis le détail
- Ferme la modale

### 7. Annuler
**Élément déclencheur:** Bouton "Annuler" ou clic sur l'overlay

**State:**
- `showSetEmailForceModal` ← false
- Réinitialise les états temporaires

## Data Model

**Page Function:** `contactsPage()`

**Données:**
- `contacts` - liste des contacts pour la recherche
- `selectedContact` - contact affiché dans le slideover détail
- `selectedContactForEmailForce` - contact en cours d'édition
- `emailForceMode` - 'select' | 'manual' | 'remove'
- `selectedContactEmail` - email choisi parmi les contacts
- `manualEmailForce` - email saisi manuellement
- `emailForceSearchQuery` - texte de recherche
- `emailForceSearchResults` - résultats de recherche

**États UI:**
- `showSetEmailForceModal` - affichage de la modale
- `showDetailSlideover` - slideover de détail (à mettre à jour si besoin)

## API Calls

**Endpoint:** `PUT /api/contacts/{id}`

**Payload:**
```json
{
  "emailForce": string | null
}
```

**Response:** `ApiResponse<Contact>`

**Error Handling:**
- Affiche un toast d'erreur si l'API échoue
- Garde la modale ouverte en cas d'erreur pour permettre une nouvelle tentative

## State Changes

**Modifications:**
- `selectedContactForEmailForce.emailForce` ← nouvelle valeur ou vide
- `selectedContact.emailForce` ← synchronisé si même contact

## Organisation des fichiers

```
frontend/
└── app/
    └── contacts/
        ├── index.html
        ├── components/
        │   └── (composants partagés)
        └── js/
            └── set-email-force.js
```

### Fichier principal
- **HTML** : `frontend/app/contacts/index.html`
- **Point d'entrée** : Initialise la page Alpine.js

### Fichier workflow
- **JS** : `frontend/app/contacts/js/set-email-force.js`
- **Export** : Fonctions utilisables dans `index.html`

```javascript
// frontend/app/contacts/js/set-email-force.js
export function setEmailForceWorkflow() {
  return {
    openSetEmailForce(contact) { /* ... */ },
    searchEmailForceContacts() { /* ... */ },
    selectEmailForceContact(contact) { /* ... */ },
    saveEmailForce() { /* ... */ },
    closeEmailForceModal() { /* ... */ }
  }
}
```

## Implementation

```javascript
setEmailForceWorkflow() {
  return {
    // State
    selectedContactForEmailForce: null,
    emailForceMode: 'select',
    selectedContactEmail: '',
    manualEmailForce: '',
    emailForceSearchQuery: '',
    emailForceSearchResults: [],
    showSetEmailForceModal: false,

    openSetEmailForce(contact) {
      this.selectedContactForEmailForce = contact;
      this.emailForceMode = contact.emailForce ? 'remove' : 'select';
      this.selectedContactEmail = '';
      this.manualEmailForce = '';
      this.emailForceSearchQuery = '';
      this.emailForceSearchResults = [];
      this.showSetEmailForceModal = true;
    },

    searchEmailForceContacts() {
      const query = this.emailForceSearchQuery.toLowerCase().trim();
      if (!query) {
        this.emailForceSearchResults = [];
        return;
      }

      this.emailForceSearchResults = this.contacts
        .filter(c => c.id !== this.selectedContactForEmailForce?.id && c.email)
        .filter(c =>
          c.nomComplet.toLowerCase().includes(query) ||
          c.email.toLowerCase().includes(query) ||
          c.entreprise.toLowerCase().includes(query)
        )
        .slice(0, 10);
    },

    selectEmailForceContact(contact) {
      this.selectedContactEmail = contact.email;
      this.emailForceSearchQuery = `${contact.nomComplet} (${contact.email})`;
      this.emailForceSearchResults = [];
    },

    async saveEmailForce() {
      if (!this.selectedContactForEmailForce) return;

      let newEmailForce = '';

      if (this.emailForceMode === 'remove') {
        newEmailForce = '';
      } else if (this.emailForceMode === 'select' && this.selectedContactEmail) {
        newEmailForce = this.selectedContactEmail;
      } else if (this.emailForceMode === 'manual' && this.manualEmailForce) {
        newEmailForce = this.manualEmailForce;
      }

      try {
        // Appel API pour sauvegarder
        const response = await fetch(`/api/contacts/${this.selectedContactForEmailForce.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ emailForce: newEmailForce || null })
        });

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error?.message || 'Erreur lors de la sauvegarde');
        }

        // Mise à jour du contact local avec les données du serveur
        this.selectedContactForEmailForce.emailForce = data.data.emailForce;

        // Synchronise selectedContact si c'est le même
        if (this.selectedContact?.id === this.selectedContactForEmailForce.id) {
          this.selectedContact.emailForce = data.data.emailForce;
        }

        // Toast de succès
        Alpine.store('ui').addToast('Email forcé enregistré', 'success');

        this.closeEmailForceModal();

      } catch (error) {
        // Toast d'erreur, garde la modale ouverte
        Alpine.store('ui').addToast(error.message, 'error');
      }
    },

    closeEmailForceModal() {
      this.showSetEmailForceModal = false;
      this.selectedContactForEmailForce = null;
      this.selectedContactEmail = '';
      this.manualEmailForce = '';
      this.emailForceSearchQuery = '';
      this.emailForceSearchResults = [];
    }
  }
}
```

## Logs (console.log) - OBLIGATOIRE

Chaque étape du workflow doit être loguée avec `console.log()`:

| Checkpoint | Instruction console.log |
|------------|------------------------|
| `start` | `console.log('[WORKFLOW.contacts-set-email-force] START: Définition email forcé pour contact', contactId)` |
| `validation` | `console.log('[WORKFLOW.contacts-set-email-force] STEP: Validation email - mode:', mode, 'valeur:', emailValue, 'valide:', isValid)` |
| `api-call` | `console.log('[WORKFLOW.contacts-set-email-force] API: PUT /api/contacts/{id} - emailForce:', payload)` |
| `response` | `console.log('[WORKFLOW.contacts-set-email-force] API_RESPONSE: success=', data.success, 'emailForce=', data.data?.emailForce)` |
| `success` | `console.log('[WORKFLOW.contacts-set-email-force] SUCCESS: Email forcé enregistré:', emailForce, 'pour contact', contactId)` |
| `end` | `console.log('[WORKFLOW.contacts-set-email-force] END: Modale fermée en', duree, 'ms')` |
| `error` | `console.error('[WORKFLOW.contacts-set-email-force] ERROR:', error)` |
