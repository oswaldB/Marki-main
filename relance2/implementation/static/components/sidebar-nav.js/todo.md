# TODO - static/components/sidebar-nav.js

## Fichier à créer
`app/static/components/sidebar-nav.js`

## Source de vérité
- **Spec** : `specs/_app/static/components/sidebar-nav.md`
- **Code source** : `specs/_app/static/components/sidebar-nav.js` (fichier complet fourni)

## Instructions

1. **Lire la spec** dans `specs/_app/static/components/sidebar-nav.md`

2. **Copier le code** depuis `specs/_app/static/components/sidebar-nav.js` (déjà fourni dans les specs)

3. **Le fichier est déjà complet** dans les specs, juste le copier dans `app/static/components/`

4. **Adapter les liens** si nécessaire pour matcher les routes exactes

5. **Gérer** :
   - Menu pliable
   - Active state selon la route
   - Déconnexion

## Dépendances
- Doit être importé dans chaque page

## Validation avec console_fetch.py

Après création, valider la page :

```bash
/home/ubuntu/marki/relance2/app/venv/bin/python console_fetch.py http://localhost:5000/URL_A_ADAPTER --stdout
```

**Attendu :** 0 erreurs, warnings Tailwind CDN OK

## Check de validation
- [ ] Code copié exactement
- [ ] Liens fonctionnels
- [ ] Active state marche
