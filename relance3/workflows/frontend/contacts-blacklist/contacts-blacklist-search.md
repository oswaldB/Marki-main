---
id: contacts-blacklist-search
type: frontend
folder: specs/workflows/frontend/contacts-blacklist/
description: Recherche de contacts blacklistés (backend)
depends_on: [contacts-blacklist-load]
screen: contacts-blacklist
global: false
mockup_entry: specs/mockups/contacts-blacklist.html
---

# contacts-blacklist-search : Recherche contacts blacklistés

## Description

Workflow qui effectue une recherche de contacts blacklistés côté backend avec debounce.

## Flow

```javascript
/**
 * @action Capturer l'input utilisateur
 * @checkpoint wf-blacklist-search-input
 * Event: @input sur le champ de recherche
 * Debounce: 300ms
 */

/**
 * @action Vérifier la query
 * @checkpoint wf-blacklist-search-validated
 * Condition: searchQuery.trim().length >= 2 || searchQuery === ''
 */

/**
 * @action Construire l'URL de recherche
 * @checkpoint wf-blacklist-search-url-built
 * Params: { 
 *   is_blacklisted: '1',
 *   search: this.searchQuery.trim(),
 *   limit: 1000
 * }
 * URL: '/api/contacts?is_blacklisted=1&search={query}&limit=1000'
 */

/**
 * @action Appeler l'API backend
 * @checkpoint wf-blacklist-search-api-called
 * Request: GET /api/contacts?is_blacklisted=1&search={query}
 * Loading: true
 */

/**
 * @action Traiter la réponse
 * @checkpoint wf-blacklist-search-response
 * Response: { contacts: [...], total: N }
 */

/**
 * @action Mettre à jour l'état
 * @checkpoint wf-blacklist-search-complete
 * State: { 
 *   loading: false, 
 *   contacts: filteredResults,
 *   currentPage: 1  // Reset pagination
 * }
 */

/**
 * @action Erreur réseau/API
 * @checkpoint wf-blacklist-search-error
 * State: { loading: false, error: 'Erreur de recherche' }
 */
```

## API

| Méthode | Endpoint | Params |
|---------|----------|--------|
| GET | `/api/contacts?is_blacklisted=1` | `search` (string), `limit` |

## Checkpoints

1. `wf-blacklist-search-input` - Input capturé avec debounce
2. `wf-blacklist-search-validated` - Query validée (min 2 caractères ou vide)
3. `wf-blacklist-search-url-built` - URL construite
4. `wf-blacklist-search-api-called` - API appelée
5. `wf-blacklist-search-response` - Réponse reçue
6. `wf-blacklist-search-complete` | `wf-blacklist-search-error`

## Paramètres de recherche

```javascript
{
  search: "lucas",        // Recherche sur nom, entreprise, email
  is_blacklisted: "1",    // Filtre obligatoire
  limit: 1000             // Pagination côté client ensuite
}
```

## UI

- Champ de recherche avec icône loupe
- État loading pendant la recherche
- Message "Aucun résultat" si vide
- Pagination réinitialisée à la page 1 après chaque recherche

## Debounce

```javascript
// 300ms de debounce avant d'appeler l'API
let debounceTimer;
@input="clearTimeout(debounceTimer); debounceTimer = setTimeout(() => search(), 300)"
```

## Fichiers liés

- Mockup: `specs/mockups/contacts-blacklist.html`
- Workflow load: `contacts-blacklist-load.md`
