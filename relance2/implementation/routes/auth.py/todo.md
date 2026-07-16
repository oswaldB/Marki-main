# TODO - routes/auth.py

## Fichier à créer
`app/routes/auth.py`

## Source de vérité
- **Spec** : `specs/_app/routes/auth.md`

## Instructions

1. **Lire la spec complète** dans `specs/_app/routes/auth.md`

2. **Créer le blueprint** `auth_bp` avec les routes :
   - `POST /api/auth/login` - Vérifier email/password avec bcrypt, générer JWT
   - `POST /api/auth/logout` - Invalider le token (côté client principalement)
   - `GET /api/auth/me` - Retourner l'utilisateur courant depuis le JWT

3. **Respecter exactement** :
   - Hashage avec bcrypt
   - JWT avec PyJWT
   - Structure des réponses JSON comme spécifié
   - Codes HTTP corrects (200, 401, 400)

4. **Créer le décorateur** `@require_auth` pour protéger les routes

## Dépendances
- `db.py` pour accéder aux utilisateurs
- `app.py` pour JWT_SECRET

## Check de validation
- [x] Login retourne un JWT valide
- [x] `/api/auth/me` retourne l'utilisateur
- [x] Les erreurs 401 sont bien formatées
