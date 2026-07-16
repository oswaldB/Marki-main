# TODO - routes/smtp.py

## Fichier à créer
`app/routes/smtp.py`

## Source de vérité
- **Spec** : `specs/_app/routes/smtp.md`

## Instructions

1. **Lire la spec complète** dans `specs/_app/routes/smtp.md`

2. **Créer les routes** :
   - `GET /api/smtp-profiles` - Liste profiles
   - `GET /api/smtp-profiles/<id>` - Détail
   - `POST /api/smtp-profiles` - Créer (host, port, user, password, from_email)
   - `PUT /api/smtp-profiles/<id>` - Modifier
   - `DELETE /api/smtp-profiles/<id>` - Supprimer
   - `POST /api/smtp-profiles/<id>/test` - Tester connexion SMTP

3. **Chiffrer le mot de passe** avant stockage

4. **Gérer le profil par défaut**

## Dépendances
- @require_auth
- db.py
- Chiffrement pour passwords

## Check de validation
- [ ] CRUD complet
- [ ] Test SMTP fonctionne
- [ ] Password chiffré
