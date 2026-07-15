# impayes-suspendus/store/store.js

Store pour les impayés suspendus.

```javascript
function impayesSuspendusStore() {
  return {
    impayes: [],
    selectedIds: [],
    
    async init() {
      await this.loadSuspendus();
    },
    
    async loadSuspendus() {
      const res = await fetch('/api/impayes?suspendu=true');
      this.impayes = await res.json();
    },
    
    async unsuspend(id) {
      await fetch('/api/workflow/impayes-unsuspend', {
        method: 'POST',
        body: JSON.stringify({ impaye_id: id })
      });
      await this.loadSuspendus();
    },
    
    getDaysRemaining(dateFin) {
      const end = new Date(dateFin);
      const now = new Date();
      return Math.ceil((end - now) / (1000 * 60 * 60 * 24));
    }
  }
}
```
