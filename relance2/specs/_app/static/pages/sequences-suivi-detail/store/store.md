# sequences-suivi-detail/store/store.js

Store Alpine.js pour la page sequences-suivi-detail.

```javascript
function sequences_suivi_detailStore() {
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
