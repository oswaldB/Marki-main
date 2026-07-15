# relances-detail/store/store.js

Store Alpine.js pour la page relances-detail.

```javascript
function relances_detailStore() {
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
