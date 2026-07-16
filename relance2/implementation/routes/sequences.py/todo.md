# TODO - routes/sequences.py

## Fichier à créer
`app/routes/sequences.py`

## Source de vérité
- **Spec** : `specs/_app/routes/sequences.md`

## Instructions

1. **Lire la spec complète** dans `specs/_app/routes/sequences.md`

2. **Créer les routes** :
   - `GET /api/sequences` - Liste des séquences
   - `GET /api/sequences/<id>` - Détail avec étapes
   - `POST /api/sequences` - Créer séquence + étapes
   - `PUT /api/sequences/<id>` - Modifier
   - `DELETE /api/sequences/<id>` - Supprimer
   - `POST /api/sequences/<id>/activate` - Activer
   - `POST /api/sequences/<id>/deactivate` - Désactiver
   - `GET /api/sequences/active` - Séquence active (pour génération relances)

3. **Gérer les étapes** : chaque séquence a plusieurs étapes (délai, template email)

## Dépendances
- @require_auth
- db.py

## Check de validation
- [ ] CRUD complet avec étapes
- [ ] Activation/désactivation
- [ ] Route active fonctionne
