# relances/store/store.js

Store Alpine.js pour la page relances.

```javascript
function relancesStore() {
  return {
    items: [],
    loading: false,
    filters: {},
    
    init() { ... },
    async load() { ... },
    async save() { ... }
  }
}
```
