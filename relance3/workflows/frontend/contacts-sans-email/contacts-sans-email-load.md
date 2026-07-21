---
id: contacts-sans-email-load
type: frontend
folder: specs/workflows/frontend/contacts-sans-email/
description: Charge les contacts sans adresse email
depends_on: [auth-check]
screen: contacts-sans-email
global: false
mockup_entry: specs/mockups/contacts-sans-email.html
---

# contacts-sans-email-load : Charger contacts sans email

## Description

Workflow qui charge uniquement les contacts n'ayant pas d'adresse email renseignée.

## Flow

```javascript
/**
 * @action Initialiser le workflow
 * @checkpoint wf-sans-email-init
 * State: { loading: true, contacts: [] }
 */

/**
 * @action Construire l'URL
 * @checkpoint wf-sans-email-url-built
 * Params: { sans_email: '1', limit: 1000, search: this.searchQuery }
 * URL: '/api/contacts?sans_email=1&limit=1000'
 */

/**
 * @action Fetch API
 * @checkpoint wf-sans-email-api-called
 * Response: { contacts: [...] }
 */

/**
 * @action Normaliser les données
 * @checkpoint wf-sans-email-data-normalized
 * Transformations: standard contact normalization
 */

/**
 * @action Terminer
 * @checkpoint wf-sans-email-complete
 * State: { loading: false, contacts: [...] }
 */

/**
 * @action Erreur
 * @checkpoint wf-sans-email-error
 * State: { loading: false, contacts: [], error: message }
 */
```

## API

| Méthode | Endpoint | Params |
|---------|----------|--------|
| GET | `/api/contacts?sans_email=1` | `limit`, `search` |

## Checkpoints

1. `wf-sans-email-init`
2. `wf-sans-email-url-built`
3. `wf-sans-email-api-called`
4. `wf-sans-email-data-normalized`
5. `wf-sans-email-complete` | `wf-sans-email-error`

## Data retournée

```javascript
{
  contacts: [
    {
      id: "123",
      nomComplet: "Sophie Bernard",
      typePersonne: "P",
      entreprise: "Digital Agency",
      telephone: "06 12 34 56 78",
      email: null,
      impayesCount: 0
    }
  ]
}
```

## UI

- Cards avec bordure orange (amber)
- Badge "Sans email" rouge
- Bouton principal "Définir email forcé"

## Fichiers liés

- Mockup: `specs/mockups/contacts-sans-email.html`
