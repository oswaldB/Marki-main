# TODO - static/pages/contacts/index.html

## Fichier à créer
`app/static/pages/contacts/index.html`

## Source de vérité
- **Spec** : `specs/_app/static/pages/contacts/index.md`
- **Mockup** : `specs/_app/static/pages/contacts/mockups/default.html`

## Instructions

1. **Lire la spec complète** dans `specs/_app/static/pages/contacts/index.md`

2. **Suivre le mockup à la lettre**

3. **Inclure** :
   - Tableau des contacts (nom, email, téléphone, statut blacklist)
   - Filtres (tous/blacklistés/actifs)
   - Bouton ajouter contact
   - Bouton blacklist/déblacklist
   - Lien vers détail

4. **Afficher le statut** blacklist de manière visible (badge rouge)

## Dépendances
- Component sidebar-nav.js
- Store contacts/store/store.js

## Validation avec console_fetch.py

Après création, valider la page :

```bash
/home/ubuntu/marki/relance2/app/venv/bin/python console_fetch.py http://localhost:5000/URL_A_ADAPTER --stdout
```

**Attendu :** 0 erreurs, warnings Tailwind CDN OK

## Check de validation
- [ ] Mockup respecté
- [ ] Blacklist visible
- [ ] Actions fonctionnent
