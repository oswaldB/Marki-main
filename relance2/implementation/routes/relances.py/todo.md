# TODO - routes/relances.py

## Fichier à créer
`app/routes/relances.py`

## Source de vérité
- **Spec** : `specs/_app/routes/relances.md`

## Instructions

1. **Lire la spec complète** dans `specs/_app/routes/relances.md`

2. **Créer les routes** :
   - `GET /api/relances` - Liste avec filtres (statut, contact, date)
   - `GET /api/relances/<id>` - Détail avec historique
   - `POST /api/relances` - Créer (via generate-relances workflow)
   - `PUT /api/relances/<id>` - Modifier
   - `POST /api/relances/<id>/valider` - Valider la relance
   - `POST /api/relances/<id>/envoyer` - Envoyer email
   - `POST /api/relances/generate` - Générer nouvelles relances
   - `GET /api/relances/calendrier` - Données pour vue calendrier

3. **Respecter les statuts** : brouillon, valide, envoyee, payee, annulee

## Dépendances
- @require_auth
- db.py
- workflows/generate-relances.py

## Check de validation
- [x] CRUD complet
- [x] GET /api/relances/<id> avec impayés liés
- [x] `console_fetch.py` → 0 erreurs
