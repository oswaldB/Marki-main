# impayes/store/store.js

Store Alpine.js pour la page impayes.

```javascript
function impayesStore() {
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
