# TODO - app.py

## Fichier à créer
`app/app.py`

## Source de vérité
- **Spec** : `specs/_app/app.md`

## Instructions

1. **Lire la spec complète** dans `specs/_app/app.md`

2. **Créer l'application factory** avec :
   - `create_app(test_config=None)`
   - Configuration SECRET_KEY, DATABASE, JWT_SECRET
   - Création du dossier instance si nécessaire

3. **Enregistrer tous les blueprints** listés dans la spec (décommenter les imports au fur et à mesure) :
   - ✅ pages_bp → / (déjà fait)
   - 🔲 auth_bp → /api/auth (après création routes/auth.py)
   - 🔲 users_bp → /api/users
   - 🔲 contacts_bp → /api/contacts
   - 🔲 impayes_bp → /api/impayes
   - 🔲 relances_bp → /api/relances
   - 🔲 sequences_bp → /api/sequences
   - 🔲 smtp_bp → /api/smtp-profiles
   - 🔲 portail_bp → /api/portail
   - 🔲 tokens_bp → /api/tokens
   - 🔲 dashboard_bp → /api/dashboard
   - 🔲 events_bp → /api/events
   - 🔲 cleanup_bp → /api/cleanup
   - 🔲 import_bp → /api/import
   - 🔲 workflow_bp → /api/workflow

4. **Initialiser la base de données** avec `db.init_app(app)`

4. **Vérifier** que tous les imports fonctionnent et que l'app démarre sur port 5000

## Dépendances
- `db.py` doit exister et être importable
- Les routes/pages.py existe déjà (blueprint pages)

## Check de validation
- [ ] `python app.py` démarre sans erreur
- [ ] Le serveur écoute sur le port 5000
