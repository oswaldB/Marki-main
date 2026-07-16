# TODO - static/pages/login/store/store.js

## Fichier à créer
`app/static/pages/login/store/store.js`

## Source de vérité
- **Spec** : `specs/_app/static/pages/login/store/store.md`

## Instructions

1. **Lire la spec complète** dans `specs/_app/static/pages/login/store/store.md`

2. **Créer le store Alpine.js** avec exactement ces propriétés :
   ```javascript
   {
     form: {
       email: '',
       password: ''
     },
     status: 'idle', // 'idle' | 'loading' | 'error' | 'success'
     errorMessage: '',
     
     get isSubmitting() { return this.status === 'loading' },
     get canSubmit() { return this.form.email && this.form.password && !this.isSubmitting }
   }
   ```

3. **Respecter exactement** les noms des propriétés et la structure

4. **Exporter** le store pour pouvoir l'utiliser dans les workflows

## Dépendances
- Aucune (store indépendant)

## Check de validation
- [x] Toutes les propriétés de la spec sont présentes
- [x] Les getters fonctionnent
- [x] Le store est compatible Alpine.js
