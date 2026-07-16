# TODO - workflows/auth-login.py

## Fichier à créer
`app/workflows/auth-login.py`

## Source de vérité
- **Spec** : `specs/_app/workflows/auth-login.md`

## Instructions

1. **Lire la spec complète** dans `specs/_app/workflows/auth-login.md`

2. **Implémenter la fonction** :
   ```python
   def auth_login(email, password):
       # @checkpoint 1: Vérifier que email existe en DB
       # @checkpoint 2: Vérifier password avec bcrypt
       # @checkpoint 3: Générer JWT token
       # @checkpoint 4: Logger l'événement
       # @checkpoint 5: Retourner token + user
   ```

3. **Suivre les checkpoints dans l'ordre**

4. **Gérer les erreurs** :
   - User not found → 401
   - Wrong password → 401
   - Missing fields → 400

## Dépendances
- db.py pour users
- bcrypt pour password
- PyJWT pour token

## Check de validation
- [x] Tous les checkpoints passent
- [x] JWT valide généré
- [x] Erreurs gérées
