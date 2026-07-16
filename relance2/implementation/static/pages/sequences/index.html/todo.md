# TODO - static/pages/sequences/index.html

## Fichier à créer
`app/static/pages/sequences/index.html`

## Source de vérité
- **Spec** : `specs/_app/static/pages/sequences/index.md`
- **Mockup** : `specs/_app/static/pages/sequences/mockups/default.html`

## Instructions

1. **Lire la spec complète** dans `specs/_app/static/pages/sequences/index.md`

2. **Suivre le mockup à la lettre**

3. **Inclure** :
   - Liste des séquences de relance
   - Pour chaque séquence : nom, étapes, délais, actif/inactif
   - Bouton créer/modifier/supprimer
   - Lien vers détail étapes (`/sequences/<id>/suivi`)

4. **Gérer les étapes** : J+15, J+30, J+45 avec leurs templates

## Dépendances
- Component sidebar-nav.js
- Store sequences/store/store.js

## Validation avec console_fetch.py

Après création, valider la page :

```bash
/home/ubuntu/marki/relance2/app/venv/bin/python console_fetch.py http://localhost:5000/URL_A_ADAPTER --stdout
```

**Attendu :** 0 erreurs, warnings Tailwind CDN OK

## Check de validation
- [ ] Liste des séquences visible
- [ ] Étapes affichées
- [ ] Activation/désactivation OK
