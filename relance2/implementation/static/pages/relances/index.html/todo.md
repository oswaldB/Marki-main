# TODO - static/pages/relances/index.html

## Fichier à créer
`app/static/pages/relances/index.html`

## Source de vérité
- **Spec** : `specs/_app/static/pages/relances/index.md`
- **Mockup** : `specs/_app/static/pages/relances/mockups/default.html`

## Instructions

1. **Lire la spec complète** dans `specs/_app/static/pages/relances/index.md`

2. **Suivre le mockup à la lettre**

3. **Adapter pour Alpine.js** :
   - Liste des relances
   - Statuts (brouillon, validée, envoyée, payée)
   - Bouton "Générer relances"
   - Navigation vers `/relances/<id>`

4. **Inclure les liens** vers :
   - `/relances/calendrier` (vue calendrier)
   - `/relances/validation` (validation batch)

## Dépendances
- Component sidebar-nav.js
- Store relances/store/store.js

## Validation avec console_fetch.py

Après création, valider la page :

```bash
/home/ubuntu/marki/relance2/app/venv/bin/python console_fetch.py http://localhost:5000/URL_A_ADAPTER --stdout
```

**Attendu :** 0 erreurs, warnings Tailwind CDN OK

## Check de validation
- [ ] Mockup respecté
- [ ] Navigation vers détail
- [ ] Bouton génération fonctionnel
