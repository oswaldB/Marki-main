# TODO - static/pages/login/workflows/auth-submit.js

## Fichier à créer
`app/static/pages/login/workflows/auth-submit.js`

## Source de vérité
- **Spec** : `specs/_app/static/pages/login/workflows/auth-submit.md`

## Instructions

1. **Lire la spec complète** dans `specs/_app/static/pages/login/workflows/auth-submit.md`

2. **Implémenter le workflow** avec la fonction principale :
   ```javascript
   async function authSubmit() {
     // @checkpoint 1: Valider que email et password sont remplis
     // @checkpoint 2: Mettre status à 'loading'
     // @checkpoint 3: Appeler POST /api/auth/login
     // @checkpoint 4: Si succès, stocker token dans localStorage
     // @checkpoint 5: Rediriger vers /dashboard
     // @checkpoint 6: Si erreur, status = 'error', afficher message
   }
   ```

3. **Suivre les checkpoints dans l'ordre** strict comme indiqué

4. **Gérer tous les cas d'erreur** :
   - 401 : Credentials invalides
   - 400 : Validation error
   - Network error

5. **Lier au bouton** du formulaire via `@click="authSubmit"`

## Dépendances
- Le store loginStore (met à jour status, errorMessage)
- Route API `/api/auth/login`

## Check de validation
- [x] Checkpoint 1: Validation des champs
- [x] Checkpoint 2: Status loading
- [x] Checkpoint 3: Appel API correct
- [x] Checkpoint 4: Token stocké
- [x] Checkpoint 5: Redirection
- [x] Checkpoint 6: Gestion erreurs
