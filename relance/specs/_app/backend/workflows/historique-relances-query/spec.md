# Workflow Backend: historique-relances-query

**Feature** : F-012 Historique relances  
**Type** : Backend (Cloud Function)  
**Cloud Function** : `getRelanceHistory`

## Description

Récupère l'historique des relances avec filtres et statistiques pour le tableau de bord.

## Input

```javascript
{
  filtres: {
    dateDebut: Date,
    dateFin: Date,
    clientId: String,      // optionnel
    sequenceId: String,    // optionnel
    statut: String         // optionnel
  },
  pagination: {
    page: Number,
    limit: Number
  }
}
```

## Requête

```javascript
const Relance = Parse.Object.extend('Relance')
const query = new Parse.Query(Relance)

query.include(['contact', 'sequence', 'validePar', 'envoyeePar'])

// Filtres temporels
if (filtres.dateDebut) {
  query.greaterThanOrEqualTo('createdAt', filtres.dateDebut)
}
if (filtres.dateFin) {
  query.lessThanOrEqualTo('createdAt', filtres.dateFin)
}

// Filtres relations
if (filtres.clientId) {
  const Contact = Parse.Object.extend('Contact')
  query.equalTo('contact', Contact.createWithoutData(filtres.clientId))
}

if (filtres.sequenceId) {
  const Sequence = Parse.Object.extend('SequenceRelance')
  query.equalTo('sequence', Sequence.createWithoutData(filtres.sequenceId))
}

if (filtres.statut) {
  query.equalTo('statut', filtres.statut)
}

// Ordre et pagination
query.descending('createdAt')
query.skip((pagination.page - 1) * pagination.limit)
query.limit(pagination.limit)
```

## Stats agrégées

```javascript
const stats = {
  total: await query.count(),
  envoyees: await countByStatus('envoyee'),
  validees: await countByStatus('valide'),
  enAttente: await countByStatus('brouillon'),
  annulees: await countByStatus('annulee')
}
```

**CHECKPOINT**: `history-stats-computed`

## Output

```javascript
{
  success: true,
  relances: [...],        // Liste formatée
  stats: {
    total: 156,
    envoyees: 142,
    validees: 8,
    enAttente: 4,
    annulees: 2
  },
  pagination: {
    page: 1,
    limit: 20,
    totalPages: 8
  }
}
```

## Format d'une relance

```javascript
{
  id: "rel_abc123",
  contact: { id: "...", nom: "...", email: "..." },
  sequence: { id: "...", nom: "...", niveau: 1 },
  sujet: "Rappel facture...",
  statut: "envoyee",
  valide: true,
  envoyee: true,
  dateEnvoi: "2024-06-30T10:30:00Z",
  validePar: { id: "...", nom: "..." },
  envoyeePar: { id: "...", nom: "..." },
  createdAt: "2024-06-25T08:00:00Z"
}
```
