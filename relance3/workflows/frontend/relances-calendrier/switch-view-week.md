# Workflow : Vue hebdomadaire (PouchDB)

## Écran
`relances-calendrier.html`

## Élément déclencheur
Bouton avec `@click="viewMode = 'week'"`

## Action
Basculer en vue hebdomadaire

## Description
- Affiche le calendrier par semaine
- Vue plus détaillée des 7 jours
- Charge les relances de la semaine depuis PouchDB

## Data Model
**Page Function:** `relancesCalendrierPage()`

**Stores Alpine.js:**
- $store.ui

**Données (depuis PouchDB):**
- `relancesProgrammees` - relances depuis PouchDB
- `currentDate`
- `viewMode` ← `'week'`
- `selectedDate`
- `relancesDuJour`
- `db` - instance PouchDB

**États UI:**
- `loading`
- `error`

## State Changes

**Modifications:**
- `viewMode` ← `'week'`
- `relancesProgrammees` ← filtrées/rechargées pour la semaine

## PouchDB Operations

**Action:** Charger les relances de la semaine courante depuis PouchDB.

**Méthodes utilisées:**
- `db.allDocs({ startkey: 'relance:', endkey: 'relance:\ufff0' })` - Récupérer les relances
- Filtrage côté client par date

## API Calls

**Pas d'appel API** - Changement de vue côté client avec rechargement depuis PouchDB

## Organisation des fichiers

```
frontend/
└── app/
    └── relances-calendrier/
        ├── index.html
        ├── components/
        │   └── (composants partagés)
        └── js/
            └── switch-view-week.js
```

### Fichier principal
- **HTML** : `frontend/app/relances-calendrier/index.html`
- **Point d'entrée** : Initialise la page Alpine.js avec PouchDB

### Fichier workflow
- **JS** : `frontend/app/relances-calendrier/js/switch-view-week.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/relances-calendrier/js/switch-view-week.js
export async function switchViewWeek() {
  // Implementation avec PouchDB
}
```

## Implementation

```javascript
async switchViewWeek() {
  // 1. Set view mode
  this.viewMode = 'week';
  
  // 2. Persist preference
  localStorage.setItem('relances-calendrier_view', 'week');
  
  // 3. Reload relances from PouchDB for week view
  await this.loadCalendarRelances();
  
  // 4. Generate week grid (7 columns x 24 hours or events)
  this.generateWeekGrid();
}

// Generate calendar grid for week view
generateWeekGrid() {
  const current = new Date(this.currentDate);
  const dayOfWeek = current.getDay(); // 0-6 (Sun-Sat)
  
  // Start of week (Sunday)
  const startOfWeek = new Date(current);
  startOfWeek.setDate(current.getDate() - dayOfWeek);
  
  // Generate 7 days
  this.calendarDays = [];
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    
    this.calendarDays.push({
      date: date,
      dateStr: dateStr,
      dayName: date.toLocaleDateString('fr-FR', { weekday: 'short' }),
      dayNumber: date.getDate(),
      relances: this.relancesParJour.get(dateStr) || [],
      isToday: this.isSameDay(date, new Date())
    });
  }
}

// Helper
isSameDay(date1, date2) {
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate();
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
