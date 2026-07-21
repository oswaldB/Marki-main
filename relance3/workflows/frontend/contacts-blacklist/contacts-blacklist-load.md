---
id: contacts-blacklist-load
type: frontend
folder: specs/workflows/frontend/contacts-blacklist/
description: Charge les contacts blacklistés
depends_on: [auth-check]
screen: contacts-blacklist
global: false
mockup_entry: specs/mockups/contacts-blacklist.html
---

# contacts-blacklist-load : Charger contacts blacklistés

## Description

Workflow qui charge uniquement les contacts ayant le statut blacklist (is_blacklisted=1).

## Flow

```javascript
/**
 * @action Initialiser le workflow
 * @checkpoint wf-blacklist-init
 * State: { loading: true, contacts: [] }
 */

/**
 * @action Construire l'URL
 * @checkpoint wf-blacklist-url-built
 * Params: { is_blacklisted: '1', limit: 1000, search: this.searchQuery }
 * URL: '/api/contacts?is_blacklisted=1&limit=1000'
 */

/**
 * @action Fetch API
 * @checkpoint wf-blacklist-api-called
 * Response: { contacts: [...] }
 */

/**
 * @action Normaliser les données
 * @checkpoint wf-blacklist-data-normalized
 * Transformations: standard contact normalization + date de blacklist
 */

/**
 * @action Terminer
 * @checkpoint wf-blacklist-complete
 * State: { loading: false, contacts: [...] }
 */

/**
 * @action Erreur
 * @checkpoint wf-blacklist-error
 * State: { loading: false, contacts: [], error: message }
 */
```

## API

| Méthode | Endpoint | Params |
|---------|----------|--------|
| GET | `/api/contacts?is_blacklisted=1` | `limit`, `search` |

## Checkpoints

1. `wf-blacklist-init`
2. `wf-blacklist-url-built`
3. `wf-blacklist-api-called`
4. `wf-blacklist-data-normalized`
5. `wf-blacklist-complete` | `wf-blacklist-error`

## Data retournée

```javascript
{
  contacts: [
    {
      id: "123",
      nomComplet: "Lucas Petit",
      typePersonne: "P",
      entreprise: "Consulting Pro",
      email: "lucas@consultingpro.fr",
      telephone: "01 45 67 89 01",
      impayesCount: 1,
      dateBlacklist: "2024-01-15",  // Date de mise en blacklist
      isBlacklisted: 1
    }
  ]
}
```

## UI

- Cards avec bordure rouge
- Badge "Blacklist"
- Bouton principal "Retirer de la blacklist" (vert)
- Affichage de la date de blacklist

## Fichiers liés

- Mockup: `specs/mockups/contacts-blacklist.html`
