# relances-validation/store/store.js

Store pour la validation des relances.

```javascript
function relancesValidationStore() {
  return {
    relances: [],
    selectedIds: [],
    loading: false,
    
    async init() {
      await this.loadRelancesAValider();
    },
    
    async loadRelancesAValider() {
      const res = await fetch('/api/relances?status=a_valider');
      this.relances = await res.json();
    },
    
    toggleSelection(id) {
      if (this.selectedIds.includes(id)) {
        this.selectedIds = this.selectedIds.filter(i => i !== id);
      } else {
        this.selectedIds.push(id);
      }
    },
    
    selectAll() {
      this.selectedIds = this.relances.map(r => r.id);
    },
    
    async validateSelected() {
      // Envoyer au workflow
    }
  }
}
```
