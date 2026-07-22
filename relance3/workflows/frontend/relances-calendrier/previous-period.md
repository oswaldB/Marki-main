# Workflow : Période précédente (PouchDB)

## Écran
`relances-calendrier.html`

## Élément déclencheur
Bouton avec `@click="previousPeriod()"`

## Action
Naviguer vers la période précédente

## Description
- Recule d'un mois/semaine selon la vue
- Charge les relances de la période depuis PouchDB
- Met à jour l'affichage calendrier

## Data Model
**Page Function:** `relancesCalendrierPage()`

**Stores Alpine.js:**
- $store.ui

**Données (depuis PouchDB):**
- `relancesProgrammees` - relances depuis PouchDB
- `currentDate`
- `viewMode`
- `selectedDate`
- `relancesDuJour`
- `db` - instance PouchDB

**États UI:**
- `loading`
- `error`

## State Changes

**Modifications:**
- `currentDate` ← recule d'un mois ou d'une semaine
- `relancesProgrammees` ← rechargées depuis PouchDB pour la nouvelle période

## PouchDB Operations

**Action:** Charger les relances de la période précédente depuis PouchDB.

**Méthodes utilisées:**
- `db.allDocs({ startkey: 'relance:', endkey: 'relance:\ufff0' })` - Récupérer les relances
- Filtrage côté client par date

## API Calls

**Pas d'appel API** - Navigation côté client avec rechargement depuis PouchDB

## Organisation des fichiers

```
frontend/
└── app/
    └── relances-calendrier/
        ├── index.html
        ├── components/
        │   └── (composants partagés)
        └── js/
            └── previous-period.js
```

### Fichier principal
- **HTML** : `frontend/app/relances-calendrier/index.html`
- **Point d'entrée** : Initialise la page Alpine.js avec PouchDB

### Fichier workflow
- **JS** : `frontend/app/relances-calendrier/js/previous-period.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/relances-calendrier/js/previous-period.js
export async function previousPeriod() {
  // Implementation avec PouchDB
}
```

## Implementation

```javascript
async previousPeriod() {
  // 1. Decrement period
  if (this.viewMode === 'month') {
    this.currentDate = subMonths(this.currentDate, 1);
  } else {
    this.currentDate = subWeeks(this.currentDate, 1);
  }
  
  // 2. Reload data from PouchDB
  await this.loadCalendarRelances();
  
  // 3. Update display
  this.generateCalendarGrid();
}

// Helper functions
subMonths(date, months) {
  const result = new Date(date);
  result.setMonth(result.getMonth() - months);
  return result;
}

subWeeks(date, weeks) {
  const result = new Date(date);
  result.setDate(result.getDate() - weeks * 7);
  return result;
}
```

---

## Migration depuis l'ancienne API

| Aspect | Avant | Après (PouchDB) |
|--------|-------|-----------------|
| Action | Côté client | **Conservé** - Côté client |
| Chargement données | API `/api/relances` | `db.allDocs()` local |
| Filtrage | Backend | Côté client |
| Latence | ~200-500ms | ~10-50ms (local) |
| Offline | ❌ Impossible | ✅ Fonctionne offline |
