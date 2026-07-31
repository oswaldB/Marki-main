---
id: contacts-load-all
type: frontend
folder: specs/workflows/frontend/contacts/
description: Charge tous les contacts (M et P) avec leurs relations pour affichage unifié
depends_on: [auth-check]
screen: contacts
global: false
mockup_entry: specs/mockups/contacts.html
---

# contacts-load-all : Charger tous les contacts

## Description

Workflow qui charge tous les contacts en une seule requête API. Les données sont ensuite organisées côté client pour l'affichage en cards unifiées avec gestion des relations (entreprises ↔ personnes, personnes ↔ personnes).

## Flow du Workflow

```javascript
/**
 * @action Initialiser le workflow
 * @checkpoint wf-load-init
 * State initial: { loading: true, contacts: [] }
 */

/**
 * @action Construire l'URL avec paramètres
 * @checkpoint wf-load-url-built
 * Params: { limit: 1000 }
 * Exemple: '/api/contacts?limit=1000'
 */

/**
 * @action Fetch API GET /api/contacts
 * @checkpoint wf-load-api-called
 * Response: { contacts: [...], stats: {...} }
 */

/**
 * @action Normaliser les données reçues
 * @checkpoint wf-load-data-normalized
 * Transformations:
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
 * - Recherche du contact lié par nom
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

## API

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/contacts?limit=1000` | Liste tous les contacts avec toutes les données |
| GET | `/api/contacts/stats` | **Stats agrégées** (total, entreprises, personnes, impayés, blacklist, sansEmail) |

## Paramètres

| Paramètre | Type | Défaut | Description |
|-----------|------|--------|-------------|
| `limit` | integer | 1000 | Limite résultats (charger tout) |

## Response API - Stats

L'endpoint `/api/contacts/stats` retourne les statistiques calculées par le backend :

```javascript
{
  total: 156,        // Total contacts (M + P)
  entreprises: 42,   // Nombre de personnes morales
  personnes: 114,    // Nombre de personnes physiques
  avecImpayes: 38,   // Contacts avec au moins 1 impayé
  blacklist: 3,      // Contacts blacklistés
  sansEmail: 5       // Contacts sans email renseigné
}
```

Ces stats sont affichées dans les cards de statistiques en haut de la page.

## Checkpoints attendus

1. `wf-load-init` → Workflow démarré
2. `wf-load-url-built` → URL construite
3. `wf-load-api-called` → API appelée
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
  statut: "actif", // ou "blacklist"
  isBlacklisted: 0, // ou 1
  personnes: [...] // Injecté côté client (collaborateurs)
}
```

### Personne standard (type='P')
```javascript
{
  id: "P1",
  nomComplet: "Jean Dupont",
  typePersonne: "P",
  entrepriseId: "M1", // Liée à une entreprise
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
  // Relation vers un autre particulier
  relationPersonne: "Lucas Petit",
  typeRelation: "tutelle", // ou "epoux", "conjoint"
  descriptionRelation: "Sous tutelle de",
  contactLie: {...} // Injecté côté client
}
```

### Personne blacklistée
```javascript
{
  id: "P7",
  nomComplet: "Thomas Robert",
  typePersonne: "P",
  email: "thomas.robert@email.com",
  fonction: "Auto-entrepreneur",
  initials: "TR",
  impayesCount: 4,
  statut: "blacklist",
  isBlacklisted: 1 // Flag pour l'affichage
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
    blacklist: 3,    // ← Nouveau
    sansEmail: 5     // ← Nouveau
  }
}
```

## Dépendances

- Auth check (token JWT dans localStorage)
- Fonctions utilitaires: normalizeContact(), getInitials()

## Fichiers liés

- Mockup: `specs/mockups/contacts.html`
- Composant: `app/templates/contacts/workflows/initial-load.html`
