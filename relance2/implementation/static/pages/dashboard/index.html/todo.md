# TODO - static/pages/dashboard/index.html

## Fichier à créer
`app/static/pages/dashboard/index.html`

## Source de vérité
- **Spec** : `specs/_app/static/pages/dashboard/index.md`
- **Mockup** : `specs/_app/static/pages/dashboard/mockups/default.html`

## Instructions

1. **Lire la spec complète** dans `specs/_app/static/pages/dashboard/index.md`

2. **Suivre le mockup à la lettre** : copier `specs/_app/static/pages/dashboard/mockups/default.html`

3. **Adapter pour Alpine.js** selon la spec :
   - Ajouter `x-data="dashboardStore"`
   - Binder les données statistiques

4. **Inclure les composants** :
   - Sidebar navigation (voir components/sidebar-nav.js)
   - Cartes statistiques (impayés, relances en cours, etc.)
   - Tableau des dernières relances
   - Graphiques si prévus

5. **Structure du store** :
   - `stats`: { totalImpayes, totalRelances, ... }
   - `recentRelances`: array
   - `isLoading`

## Dépendances
- Component sidebar-nav.js
- Store dashboard/store/store.js
- Workflow initial-load.js

## Validation avec console_fetch.py

Après création, valider la page :

```bash
/home/ubuntu/marki/relance2/app/venv/bin/python console_fetch.py http://localhost:5000/URL_A_ADAPTER --stdout
```

**Attendu :** 0 erreurs, warnings Tailwind CDN OK

## Check de validation
- [x] Le HTML correspond exactement au mockup
- [x] Les données s'affichent correctement
- [x] La sidebar est intégrée
- [x] `console_fetch.py` → 0 erreurs
