# TODO - static/pages/dashboard/workflows/initial-load.js

## Fichier à créer
`app/static/pages/dashboard/workflows/initial-load.js`

## Source de vérité
- **Spec** : `specs/_app/static/pages/dashboard/workflows/initial-load.md`

## Instructions

1. **Lire la spec complète** dans `specs/_app/static/pages/dashboard/workflows/initial-load.md`

2. **Implémenter les checkpoints** :
   ```javascript
   async function initialLoad() {
     // @checkpoint 1: Vérifier auth (token présent)
     // @checkpoint 2: Mettre isLoading à true
     // @checkpoint 3: Charger les stats via API
     // @checkpoint 4: Charger les relances récentes
     // @checkpoint 5: Mettre isLoading à false
     // @checkpoint 6: Afficher les données
   }
   ```

3. **Gérer l'auth** : rediriger vers /login si pas de token

## Dépendances
- Store dashboardStore
- Routes API `/api/dashboard/*`

## Check de validation
- [x] Tous les checkpoints implémentés
- [x] Redirection si non authentifié
- [x] `console_fetch.py` → 0 erreurs
