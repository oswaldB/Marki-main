# TODO - routes/pages.py

## Fichier à créer
`app/routes/pages.py`

## Source de vérité
- **Spec** : `specs/_app/routes/pages.md`

## Instructions

1. **Lire la spec complète** dans `specs/_app/routes/pages.md`

2. **Créer le blueprint** `pages_bp` avec toutes les routes :
   - Routes simples : `/`, `/login`, `/dashboard`, `/impayes`, `/relances`, `/sequences`, `/contacts`, `/settings`, `/portail`, `/evenements`, `/smart-marki`
   - Routes dynamiques : `/impayes/<id>`, `/impayes/<id>/reparer`, `/impayes/payeur`, `/impayes/suspendus`, `/relances/<id>`, `/relances/calendrier`, `/relances/validation`, `/sequences/<id>/suivi`, `/settings/smtp`, `/settings/smtp/<id>`, `/settings/users`, `/portail/<token>`

3. **Utiliser `send_from_directory`** pour servir les fichiers HTML statiques depuis `static/pages/`

4. **Ne pas oublier** les routes `/settings/smtp` et `/settings/users` (en bas de la spec)

## Dépendances
- Les dossiers `static/pages/<page>/` doivent exister avec leur `index.html`

## Check de validation
- [ ] Toutes les routes retournent 200
- [ ] Les routes dynamiques servent bien le bon dossier
- [ ] `send_from_directory` est utilisé (pas `render_template`)
