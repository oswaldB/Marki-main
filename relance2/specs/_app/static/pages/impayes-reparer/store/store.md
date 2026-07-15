# impayes-reparer/store/store.js

Store Alpine.js pour la page impayes-reparer.

```javascript
function impayes_reparerStore() {
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
