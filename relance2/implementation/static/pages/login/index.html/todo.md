# TODO - static/pages/login/index.html

## Fichier à créer
`app/static/pages/login/index.html`

## Source de vérité
- **Spec** : `specs/_app/static/pages/login/index.md`
- **Mockup** : `specs/_app/static/pages/login/mockups/default.html`
- **Mockup erreur** : `specs/_app/static/pages/login/mockups/erreur.html`
- **Mockup loading** : `specs/_app/static/pages/login/mockups/loading.html`

## Instructions

1. **Lire la spec complète** dans `specs/_app/static/pages/login/index.md`

2. **Suivre le mockup à la lettre** : copier `specs/_app/static/pages/login/mockups/default.html` comme base

3. **Adapter pour Alpine.js** si nécessaire selon la spec :
   - Ajouter `x-data="loginStore"`
   - Binder les inputs avec `x-model`
   - Gérer les états : idle, loading, error, success

4. **Inclure les éléments** :
   - Logo Marki
   - Champ email
   - Champ password
   - Bouton connexion avec états
   - Message d'erreur (voir mockup erreur.html)

5. **Structure du store** à respecter (voir store.md) :
   - `form.email`, `form.password`
   - `status`, `errorMessage`
   - `isSubmitting`, `canSubmit`

## Dépendances
- Le store `store.js` doit exister
- Les workflows `initial-load.js` et `auth-submit.js`

## Validation avec console_fetch.py

Après création, valider la page :

```bash
/home/ubuntu/marki/relance2/app/venv/bin/python console_fetch.py http://localhost:5000/login --stdout
```

**Attendu :** 0 erreurs, warnings Tailwind CDN OK

## Check de validation
- [x] Le HTML est identique au mockup visuellement
- [x] Les états loading/erreur fonctionnent
- [x] Alpine.js est initialisé
- [x] Les imports des workflows sont corrects
- [x] `console_fetch.py` → 0 erreurs
