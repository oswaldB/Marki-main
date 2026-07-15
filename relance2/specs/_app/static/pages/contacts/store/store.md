# contacts/store/store.js

Store Alpine.js pour la page contacts.

```javascript
function contactsStore() {
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
