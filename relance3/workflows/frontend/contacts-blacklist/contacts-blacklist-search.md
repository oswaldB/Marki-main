---
id: contacts-blacklist-search
type: frontend
folder: specs/workflows/frontend/contacts-blacklist/
description: Recherche de contacts blacklistés (côté client sur PouchDB)
depends_on: [contacts-blacklist-load]
screen: contacts-blacklist
global: false
mockup_entry: specs/mockups/contacts-blacklist.html
---

# contacts-blacklist-search : Recherche contacts blacklistés

## Description

Workflow qui effectue une recherche de contacts blacklistés **côté client** sur les données PouchDB déjà chargées.
Pas d'appel backend - le filtrage est instantané en mémoire.

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
 * @action Filtrer les contacts en mémoire
 * @checkpoint wf-blacklist-search-filtered
 * Filtre côté client sur:
 * - nomComplet (insensible à la casse)
 * - email (insensible à la casse)
 * - societesLiees (insensible à la casse)
 * - telephone
 */

/**
 * @action Mettre à jour l'état
 * @checkpoint wf-blacklist-search-complete
 * State: { 
 *   loading: false, 
 *   filteredContacts: results,
 *   currentPage: 1  // Reset pagination
 * }
 */

/**
 * @action Erreur
 * @checkpoint wf-blacklist-search-error
 * State: { error: 'Erreur de recherche' }
 */
```

## PouchDB Operations

### Recherche côté client (filtrage mémoire)

```javascript
// Les contacts sont déjà chargés en mémoire par contacts-blacklist-load
// this.blacklistedContacts = [...] (tous les contacts blacklistés)

function searchBlacklistedContacts(query) {
  if (!query || query.trim() === '') {
    return this.blacklistedContacts;
  }
  
  const q = query.toLowerCase().trim();
  
  return this.blacklistedContacts.filter(contact => {
    return (
      (contact.nomComplet?.toLowerCase().includes(q)) ||
      (contact.email?.toLowerCase().includes(q)) ||
      (contact.societesLiees?.toLowerCase().includes(q)) ||
      (contact.telephone?.includes(q))
    );
  });
}
```

## State

```javascript
// Reactive data
{
  searchQuery: '',           // Input utilisateur
  allBlacklistedContacts: [], // Tous les contacts (depuis PouchDB)
  filteredContacts: [],      // Résultats filtrés
  debounceTimer: null
}

// Méthode de recherche avec debounce
onSearchInput() {
  clearTimeout(this.debounceTimer);
  this.debounceTimer = setTimeout(() => {
    this.performSearch();
  }, 300);
}

performSearch() {
  const query = this.searchQuery.trim();
  
  // Validation: min 2 caractères ou vide
  if (query.length > 0 && query.length < 2) {
    return; // Attendre plus de caractères
  }
  
  // Filtrage côté client (instantané)
  if (query === '') {
    this.filteredContacts = [...this.allBlacklistedContacts];
  } else {
    const q = query.toLowerCase();
    this.filteredContacts = this.allBlacklistedContacts.filter(c =>
      (c.nomComplet?.toLowerCase().includes(q)) ||
      (c.email?.toLowerCase().includes(q)) ||
      (c.societesLiees?.toLowerCase().includes(q))
    );
  }
  
  // Reset pagination
  this.currentPage = 1;
}
```

## Checkpoints

1. `wf-blacklist-search-input` - Input capturé avec debounce
2. `wf-blacklist-search-validated` - Query validée (min 2 caractères ou vide)
3. `wf-blacklist-search-filtered` - Filtrage effectué en mémoire
4. `wf-blacklist-search-complete` - Résultats affichés
5. `wf-blacklist-search-error` - Erreur (rare, filtrage synchrone)

## Paramètres de recherche

```javascript
{
  query: "lucas"  // Recherche sur nom, entreprise, email, téléphone
}
```

## Champs recherchés

| Champ | Description |
|-------|-------------|
| `nomComplet` | Nom complet du contact |
| `email` | Email principal |
| `societesLiees` | Entreprise liée (pour personnes) |
| `telephone` | Numéro de téléphone |

## UI

- Champ de recherche avec icône loupe
- **Pas de loading** (recherche instantanée)
- Message "Aucun résultat" si vide
- Pagination réinitialisée à la page 1 après chaque recherche
- Indicateur "X résultats sur Y contacts blacklistés"

## Debounce

```javascript
// 300ms de debounce avant de filtrer
let debounceTimer;
@input="clearTimeout(debounceTimer); debounceTimer = setTimeout(() => performSearch(), 300)"
```

## Avantages vs API

| Aspect | Avant (API) | Après (PouchDB local) |
|--------|-------------|----------------------|
| Latence | ~200-500ms | ~0-5ms (instantané) |
| Offline | ❌ Impossible | ✅ Fonctionne offline |
| Bande passante | Requête HTTP à chaque frappe | Aucune requête réseau |
| Serveur | Charge sur le backend | Aucune charge serveur |

## Fichiers liés

- Mockup: `specs/mockups/contacts-blacklist.html`
- Workflow load: `contacts-blacklist-load.md` (fournit les données)

---

## Migration depuis l'ancienne API

| Avant (API) | Après (PouchDB) |
|-------------|-----------------|
| `GET /api/contacts?is_blacklisted=1&search={query}` | Filtrage JavaScript sur `this.blacklistedContacts` |
| `loading: true` pendant la recherche | Pas de loading (instantané) |
| Réponse API avec `contacts` et `total` | Calcul côté client `filteredContacts.length` |
| Pagination côté serveur | Pagination côté client sur `filteredContacts` |
