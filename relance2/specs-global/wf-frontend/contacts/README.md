---
id: contacts-workflows
type: frontend
folder: specs/workflows/frontend/contacts/
description: Workflows frontend pour la page Contacts (cards unifiées M et P)
screens: [contacts]
global: false
---

# Workflows Frontend - Page Contacts

## Vue d'ensemble

Page Contacts avec affichage en **cards unifiées** :
- Toutes les cards (entreprises M et personnes P) sont mélangées et triées alphabétiquement
- Les entreprises affichent leurs collaborateurs dans une section dédiée
- Les personnes avec relation (tutelle, époux) affichent leur "Contact lié"
- Les contacts blacklistés restent visibles avec un badge
- Modale simplifiée pour l'email forcé (input + recherche)
- Modale de confirmation pour le blacklistage

## Architecture

```
contactsPage (Alpine.js)
├── WORKFLOW: contacts-load-all
│   ├── @checkpoint wf-load-init
│   ├── @checkpoint wf-load-url-built
│   ├── @checkpoint wf-load-api-called
│   ├── @checkpoint wf-load-data-normalized
│   ├── @checkpoint wf-load-related-linked  ← Nouveau: charge les contacts liés
│   └── @checkpoint wf-load-complete
│
├── WORKFLOW: contacts-set-email-force
│   ├── @checkpoint email-force-modal-opened
│   ├── @checkpoint email-force-search       ← Recherche parmi les contacts
│   ├── @checkpoint email-force-contact-selected
│   └── @checkpoint email-force-saved
│
├── WORKFLOW: contacts-blacklist             ← Nouveau
│   ├── @checkpoint blacklist-modal-opened
│   └── @checkpoint blacklist-confirmed
│
└── WORKFLOW: contacts-export
    └── @checkpoint export-requested
```

## Workflows disponibles

| Workflow | ID | Description | Fichier |
|----------|-----|-------------|---------|
| **Load All** | `contacts-load-all` | Charge tous les contacts + liens | [contacts-load-all.md](./contacts-load-all.md) |
| **Set Email Force** | `contacts-set-email-force` | Définit un email forcé via modale | [contacts-set-email-force.md](./contacts-set-email-force.md) |
| **Blacklist** | `contacts-blacklist` | Confirme et applique le blacklist | [contacts-blacklist.md](./contacts-blacklist.md) |
| **Export** | `contacts-export` | Exporte les contacts | [contacts-export.md](./contacts-export.md) |

## Data Model

```javascript
{
  // State
  loading: false,
  searchQuery: '',
  currentPage: 1,
  itemsPerPage: 50,
  
  // Data from API
  contacts: [], // Tous les contacts (P et M) - from GET /api/contacts
  
  // Stats from API - GET /api/contacts/stats
  stats: {
    total: 0,          // Calculé par le backend
    entreprises: 0,    // Calculé par le backend
    personnes: 0,      // Calculé par le backend
    avecImpayes: 0,    // Calculé par le backend
    blacklist: 0,      // Calculé par le backend
    sansEmail: 0       // Calculé par le backend
  },
  
  // UI State - Modales
  showEmailForceModal: false,
  showBlacklistModal: false,
  
  // Selected
  selectedContact: null,
  contactToBlacklist: null,
  
  // Email force
  emailForceValue: '',
  emailForceSearch: '',
}
```

## Computed Properties

```javascript
// Contacts triés selon le filtre de recherche
get filteredContacts()

// Entreprises avec leurs collaborateurs
get entreprisesAvecPersonnes()

// Personnes sans entreprise et sans relation personne
get personnesSansEntreprise()

// Personnes avec une relation à un autre particulier (tutelle, époux)
get personnesAvecTutelle()

// Tous les contacts mélangés et triés alphabétiquement
get allContactsSorted()

// Résultats de recherche pour la modale email forcé
get emailForceEntreprises()
get emailForcePersonnes()
```

## Types de relations entre contacts

```javascript
// Relation entreprise -> personne (collaborateur)
{
  typePersonne: 'P',
  entrepriseId: 'M1',
  societesLiees: 'ACME Corporation'
}

// Relation personne -> personne (tutelle, époux)
{
  typePersonne: 'P',
  relationPersonne: 'Lucas Petit',
  typeRelation: 'tutelle',      // ou 'epoux', 'conjoint', etc.
  descriptionRelation: 'Sous tutelle de'
}
```

## API Endpoints

| Workflow | Méthode | Endpoint | Description |
|----------|---------|----------|-------------|
| load-all | GET | `/api/contacts?limit=1000` | Tous les contacts |
| set-email-force | PUT | `/api/contacts/{id}` | Met à jour email_force |
| blacklist | PUT | `/api/contacts/{id}/blacklist` | Blackliste le contact |
| export | POST | `/api/contacts/export` | Export Excel |

## Structure des Cards

### Card Entreprise (type='M')
```
┌─────────────────────────────────────┐
│  [🏢] Nom Entreprise    [BlackListé]│ ← Badge si blacklisté
│  email@entreprise.fr | 3 impayés    │
│  [✉️ Email forcé] [⛔ Blacklister]   │
│  ───────────────────────────────────│
│  Collaborateurs:                     │
│  ┌────────────────────────────────┐ │
│  │ [JD] Jean Dupont   [✉️] [⛔]  │ │
│  │    Directeur Financier         │ │
│  └────────────────────────────────┘ │
└─────────────────────────────────────┘
```

### Card Personne standard (type='P')
```
┌─────────────────────────────────────┐
│  [👤] Nom Personne      [BlackListé]│
│  Fonction | Email manquant 🔔        │ ← Badge si pas d'email
│  [✉️ Email forcé] [⛔ Blacklister]   │
└─────────────────────────────────────┘
```

### Card Personne avec Contact lié (type='P' + relationPersonne)
```
┌─────────────────────────────────────┐
│  [👤] Marie Lefebvre    [BlackListé]│
│  Majeur protégé                      │
│  [✉️ Email forcé] [⛔ Blacklister]   │
│  ───────────────────────────────────│
│  Contact lié:                        │
│  ┌────────────────────────────────┐ │
│  │ [LP] Lucas Petit   [✉️] [⛔]  │ │
│  │    Tuteur                      │ │ ← typeRelation
│  └────────────────────────────────┘ │
└─────────────────────────────────────┘
```

## Badges disponibles

| Badge | Condition | Couleur |
|-------|-----------|---------|
| **X impayés** | `impayesCount > 0` | Bleu |
| **Email forcé** | `emailForce` existe | Bleu |
| **Email manquant** | `!email` | Ambre |
| **BlackListé** | `statut === 'blacklist'` | Rouge |

## Fichier de code

Le code se trouve dans :
- `app/templates/contacts/index.html`
- `app/templates/contacts/alpinejs.html`
- `app/templates/contacts/workflows/*.html`

## Mockups de référence

- `specs/mockups/contacts.html`
