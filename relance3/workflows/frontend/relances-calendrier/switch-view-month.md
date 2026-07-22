# Workflow : Vue mensuelle (PouchDB)

## Écran
`relances-calendrier.html`

## Élément déclencheur
Bouton avec `@click="viewMode = 'month'"`

## Action
Basculer en vue mensuelle

## Description
- Affiche le calendrier par mois
- Grille 7x5 ou 7x6 selon le mois
- Charge les relances du mois depuis PouchDB

## Data Model
**Page Function:** `relancesCalendrierPage()`

**Stores Alpine.js:**
- $store.ui

**Données (depuis PouchDB):**
- `relancesProgrammees` - relances depuis PouchDB
- `currentDate`
- `viewMode` ← `'month'`
- `selectedDate`
- `relancesDuJour`
- `db` - instance PouchDB

**États UI:**
- `loading`
- `error`

## State Changes

**Modifications:**
- `viewMode` ← `'month'`
- `relancesProgrammees` ← filtrées/rechargées pour le mois

## PouchDB Operations

**Action:** Charger les relances du mois courant depuis PouchDB.

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
            └── switch-view-month.js
```

### Fichier principal
- **HTML** : `frontend/app/relances-calendrier/index.html`
- **Point d'entrée** : Initialise la page Alpine.js avec PouchDB

### Fichier workflow
- **JS** : `frontend/app/relances-calendrier/js/switch-view-month.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/relances-calendrier/js/switch-view-month.js
export async function switchViewMonth() {
  // Implementation avec PouchDB
}
```

## Implementation

```javascript
async switchViewMonth() {
  // 1. Set view mode
  this.viewMode = 'month';
  
  // 2. Persist preference
  localStorage.setItem('relances-calendrier_view', 'month');
  
  // 3. Reload relances from PouchDB for month view
  await this.loadCalendarRelances();
  
  // 4. Generate month grid (7 columns x 5-6 rows)
  this.generateMonthGrid();
}

// Generate calendar grid for month view
generateMonthGrid() {
  const year = this.currentDate.getFullYear();
  const month = this.currentDate.getMonth();
  
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  
  const startPadding = firstDay.getDay(); // 0-6 (Sun-Sat)
  const daysInMonth = lastDay.getDate();
  
  // Generate 42 cells (6 weeks)
  this.calendarDays = [];
  
  // Padding days from previous month
  for (let i = 0; i < startPadding; i++) {
    this.calendarDays.push({ type: 'padding', date: null });
  }
  
  // Days of current month
  for (let i = 1; i <= daysInMonth; i++) {
    const date = new Date(year, month, i);
    const dateStr = date.toISOString().split('T')[0];
    
    this.calendarDays.push({
      type: 'day',
      date: date,
      dateStr: dateStr,
      relances: this.relancesParJour.get(dateStr) || []
    });
  }
  
  // Padding days for next month
  const remainingCells = 42 - this.calendarDays.length;
  for (let i = 0; i < remainingCells; i++) {
    this.calendarDays.push({ type: 'padding', date: null });
  }
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
