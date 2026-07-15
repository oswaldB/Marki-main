# impayes-detail/store/store.js

Store Alpine.js pour la page impayes-detail.

```javascript
function impayes_detailStore() {
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
