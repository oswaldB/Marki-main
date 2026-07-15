# portail-client/store/store.js

Store Alpine.js pour la page portail-client.

```javascript
function portail_clientStore() {
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
