# TODO - routes/impayes.py

## Fichier à créer
`app/routes/impayes.py`

## Source de vérité
- **Spec** : `specs/_app/routes/impayes.md`

## Instructions

1. **Lire la spec complète** dans `specs/_app/routes/impayes.md`

2. **Créer les routes** :
   - `GET /api/impayes` - Liste avec filtres (statut, client, date...)
   - `GET /api/impayes/<id>` - Détail
   - `POST /api/impayes` - Créer (via import)
   - `PUT /api/impayes/<id>` - Modifier (anomalies, etc.)
   - `DELETE /api/impayes/<id>` - Supprimer
   - `POST /api/impayes/<id>/suspend` - Suspendre
   - `POST /api/impayes/<id>/unsuspend` - Réactiver
   - `POST /api/impayes/<id>/reparer` - Marquer comme à réparer

3. **Gérer les filtres** en query params

## Dépendances
- @require_auth
- db.py

## Check de validation
- [x] Tous les endpoints fonctionnent
- [x] Filtres OK
- [x] `console_fetch.py` → 0 erreurs
