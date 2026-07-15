# smart-marki/store/store.js

Store Alpine.js pour la page smart-marki.

```javascript
function smart_markiStore() {
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
