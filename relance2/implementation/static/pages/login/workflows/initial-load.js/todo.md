# TODO - static/pages/login/workflows/initial-load.js

## Fichier à créer
`app/static/pages/login/workflows/initial-load.js`

## Source de vérité
- **Spec** : `specs/_app/static/pages/login/workflows/initial-load.md`

## Instructions

1. **Lire la spec complète** dans `specs/_app/static/pages/login/workflows/initial-load.md`

2. **Implémenter le workflow** avec la fonction principale :
   ```javascript
   async function initialLoad() {
     // @checkpoint 1: Vérifier si token existe dans localStorage
     // @checkpoint 2: Si oui, rediriger vers /dashboard
     // @checkpoint 3: Sinon, afficher le formulaire (état idle)
   }
   ```

3. **Suivre les checkpoints dans l'ordre** comme indiqué dans la spec

4. **Gérer les erreurs** : si le token est invalide, le supprimer et rester sur login

5. **Appeler** ce workflow au `x-init` de la page

## Dépendances
- Le store loginStore
- Route API `/api/auth/me` pour vérifier le token

## Check de validation
- [x] Checkpoint 1: localStorage est vérifié
- [x] Checkpoint 2: Redirection vers /dashboard si token valide
- [x] Checkpoint 3: Formulaire affiché si pas de token
- [x] Les erreurs sont gérées
