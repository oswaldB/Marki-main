# TODO - db.py

## Fichier à créer
`app/db.py`

## Source de vérité
- **Spec** : `specs/_app/db.md`

## Instructions

1. **Lire la spec complète** dans `specs/_app/db.md`

2. **Implémenter les fonctions requises** :
   - `get_db()` - Connection SQLite avec row_factory
   - `close_db(e)` - Teardown handler
   - `init_db()` - Initialisation avec schema.sql
   - `init_app(app)` - Enregistrement teardown

3. **Respecter exactement** :
   - Le chemin de la base : `instance/data/marki.db`
   - `sqlite3.Row` comme row_factory
   - Gestion des erreurs comme spécifié

4. **✅ DOSSIER ET BASE EXISTENT** : La base est déjà copiée à `app/instance/data/marki.db`

## Dépendances
- Doit être importé par `app.py`

## Notes importantes
- La base de données **existe déjà** à `instance/data/marki.db`
- Pas besoin de créer schema.sql - les tables sont déjà là
- `init_db()` doit juste vérifier que la base est accessible, pas la recréer

## Check de validation
- [x] `get_db()` retourne une connection valide
- [x] `get_db()` utilise bien `sqlite3.Row` comme row_factory
- [x] `close_db()` ferme proprement la connection
- [x] `init_app(app)` enregistre le teardown handler
