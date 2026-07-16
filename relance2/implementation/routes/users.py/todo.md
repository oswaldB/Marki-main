# TODO - routes/users.py

## Fichier à créer
`app/routes/users.py`

## Source de vérité
- **Spec** : `specs/_app/routes/users.md`

## Instructions

1. **Lire la spec complète** dans `specs/_app/routes/users.md`

2. **Créer les routes** :
   - `GET /api/users` - Liste des utilisateurs
   - `GET /api/users/<id>` - Détail utilisateur
   - `POST /api/users` - Créer utilisateur
   - `PUT /api/users/<id>` - Modifier utilisateur
   - `DELETE /api/users/<id>` - Supprimer utilisateur

3. **Respecter exactement** :
   - Les champs requis (email, password, role)
   - Hashage bcrypt pour les passwords
   - Les codes HTTP (200, 201, 400, 404)

4. **Protéger les routes** avec @require_auth

## Dépendances
- Decorator @require_auth depuis auth.py
- Module db.py

## Check de validation
- [ ] CRUD complet fonctionnel
- [ ] Hashage bcrypt OK
- [ ] Auth requise
