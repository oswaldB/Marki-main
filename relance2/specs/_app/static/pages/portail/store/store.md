# portail/store/store.js

Store Alpine.js pour la page portail.

```javascript
function portailStore() {
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
