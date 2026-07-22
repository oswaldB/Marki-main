# Workflow : Période suivante (PouchDB)

## Écran
`relances-calendrier.html`

## Élément déclencheur
Bouton avec `@click="nextPeriod()"`

## Action
Naviguer vers la période suivante

## Description
- Avance d'un mois/semaine selon la vue
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
- `currentDate` ← avance d'un mois ou d'une semaine
- `relancesProgrammees` ← rechargées depuis PouchDB pour la nouvelle période

## PouchDB Operations

**Action:** Charger les relances de la période suivante depuis PouchDB.

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
            └── next-period.js
```

### Fichier principal
- **HTML** : `frontend/app/relances-calendrier/index.html`
- **Point d'entrée** : Initialise la page Alpine.js avec PouchDB

### Fichier workflow
- **JS** : `frontend/app/relances-calendrier/js/next-period.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/relances-calendrier/js/next-period.js
export async function nextPeriod() {
  // Implementation avec PouchDB
}
```

## Implementation

```javascript
async nextPeriod() {
  // 1. Increment period
  if (this.viewMode === 'month') {
    this.currentDate = addMonths(this.currentDate, 1);
  } else {
    this.currentDate = addWeeks(this.currentDate, 1);
  }
  
  // 2. Reload data from PouchDB
  await this.loadCalendarRelances();
  
  // 3. Update display
  this.generateCalendarGrid();
}

// Helper functions
addMonths(date, months) {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

addWeeks(date, weeks) {
  const result = new Date(date);
  result.setDate(result.getDate() + weeks * 7);
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
