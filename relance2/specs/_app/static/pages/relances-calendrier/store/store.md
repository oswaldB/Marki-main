# relances-calendrier/store/store.js

Store pour la vue calendrier.

```javascript
function relancesCalendrierStore() {
  return {
    currentMonth: new Date(),
    selectedDate: null,
    relances: [],
    filteredRelances: [],
    
    async init() {
      await this.loadRelances();
    },
    
    async loadRelances() {
      const res = await fetch('/api/relances?status=en_cours');
      this.relances = await res.json();
    },
    
    getRelancesForDate(date) {
      return this.relances.filter(r => r.date_echeance === date);
    },
    
    changeMonth(direction) {
      // direction: -1 (prev) ou 1 (next)
    }
  }
}
```
