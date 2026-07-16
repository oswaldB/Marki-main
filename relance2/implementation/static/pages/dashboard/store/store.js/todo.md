# TODO - static/pages/dashboard/store/store.js

## Fichier à créer
`app/static/pages/dashboard/store/store.js`

## Source de vérité
- **Spec** : `specs/_app/static/pages/dashboard/store/store.md`

## Instructions

1. **Lire la spec complète** dans `specs/_app/static/pages/dashboard/store/store.md`

2. **Créer le store** avec exactement ces propriétés :
   ```javascript
   {
     stats: {
       totalImpayes: 0,
       totalRelances: 0,
       totalContacts: 0,
       montantTotal: 0
     },
     recentRelances: [],
     isLoading: false,
     error: null,
     
     async loadStats() { ... },
     async loadRecentRelances() { ... }
   }
   ```

3. **Respecter exactement** la structure de données de la spec

## Dépendances
- Routes API `/api/dashboard/*`

## Check de validation
- [x] Toutes les propriétés sont présentes
- [x] Les méthodes async fonctionnent
- [x] `console_fetch.py` → 0 erreurs
