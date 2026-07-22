---
id: dashboard-kpi-relances-jour
type: frontend
folder: specs/workflows/frontend/dashboard/
description: Calculer et afficher le nombre de relances envoyées aujourd'hui via PouchDB
depends_on: [auth-check]
screen: dashboard
global: false
mockup_entry: specs/mockups/dashboard.html
---

# KPI Relances du Jour - PouchDB

## Description

Calculer le nombre de relances envoyées aujourd'hui depuis **PouchDB local** et afficher la valeur dans la card KPI.

## Étapes

```javascript
/**
 * @action Configurer le listener PouchDB pour les changements
 * @checkpoint changes-listener-active, écoute temps réel activée
 * 
 * Code:
 * db.changes({ since: 'now', live: true, include_docs: true })
 *   .on('change', (change) => { recalculer si relance modifiée });
 */

/**
 * @action Récupérer les relances depuis PouchDB
 * @checkpoint relances-fetched, données locales chargées
 * 
 * Query:
 * const result = await db.allDocs({
 *   startkey: 'relance:',
 *   endkey: 'relance:\ufff0',
 *   include_docs: true
 * });
 */

/**
 * @action Filtrer les relances où date_envoi = date du jour
 * @checkpoint relances-filtered, tableau des relances envoyées aujourd'hui
 * 
 * Calcul:
 * const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
 * const relancesDuJour = result.rows
 *   .map(row => row.doc)
 *   .filter(r => {
 *     if (!r.date_envoi) return false;
 *     const dateEnvoi = r.date_envoi.split('T')[0];
 *     return dateEnvoi === today && r.statut === 'sent';
 *   });
 */

/**
 * @action Compter le nombre de relances
 * @checkpoint count-calculated, nombre total calculé
 * 
 * Calcul:
 * const count = relancesDuJour.length;
 */

/**
 * @action Grouper par type de relance (R1, R2, R3)
 * @checkpoint grouped-by-type, répartition par niveau calculée
 * 
 * Calcul:
 * const repartition = relancesDuJour.reduce((acc, r) => {
 *   const niveau = r.niveau_relance || 'R1';
 *   acc[niveau] = (acc[niveau] || 0) + 1;
 *   return acc;
 * }, {});
 */

/**
 * @action Mettre à jour l'état Alpine.js kpis.relancesJour
 * @checkpoint state-updated, valeur affichée dans la card KPI
 */
```

## PouchDB Operations

### Récupérer et compter les relances du jour

```javascript
async calculateRelancesJour() {
  const result = await db.allDocs({
    startkey: 'relance:',
    endkey: 'relance:\ufff0',
    include_docs: true
  });
  
  // Date du jour (YYYY-MM-DD)
  const today = new Date().toISOString().split('T')[0];
  
  // Filtrer les relances envoyées aujourd'hui
  const relancesDuJour = result.rows
    .map(row => row.doc)
    .filter(r => {
      if (!r.date_envoi) return false;
      const dateEnvoi = r.date_envoi.split('T')[0];
      return dateEnvoi === today && r.statut === 'sent';
    });
  
  // Mettre à jour le KPI
  this.kpis.relancesJour = relancesDuJour.length;
  
  // Option: calculer la répartition par niveau
  this.kpis.relancesRepartition = relancesDuJour.reduce((acc, r) => {
    const niveau = r.niveau_relance || 'R1';
    acc[niveau] = (acc[niveau] || 0) + 1;
    return acc;
  }, {});
}
```

### Live Sync (mise à jour temps réel)

```javascript
// Recalculer automatiquement sur changements
db.changes({
  since: 'now',
  live: true,
  include_docs: true
}).on('change', (change) => {
  if (change.doc.type === 'relance') {
    // Vérifier si c'est une relance envoyée aujourd'hui
    const today = new Date().toISOString().split('T')[0];
    const dateEnvoi = change.doc.date_envoi?.split('T')[0];
    
    if (dateEnvoi === today && change.doc.statut === 'sent') {
      // Recalculer le KPI
      this.calculateRelancesJour();
    }
  }
});
```

### Option: Mango Query avec pouchdb-find

```javascript
// Alternative avec pouchdb-find (nécessite index)
const today = new Date().toISOString().split('T')[0];
const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

const result = await db.find({
  selector: {
    type: { $eq: 'relance' },
    statut: { $eq: 'sent' },
    date_envoi: {
      $gte: today,
      $lt: tomorrow
    }
  }
});

this.kpis.relancesJour = result.docs.length;
```

### Créer l'index Mango (optionnel)

```javascript
// Créer un index pour optimiser les requêtes
await db.createIndex({
  index: {
    fields: ['type', 'statut', 'date_envoi']
  },
  name: 'idx-relances-jour'
});
```

## Calcul Frontend

```javascript
// Récupération des données depuis PouchDB
const result = await db.allDocs({
  startkey: 'relance:',
  endkey: 'relance:\ufff0',
  include_docs: true
});

// Date du jour
const today = new Date().toISOString().split('T')[0];

// Filtrage et comptage
this.kpis.relancesJour = result.rows
  .map(row => row.doc)
  .filter(r => {
    if (!r.date_envoi) return false;
    const dateEnvoi = r.date_envoi.split('T')[0];
    return dateEnvoi === today && r.statut === 'sent';
  })
  .length;
```

## Structure des documents PouchDB (relance)

```javascript
{
  "_id": "relance:550e8400-...",
  "_rev": "1-abc123...",
  "type": "relance",
  "id": "R123",
  "contact_id": "contact:...",
  "facture_id": "facture:...",
  "niveau_relance": "R2",
  "date_envoi": "2024-01-15T09:30:00",
  "statut": "sent",
  "canal": "email"
}
```

## Interface utilisateur

| Élément | Sélecteur | Action |
|---------|-----------|--------|
| Valeur KPI | `[x-text="kpis.relancesJour"]` | Afficher le nombre (ex: 18) |
| Label | `<p class="text-xs text-slate-400">` | Afficher "aujourd'hui" |
| Tooltip | `.fa-info-circle[title]` | Hover = "Relances envoyées aujourd'hui" |

## Error Handling

| Cas | Comportement |
|-----|--------------|
| PouchDB non disponible | Afficher "—" ou message d'erreur |
| Empty | Afficher "0" si aucune relance envoyée aujourd'hui |

---

## Migration depuis l'ancienne API

| Aspect | Avant (API) | Après (PouchDB) |
|--------|-------------|-----------------|
| Source données | `GET /api/relances?date_envoi=today` | PouchDB local |
| Filtrage date | Côté serveur | Côté client (string comparison) |
| Réponse | `{ data: [...], meta: { total: N } }` | `filter(...).length` |
| Mise à jour | Rechargement manuel | Temps réel via `db.changes()` |
| Latence | ~100-300ms | ~5-20ms (local) |
| Offline | ❌ Impossible | ✅ Fonctionne offline |
