# evenements/store/store.js

Store Alpine.js pour la page evenements.

```javascript
function evenementsStore() {
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
