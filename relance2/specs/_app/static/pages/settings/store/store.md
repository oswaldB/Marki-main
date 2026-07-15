# settings/store/store.js

Store Alpine.js pour la page settings.

```javascript
function settingsStore() {
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
