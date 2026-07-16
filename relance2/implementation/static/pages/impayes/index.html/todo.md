# TODO - static/pages/impayes/index.html

## Fichier à créer
`app/static/pages/impayes/index.html`

## Source de vérité
- **Spec** : `specs/_app/static/pages/impayes/index.md`
- **Mockup** : `specs/_app/static/pages/impayes/mockups/default.html`

## Instructions

1. **Lire la spec complète** dans `specs/_app/static/pages/impayes/index.md`

2. **Suivre le mockup à la lettre** : `specs/_app/static/pages/impayes/mockups/default.html`

3. **Adapter pour Alpine.js** :
   - `x-data="impayesStore"`
   - Liste des impayés avec `x-for`
   - Filtres et recherche

4. **Inclure** :
   - Tableau des impayés (numéro, client, montant, date, statut)
   - Boutons actions (voir, réparer, suspendre)
   - Navigation vers `/impayes/<id>`

## Dépendances
- Component sidebar-nav.js
- Store impayes/store/store.js
- Workflow initial-load.js

## Validation avec console_fetch.py

Après création, valider la page :

```bash
/home/ubuntu/marki/relance2/app/venv/bin/python console_fetch.py http://localhost:5000/URL_A_ADAPTER --stdout
```

**Attendu :** 0 erreurs, warnings Tailwind CDN OK

## Check de validation
- [ ] Mockup respecté pixel-perfect
- [ ] Navigation fonctionne
- [ ] Filtres fonctionnels
