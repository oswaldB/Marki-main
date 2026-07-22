---
id: relances-calendrier-initial-load
type: frontend
folder: specs/workflows/frontend/relances-calendrier/
description: Charger le calendrier mensuel des relances programmées depuis PouchDB
depends_on: [auth-check]
screen: relances-calendrier
global: false
mockup_entry: specs/mockups/relances-calendrier.html
---

# relances-calendrier-initial-load : Chargement initial Calendrier Relances (PouchDB)

## Description

Charger les relances programmées pour le mois courant depuis PouchDB et générer la vue calendrier.

## Étapes

```javascript
/**
 * @action Initialiser PouchDB et configurer le sync
 * @checkpoint pouchdb-initialized, base relances prête
 * 
 * Code:
 * this.db = new PouchDB('marki-relances');
 * this.db.sync(remoteUrl, { live: true, retry: true });
 */

/**
 * @action Initialiser le mois courant et la vue par défaut (mois)
 * @checkpoint calendar-initialized, currentDate = new Date(), viewMode = 'month'
 */

/**
 * @action Afficher le spinner de chargement
 * @checkpoint loading-shown, calendrier en état de chargement
 */

/**
 * @action Calculer la plage de dates du mois affiché (début/fin)
 * @checkpoint date-range-calculated, premier et dernier jour du mois
 */

/**
 * @action Récupérer les relances depuis PouchDB
 * @checkpoint relances-fetched, relances du mois reçues
 * 
 * **Query PouchDB** :
 * const result = await db.allDocs({
 *   startkey: 'relance:',
 *   endkey: 'relance:\ufff0',
 *   include_docs: true
 * });
 * const relances = result.rows
 *   .map(r => r.doc)
 *   .filter(r => r.statut === 'programmee')
 *   .filter(r => {
 *     const date = new Date(r.date_envoi_programmee);
 *     return date >= debut && date <= fin;
 *   });
 */

/**
 * @action Configurer le listener pour les changements temps réel
 * @checkpoint changes-listener-active, mises à jour automatiques
 * 
 * Code:
 * db.changes({ since: 'now', live: true, include_docs: true })
 *   .on('change', (change) => { this.updateCalendarRelance(change.doc); });
 */

/**
 * @action Grouper les relances par jour
 * @checkpoint relances-grouped, Map<date, relances[]> créée
 */

/**
 * @action Générer la grille du calendrier avec les jours
 * @checkpoint grid-rendered, 42 cellules (6 semaines) générées
 */

/**
 * @action Afficher les relances sur les jours concernés avec badges
 * @checkpoint relances-rendered, badges colorés par statut visibles
 */

/**
 * @action Masquer le spinner
 * @checkpoint loading-complete, calendrier entièrement interactif
 */
```

## PouchDB Operations

### Chargement initial

```javascript
async loadCalendarRelances(dateDebut, dateFin) {
  this.loading = true;
  
  try {
    // Récupérer toutes les relances programmées
    const result = await db.allDocs({
      startkey: 'relance:',
      endkey: 'relance:\ufff0',
      include_docs: true
    });
    
    // Filtrer par période et statut
    this.relancesProgrammees = result.rows
      .map(r => r.doc)
      .filter(r => r.statut === 'programmee')
      .filter(r => {
        const date = new Date(r.date_envoi_programmee);
        return date >= dateDebut && date <= dateFin;
      })
      .sort((a, b) => new Date(a.date_envoi_programmee) - new Date(b.date_envoi_programmee));
    
    // Grouper par jour pour le calendrier
    this.groupRelancesByDay();
    
  } catch (error) {
    console.error('Erreur chargement calendrier:', error);
    this.error = error.message;
  } finally {
    this.loading = false;
  }
}

// Grouper les relances par jour
groupRelancesByDay() {
  const groups = new Map();
  
  for (const relance of this.relancesProgrammees) {
    const date = relance.date_envoi_programmee.split('T')[0]; // YYYY-MM-DD
    if (!groups.has(date)) {
      groups.set(date, []);
    }
    groups.get(date).push(relace);
  }
  
  this.relancesParJour = groups;
}
```

### Live Sync (temps réel)

```javascript
// Écouter les changements sur les relances
db.changes({
  since: 'now',
  live: true,
  include_docs: true
}).on('change', (change) => {
  if (change.doc.type === 'relance' && change.doc.statut === 'programmee') {
    const date = change.doc.date_envoi_programmee?.split('T')[0];
    
    if (this.isDateInCurrentMonth(date)) {
      // Mettre à jour le calendrier
      this.updateCalendarRelance(change.doc);
    }
  }
}).on('error', (err) => {
  console.error('Erreur sync calendrier:', err);
});
```

## Mockups de référence

- `specs/mockups/relances-calendrier.html`

---

## Migration depuis l'ancienne API

| Aspect | Avant (API) | Après (PouchDB) |
|--------|-------------|-----------------|
| Relances | `GET /api/relances` | `db.allDocs()` |
| Filtrage par date | Paramètres API | Côté client JavaScript |
| Filtrage statut | Paramètre API | Côté client |
| Mises à jour temps réel | Polling | `db.changes()` |
| Grouper par jour | Backend | Côté client avec `Map()` |
| Latence | ~300-800ms | ~50-100ms (local) |
| Offline | ❌ Impossible | ✅ Fonctionne offline |
