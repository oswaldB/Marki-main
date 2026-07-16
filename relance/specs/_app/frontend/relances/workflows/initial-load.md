---
id: relances-initial-load
type: frontend
folder: specs/workflows/frontend/relances/
description: Charger la liste des relances programmées et envoyées
depends_on: [auth-check]
screen: relances
global: false
mockup_entry: specs/mockups/relances.html
---

# relances-initial-load : Chargement initial Liste Relances

## Description

Charger la liste des relances avec leur statut, payeur associé, et options de filtrage.

## Étapes

```javascript
/**
 * @action Initialiser les filtres par défaut (statut='')
 * @checkpoint state-initialized, filtres et pagination initialisés
 */

/**
 * @action Afficher le skeleton loader du tableau
 * @checkpoint skeleton-shown, lignes de chargement visibles
 */

/**
 * @action Récupérer les données via GET /api/relances GET /api/contacts?statut=actif&limit=50
 * @checkpoint data-fetched, relances, contacts et impayes reçus
 * 
 * **Approche** : 3 appels API nécessaires car le mockup affiche:
 * - Les relances avec leurs statuts
 * - Les contacts (payeurs) avec nom, email, total impayés
 * - Les impayes (factures) liés aux payeurs
 * 
 * Les données sont ensuite agrégées côté client pour le groupement par payeur.
 */

/**
 * @action Calculer les statistiques des relances côté client
 * @checkpoint stats-calculated, compteurs par statut calculés
 * 
 * **Approche full frontend** : Pas d'endpoint /stats. 
 * Calcul à partir des données reçues : relances.filter(r => r.statut === 'xxx').length
 */

/**
 * @action Stocker les données dans Alpine.store('relances')
 * @checkpoint data-stored, relances et stats disponibles
 */

/**
 * @action Rendre le tableau groupé par payeur
 * @checkpoint table-rendered, sections dépliables par payeur affichées
 */

/**
 * @action Activer les contrôles d'action (envoi, modification)
 * @checkpoint actions-enabled, boutons d'action fonctionnels
 */
```

## Mockups de référence

- `specs/mockups/relances.html`

## API Calls

| Méthode | Endpoint | Description |
|---------|----------|-------------|
