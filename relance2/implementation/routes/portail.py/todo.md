# TODO - routes/portail.py

## Fichier à créer
`app/routes/portail.py`

## Source de vérité
- **Spec** : `specs/_app/routes/portail.md`

## Instructions

1. **Lire la spec complète** dans `specs/_app/routes/portail.md`

2. **Créer les routes** :
   - `POST /api/portail/generate-token` - Générer token pour contact (JWT)
   - `GET /api/portail/validate-token/<token>` - Valider token
   - `GET /api/portail/impayes` - Liste impayés du contact (via token)
   - `POST /api/portail/payer` - Marquer comme payé
   - `POST /api/portail/contester` - Contester un impayé

3. **Routes publiques** (pas d'auth JWT classique) : validation via token dans URL

## Dépendances
- db.py
- PyJWT pour tokens portail

## Check de validation
- [ ] Token généré avec durée limitée
- [ ] Routes publiques sécurisées
- [ ] Actions payer/contester loggées
