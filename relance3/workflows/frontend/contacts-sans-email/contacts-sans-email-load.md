---
id: contacts-sans-email-load
type: frontend
folder: specs/workflows/frontend/contacts-sans-email/
description: Charge les contacts sans adresse email depuis PouchDB local
depends_on: [auth-check]
screen: contacts-sans-email
global: false
mockup_entry: specs/mockups/contacts-sans-email.html
---

# contacts-sans-email-load : Charger contacts sans email

## Description

Workflow qui charge uniquement les contacts n'ayant pas d'adresse email renseignée depuis **PouchDB local**.
Les données sont synchronisées automatiquement avec CouchDB distant.

## Flow

```javascript
/**
 * @action Initialiser le workflow
 * @checkpoint wf-sans-email-init
 * State: { loading: true, contacts: [] }
 * PouchDB ready: db = new PouchDB('marki-contacts')
 */

/**
 * @action Configurer le changement en temps réel
 * @checkpoint wf-sans-email-changes-listener
 * db.changes({ since: 'now', live: true, include_docs: true })
 * → Met à jour la liste automatiquement sur changements
 */

/**
 * @action Requête PouchDB - contacts sans email
 * @checkpoint wf-sans-email-db-called
 * Query: db.allDocs({ startkey: 'contact:', endkey: 'contact:\ufff0' })
 * Puis filtrage côté client: !doc.email || doc.email === ''
 */

/**
 * @action Appliquer le filtre de recherche (côté client)
 * @checkpoint wf-sans-email-filtered
 * Filtrage sur nomComplet, telephone ou societesLiees
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

## PouchDB Operations

### Charger les contacts sans email

```javascript
// Récupérer tous les contacts depuis PouchDB
const result = await db.allDocs({
  startkey: 'contact:',
  endkey: 'contact:\ufff0',
  include_docs: true
});

// Filtrer ceux sans email (côté client)
let contacts = result.rows
  .map(row => row.doc)
  .filter(doc => !doc.email || doc.email === '');

// Option: Mango query avec pouchdb-find (nécessite index)
// const result = await db.find({
//   selector: {
//     type: { $eq: 'contact' },
//     $or: [
//       { email: { $eq: '' } },
//       { email: { $exists: false } }
//     ]
//   }
// });

// Appliquer le filtre de recherche (côté client)
if (this.searchQuery) {
  const q = this.searchQuery.toLowerCase();
  contacts = contacts.filter(c =>
    (c.nomComplet?.toLowerCase().includes(q)) ||
    (c.telephone?.includes(q)) ||
    (c.societesLiees?.toLowerCase().includes(q))
  );
}
```

### Créer l'index Mango (optionnel)

```javascript
// Créer un index pour optimiser les recherches (si utilisation de pouchdb-find)
await db.createIndex({
  index: {
    fields: ['type', 'email']
  },
  name: 'idx-contacts-email'
});
```

## Checkpoints

1. `wf-sans-email-init`
2. `wf-sans-email-changes-listener`
3. `wf-sans-email-db-called`
4. `wf-sans-email-filtered`
5. `wf-sans-email-data-normalized`
6. `wf-sans-email-complete` | `wf-sans-email-error`

## Data retournée

```javascript
{
  contacts: [
    {
      _id: "contact:550e8400-...",
      _rev: "1-abc123...",
      type: "contact",
      id: "123",
      nomComplet: "Sophie Bernard",
      typePersonne: "P",
      entreprise: "Digital Agency",
      telephone: "06 12 34 56 78",
      email: null,  // ou ""
      impayesCount: 0
    }
  ]
}
```

## Live Sync

```javascript
// Mise à jour temps réel - ajouter/supprimer les contacts sans email
db.changes({
  since: 'now',
  live: true,
  include_docs: true
}).on('change', (change) => {
  if (change.doc.type === 'contact') {
    const hasEmail = change.doc.email && change.doc.email !== '';
    const existingIndex = this.contacts.findIndex(c => c._id === change.doc._id);
    
    if (!hasEmail && existingIndex === -1) {
      // Ajouter à la liste (nouveau contact sans email)
      this.contacts.push(change.doc);
    } else if (!hasEmail && existingIndex !== -1) {
      // Mettre à jour dans la liste
      this.contacts[existingIndex] = change.doc;
    } else if (hasEmail && existingIndex !== -1) {
      // Retirer de la liste (email ajouté)
      this.contacts.splice(existingIndex, 1);
    }
  }
});
```

## UI

- Cards avec bordure orange (amber)
- Badge "Sans email" rouge
- Bouton principal "Définir email forcé"

## Fichiers liés

- Mockup: `specs/mockups/contacts-sans-email.html`

---

## Migration depuis l'ancienne API

| Avant (API) | Après (PouchDB) |
|-------------|-----------------|
| `GET /api/contacts?sans_email=1` | `db.allDocs()` avec filtre côté client `!doc.email` |
| Filtrage côté serveur | Filtrage côté client en mémoire |
| Rechargement manuel | Live sync automatique avec `db.changes()` |
| `search` paramètre | Filtrage JavaScript sur les résultats PouchDB |
