# Workflow : Voir détail contact

## Écran
`contacts.html`

## Élément déclencheur
Bouton œil avec `@click="viewContact(contact)"`

## Action
Ouvrir le slideover détail du contact

## Description
Affiche les informations complètes du contact dans un slideover latéral droit :
- Informations personnelles (nom, entreprise, fonction)
- Coordonnées (email, email forcé, téléphone)
- Statut (actif, inactif, blacklist)
- Liste des impayés avec détails
- Actions disponibles (définir email forcé, fermer)

## Actions possibles dans le slideover

### 1. Ouvrir le slideover
**Élément déclencheur:** Bouton œil dans la colonne Actions du tableau

**Action:** `viewContact(contact)`
- Stocke le contact dans `selectedContact`
- Affiche le slideover avec `showDetailSlideover = true`

### 2. Définir/Modifier email forcé
**Élément déclencheur:** Bouton "Définir email forcé" ou "Modifier email forcé" dans le footer

**Action:** Appelle `openSetEmailForce(selectedContact)`
- Ouvre la modale set-email-force avec le contact courant
- Permet de définir, modifier ou supprimer l'email forcé

### 3. Fermer le slideover
**Élément déclencheur:** 
- Bouton "Fermer" dans le footer
- Bouton X dans l'en-tête
- Clic sur l'overlay sombre

**Action:** Ferme le slideover et réinitialise `selectedContact`

## Data Model

**Page Function:** `contactsPage()`

**Données:**
- `contacts` - liste des contacts
- `selectedContact` - contact affiché dans le slideover
- `showDetailSlideover` - contrôle l'affichage du slideover

**États UI:**
- `showDetailSlideover` - boolean
- `selectedContact` - objet Contact ou null

## State Changes

**Modifications:**
- `selectedContact` ← contact sélectionné
- `showDetailSlideover` ← true (ouverture) / false (fermeture)

## Dépendances avec autres workflows

Ce workflow dépend de :
- **set-email-force** - Pour l'action "Définir email forcé"

## API Calls

**Pas d'appel API** - Action côté client uniquement (lecture des données locales)

## Organisation des fichiers

```
frontend/
└── app/
    └── contacts/
        ├── index.html
        ├── components/
        │   └── (composants partagés)
        └── js/
            └── view-contact.js
```

### Fichier principal
- **HTML** : `frontend/app/contacts/index.html`
- **Point d'entrée** : Initialise la page Alpine.js

### Fichier workflow
- **JS** : `frontend/app/contacts/js/view-contact.js`
- **Export** : Fonctions utilisables dans `index.html`

```javascript
// frontend/app/contacts/js/view-contact.js
export function viewContactWorkflow() {
  return {
    viewContact(contact) { /* ... */ },
    closeDetailSlideover() { /* ... */ }
  }
}
```

## Implementation

```javascript
viewContactWorkflow() {
  return {
    selectedContact: null,
    showDetailSlideover: false,

    viewContact(contact) {
      this.selectedContact = contact;
      this.showDetailSlideover = true;
    },

    closeDetailSlideover() {
      this.showDetailSlideover = false;
      this.selectedContact = null;
    }
  }
}
```
