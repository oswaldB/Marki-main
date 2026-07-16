# TODO - routes/contacts.py

## Fichier à créer
`app/routes/contacts.py`

## Source de vérité
- **Spec** : `specs/_app/routes/contacts.md`

## Instructions

1. **Lire la spec complète** dans `specs/_app/routes/contacts.md`

2. **Créer les routes** :
   - `GET /api/contacts` - Liste avec filtres
   - `GET /api/contacts/<id>` - Détail
   - `POST /api/contacts` - Créer
   - `PUT /api/contacts/<id>` - Modifier
   - `DELETE /api/contacts/<id>` - Supprimer
   - `POST /api/contacts/<id>/blacklist` - Blacklister
   - `POST /api/contacts/<id>/unblacklist` - Dé-blacklister

3. **Gérer les filtres** en query params (voir spec)

## Dépendances
- @require_auth
- db.py

## Check de validation
- [x] Liste avec filtres fonctionne
- [x] GET /api/contacts/<id>/impayes fonctionne
- [x] `console_fetch.py` → 0 erreurs
