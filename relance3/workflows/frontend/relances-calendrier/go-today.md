# Workflow : Aller à aujourd'hui (PouchDB)

## Écran
`relances-calendrier.html`

## Élément déclencheur
Bouton avec `@click="goToToday()"`

## Action
Retourner à la période actuelle

## Description
- Réinitialise à la date du jour
- Charge les relances du mois/semaine courant depuis PouchDB
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
- `currentDate` ← `new Date()`
- `relancesProgrammees` ← rechargées depuis PouchDB pour la nouvelle période

## PouchDB Operations

**Action:** Charger les relances du mois/semaine courant depuis PouchDB.

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
            └── go-today.js
```

### Fichier principal
- **HTML** : `frontend/app/relances-calendrier/index.html`
- **Point d'entrée** : Initialise la page Alpine.js avec PouchDB

### Fichier workflow
- **JS** : `frontend/app/relances-calendrier/js/go-today.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/relances-calendrier/js/go-today.js
export async function goToday() {
  // Implementation avec PouchDB
}
```

## Implementation

```javascript
async goToday() {
  // 1. Reset to today
  this.currentDate = new Date();
  
  // 2. Reload relances from PouchDB for current month/week
  await this.loadCalendarRelances();
  
  // 3. Update display
  this.generateCalendarGrid();
}

// Chargement depuis PouchDB
async loadCalendarRelances() {
  const { start, end } = this.getDateRange();
  
  try {
    const result = await db.allDocs({
      startkey: 'relance:',
      endkey: 'relance:\ufff0',
      include_docs: true
    });
    
    this.relancesProgrammees = result.rows
      .map(r => r.doc)
      .filter(r => r.statut === 'programmee')
      .filter(r => {
        const date = new Date(r.date_envoi_programmee);
        return date >= start && date <= end;
      });
      
    this.groupRelancesByDay();
    
  } catch (error) {
    console.error('Erreur chargement:', error);
    this.error = error.message;
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
