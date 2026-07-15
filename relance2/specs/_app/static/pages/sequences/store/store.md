# sequences/store/store.js

Store Alpine.js pour la page sequences.

```javascript
function sequencesStore() {
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
