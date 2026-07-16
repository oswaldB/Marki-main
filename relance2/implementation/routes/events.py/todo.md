# TODO - routes/events.py

## Fichier à créer
`app/routes/events.py`

## Source de vérité
- **Spec** : `specs/_app/routes/events.md`

## Instructions

1. **Lire la spec complète** dans `specs/_app/routes/events.md`

2. **Créer les routes** :
   - `GET /api/events` - Liste des événements avec filtres
   - `POST /api/events` - Créer un événement

3. **Gérer les filtres** : type, contact_id, date_debut, date_fin, limit

## Dépendances
- @require_auth
- db.py

## Check de validation
- [x] Liste avec filtres fonctionne
- [x] `console_fetch.py` → 0 erreurs
