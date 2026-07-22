---
id: contacts-load-all
type: frontend
folder: specs/workflows/frontend/contacts/
description: Charge tous les contacts (M et P) depuis PouchDB local avec sync CouchDB
depends_on: [auth-check]
screen: contacts
global: false
mockup_entry: specs/mockups/contacts.html
---

# contacts-load-all : Charger tous les contacts

## Description

Workflow qui charge tous les contacts depuis **PouchDB local**. Les données sont synchronisées automatiquement avec CouchDB distant. L'affichage utilise des cards unifiées avec gestion des relations (entreprises ↔ personnes, personnes ↔ personnes).

## Configuration PouchDB

```javascript
// Initialisation PouchDB
const db = new PouchDB('marki-contacts');

// Sync bidirectionnel avec CouchDB distant
const remoteUrl = 'https://admin:admin@dev.markidiags.com/data/marki';
const sync = db.sync(remoteUrl, {
  live: true,
  retry: true,
  filter: function(doc) {
    // Ne synchroniser que les documents de type 'contact'
    return doc.type === 'contact';
  }
});
```

## Flow du Workflow

```javascript
/**
 * @action Initialiser le workflow
 * @checkpoint wf-load-init
 * State initial: { loading: true, contacts: [] }
 * PouchDB ready: db = new PouchDB('marki-contacts')
 */

/**
 * @action Configurer le changement en temps réel
 * @checkpoint wf-load-changes-listener
 * db.changes({ since: 'now', live: true, include_docs: true })
 * → Met à jour la liste automatiquement sur changements
 */

/**
 * @action Requête PouchDB - tous les contacts
 * @checkpoint wf-load-db-called
 * Query: db.allDocs({ include_docs: true }) 
 * OU db.find({ selector: { type: 'contact' } })
 */

/**
 * @action Transformer les documents PouchDB
 * @checkpoint wf-load-data-normalized
 * Transformations:
 * - Extraction doc._id → contact.id
 * - Calcul des initiales pour les personnes
 * - Construction du nom complet
 * - Mapping entrepriseId pour les personnes physiques
 * - Détection des relations personne ↔ personne
 * - Calcul des stats (total, entreprises, personnes, avecImpayes, blacklist, sansEmail)
 */

/**
 * @action Résoudre les liens entre contacts
 * @checkpoint wf-load-related-linked
 * Pour chaque personne avec relationPersonne:
 * - Recherche du contact lié par nom dans les docs PouchDB
 * - Injection dans contact.contactLie
 */

/**
 * @action Workflow terminé avec succès
 * @checkpoint wf-load-complete
 * State final: { 
 *   loading: false, 
 *   contacts: [...], 
 *   stats: {...},
 *   allContactsSorted: [...] // Pré-calculé
 * }
 */

/**
 * @action Gestion d'erreur (si échec)
 * @checkpoint wf-load-error
 * State: { loading: false, contacts: [], error: message }
 */
```

## PouchDB Queries

### Récupérer tous les contacts

```javascript
// Option 1: allDocs (rapide, utilise les index)
const result = await db.allDocs({
  include_docs: true,
  startkey: 'contact:',
  endkey: 'contact:\ufff0'
});
const contacts = result.rows.map(row => row.doc);

// Option 2: find (Mango query, nécessite pouchdb-find plugin)
const result = await db.find({
  selector: { type: { $eq: 'contact' } },
  limit: 1000
});
const contacts = result.docs;
```

### Calcul des stats localement

```javascript
// Plus besoin d'appeler /api/contacts/stats
// Calcul côté client depuis PouchDB:

const stats = {
  total: contacts.length,
  entreprises: contacts.filter(c => c.typePersonne === 'M').length,
  personnes: contacts.filter(c => c.typePersonne === 'P').length,
  avecImpayes: contacts.filter(c => (c.impayesCount || 0) > 0).length,
  blacklist: contacts.filter(c => c.statut === 'blacklist' || c.isBlacklisted === 1).length,
  sansEmail: contacts.filter(c => !c.email || c.email === '').length
};
```

## Response PouchDB - Exemple document

```javascript
{
  "_id": "contact:550e8400-e29b-41d4-a716-446655440000",
  "_rev": "1-abc123def456",
  "type": "contact",
  "id": "M1",
  "nomComplet": "ACME Corporation",
  "typePersonne": "M",
  "email": "contact@acme.fr",
  "telephone": "01 23 45 67 89",
  "impayesCount": 3,
  "statut": "actif",
  "isBlacklisted": 0
}
```

## Checkpoints attendus

1. `wf-load-init` → Workflow démarré, PouchDB initialisé
2. `wf-load-changes-listener` → Écoute des changements activée
3. `wf-load-db-called` → Query PouchDB exécutée
4. `wf-load-data-normalized` → Données normalisées
5. `wf-load-related-linked` → Relations résolues (contacts liés)
6. `wf-load-complete` → Workflow terminé (succès)
7. `wf-load-error` → Workflow terminé (erreur)

## Structure des données normalisées

### Entreprise (type='M')
```javascript
{
  id: "M1",
  nomComplet: "ACME Corporation",
  typePersonne: "M",
  email: "contact@acme.fr",
  telephone: "01 23 45 67 89",
  impayesCount: 3,
  statut: "actif",
  isBlacklisted: 0,
  personnes: [...] // Injecté côté client (collaborateurs)
}
```

### Personne standard (type='P')
```javascript
{
  id: "P1",
  nomComplet: "Jean Dupont",
  typePersonne: "P",
  entrepriseId: "M1",
  societesLiees: "ACME Corporation",
  email: "jean.dupont@acme.fr",
  telephone: "06 12 34 56 78",
  fonction: "Directeur Financier",
  initials: "JD",
  impayesCount: 2,
  statut: "actif",
  isBlacklisted: 0
}
```

### Personne avec relation à un autre particulier
```javascript
{
  id: "P10",
  nomComplet: "Marie Lefebvre",
  typePersonne: "P",
  email: "marie.lefebvre@email.com",
  telephone: "06 98 76 54 32",
  fonction: "Majeur protégé",
  initials: "ML",
  impayesCount: 1,
  statut: "actif",
  isBlacklisted: 0,
  relationPersonne: "Lucas Petit",
  typeRelation: "tutelle",
  descriptionRelation: "Sous tutelle de",
  contactLie: {...} // Injecté côté client
}
```

## Organisation côté client

### Step 1: Calcul des computed properties

```javascript
// Entreprises avec leurs collaborateurs
get entreprisesAvecPersonnes() {
  const entreprises = this.filteredContacts.filter(c => c.typePersonne === 'M');
  const personnes = this.filteredContacts.filter(c => c.typePersonne === 'P');
  
  return entreprises.map(e => ({
    ...e,
    personnes: personnes.filter(p => 
      p.entrepriseId === e.id || 
      p.societesLiees?.includes(e.nomComplet)
    )
  }));
}

// Personnes sans entreprise ni relation
get personnesSansEntreprise() {
  return this.filteredContacts.filter(c => 
    c.typePersonne === 'P' && 
    !c.entrepriseId && 
    !c.societesLiees &&
    !c.relationPersonne
  );
}

// Personnes avec relation (tutelle, époux)
get personnesAvecTutelle() {
  return this.filteredContacts
    .filter(c => c.typePersonne === 'P' && c.relationPersonne)
    .map(p => ({
      ...p,
      contactLie: this.contacts.find(c => c.nomComplet === p.relationPersonne)
    }));
}

// Tous les contacts triés alphabétiquement
get allContactsSorted() {
  const all = [
    ...this.entreprisesAvecPersonnes,
    ...this.personnesSansEntreprise,
    ...this.personnesAvecTutelle
  ];
  return all.sort((a, b) => 
    (a.nomComplet || '').localeCompare(b.nomComplet || '', 'fr', { sensitivity: 'base' })
  );
}
```

## Data retournée

```javascript
{
  contacts: [
    // Mix de:
    // - Entreprises avec personnes[]
    // - Personnes sans entreprise
    // - Personnes avec contactLie
  ],
  stats: {
    total: 156,
    entreprises: 42,
    personnes: 114,
    avecImpayes: 38,
    blacklist: 3,
    sansEmail: 5
  }
}
```

## Dépendances

- PouchDB: `https://cdn.jsdelivr.net/npm/pouchdb@8.0.1/dist/pouchdb.min.js`
- PouchDB-Find: `https://cdn.jsdelivr.net/npm/pouchdb-find@8.0.1/dist/pouchdb.find.min.js` (optionnel, pour Mango queries)
- Fonctions utilitaires: normalizeContact(), getInitials()

## Fichiers liés

- Mockup: `specs/mockups/contacts.html`
- Composant: `app/templates/contacts/workflows/initial-load.html`

---

## Migration depuis l'ancienne API

| Avant (API) | Après (PouchDB) |
|-------------|-----------------|
| `fetch('/api/contacts?limit=1000')` | `db.allDocs({ startkey: 'contact:', endkey: 'contact:\ufff0', include_docs: true })` |
| `fetch('/api/contacts/stats')` | Calcul côté client via `contacts.filter()` |
| `Response.json()` | `result.rows.map(row => row.doc)` |
| Rechargement manuel | Live sync automatique avec `db.changes()` |
