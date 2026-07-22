---
id: contacts-blacklist-load
type: frontend
folder: specs/workflows/frontend/contacts-blacklist/
description: Charge les contacts blacklistés depuis PouchDB local
depends_on: [auth-check]
screen: contacts-blacklist
global: false
mockup_entry: specs/mockups/contacts-blacklist.html
---

# contacts-blacklist-load : Charger contacts blacklistés

## Description

Workflow qui charge uniquement les contacts ayant le statut blacklist depuis **PouchDB local**.
Les données sont synchronisées automatiquement avec CouchDB distant.

## Flow

```javascript
/**
 * @action Initialiser le workflow
 * @checkpoint wf-blacklist-init
 * State: { loading: true, contacts: [] }
 * PouchDB ready: db = new PouchDB('marki-contacts')
 */

/**
 * @action Requête PouchDB - contacts blacklistés
 * @checkpoint wf-blacklist-db-called
 * Query: db.find({ 
 *   selector: { 
 *     type: 'contact',
 *     $or: [
 *       { isBlacklisted: { $eq: 1 } },
 *       { statut: { $eq: 'blacklist' } }
 *     ]
 *   }
 * })
 */

/**
 * @action Configurer le changement en temps réel
 * @checkpoint wf-blacklist-changes-listener
 * db.changes({ since: 'now', live: true, include_docs: true })
 * → Met à jour la liste automatiquement sur changements
 */

/**
 * @action Appliquer le filtre de recherche (côté client)
 * @checkpoint wf-blacklist-filtered
 * Filtrage sur nomComplet, email ou societesLiees
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

## PouchDB Operations

### Charger les contacts blacklistés

```javascript
// Option 1: allDocs avec filtrage côté client (rapide)
const result = await db.allDocs({
  startkey: 'contact:',
  endkey: 'contact:\ufff0',
  include_docs: true
});

let contacts = result.rows
  .map(row => row.doc)
  .filter(doc => doc.isBlacklisted === 1 || doc.statut === 'blacklist');

// Option 2: Mango query avec pouchdb-find (nécessite index)
const result = await db.find({
  selector: {
    type: { $eq: 'contact' },
    $or: [
      { isBlacklisted: { $eq: 1 } },
      { statut: { $eq: 'blacklist' } }
    ]
  }
});
const contacts = result.docs;

// Appliquer le filtre de recherche (côté client)
if (this.searchQuery) {
  const q = this.searchQuery.toLowerCase();
  contacts = contacts.filter(c =>
    (c.nomComplet?.toLowerCase().includes(q)) ||
    (c.email?.toLowerCase().includes(q)) ||
    (c.societesLiees?.toLowerCase().includes(q))
  );
}
```

### Créer l'index Mango (première utilisation)

```javascript
// Créer un index pour optimiser les recherches par statut
await db.createIndex({
  index: {
    fields: ['type', 'isBlacklisted', 'statut', 'nomComplet']
  },
  name: 'idx-contacts-blacklist'
});
```

## Checkpoints

1. `wf-blacklist-init`
2. `wf-blacklist-db-called`
3. `wf-blacklist-changes-listener`
4. `wf-blacklist-filtered`
5. `wf-blacklist-data-normalized`
6. `wf-blacklist-complete` | `wf-blacklist-error`

## Data retournée

```javascript
{
  contacts: [
    {
      _id: "contact:550e8400-...",
      _rev: "2-abc123...",
      type: "contact",
      id: "123",
      nomComplet: "Lucas Petit",
      typePersonne: "P",
      entreprise: "Consulting Pro",
      email: "lucas@consultingpro.fr",
      telephone: "01 45 67 89 01",
      impayesCount: 1,
      dateBlacklist: "2024-01-15",  // Date de mise en blacklist
      blacklistedAt: "2024-01-15T10:30:00.000Z",
      isBlacklisted: 1,
      statut: "blacklist"
    }
  ]
}
```

## Live Sync

```javascript
// Mise à jour temps réel
db.changes({
  since: 'now',
  live: true,
  include_docs: true
}).on('change', (change) => {
  if (change.doc.type === 'contact') {
    const isBlacklisted = change.doc.isBlacklisted === 1 || 
                          change.doc.statut === 'blacklist';
    
    if (isBlacklisted) {
      // Ajouter ou mettre à jour dans la liste
      updateOrAddContact(change.doc);
    } else {
      // Retirer de la liste s'il n'est plus blacklisté
      removeContact(change.doc._id);
    }
  }
});
```

## UI

- Cards avec bordure rouge
- Badge "Blacklist"
- Bouton principal "Retirer de la blacklist" (vert)
- Affichage de la date de blacklist

## Fichiers liés

- Mockup: `specs/mockups/contacts-blacklist.html`

---

## Migration depuis l'ancienne API

| Avant (API) | Après (PouchDB) |
|-------------|-----------------|
| `GET /api/contacts?is_blacklisted=1` | `db.allDocs()` ou `db.find()` avec filtre |
| Filtrage côté serveur | Filtrage côté client sur `isBlacklisted` ou `statut` |
| Rechargement manuel | Live sync automatique avec `db.changes()` |
| `search` paramètre | Filtrage JavaScript sur les résultats PouchDB |
