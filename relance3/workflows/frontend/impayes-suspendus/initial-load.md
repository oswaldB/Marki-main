---
id: impayes-suspendus-initial-load
type: frontend
folder: specs/workflows/frontend/impayes-suspendus/
description: Charger la liste des factures suspendues avec motifs et dates
depends_on: [auth-check]
screen: impayes-suspendus
global: false
mockup_entry: specs/mockups/impayes-suspendus.html
---

# impayes-suspendus-initial-load : Chargement initial Impayés Suspendus

## Description

Charger la liste des factures mises en attente (suspendues) avec leurs motifs et informations de suspension.

## Étapes

```javascript
/**
 * @action Initialiser les filtres par défaut
 * @checkpoint state-initialized, filters.motif=''
 */

/**
 * @action Afficher le skeleton loader
 * @checkpoint skeleton-shown, tableau en état de chargement
 */

/**
 * @action Récupérer les factures suspendues via GET /api/impayes?facture_soldee=0&statut=impaye
 * @checkpoint suspendus-fetched, liste des factures en attente reçue
 * 
 * **Approche** : Utilise le CRUD avec filtre sur `is_suspended=true`
 * Le backend utilise `db.search('impayes', { is_suspended: true })`
 */

/**
 * @action Extraire les motifs uniques des factures suspendues
 * @checkpoint motifs-extracted, options de filtrage calculées côté client
 * 
 * **Note** : Pas de table `suspension-motifs`. Les motifs sont extraits 
 * des champs `blacklist_motif` des factures suspendues elles-mêmes.
 */

/**
 * @action Stocker les données dans le store
 * @checkpoint data-stored, facturesSuspendues et motifs enregistrés
 */

/**
 * @action Rendre le tableau avec les badges de statut
 * @checkpoint table-rendered, colonnes motif/date/option réactivation visibles
 */
```

## Mockups de référence

- `specs/mockups/impayes-suspendus.html`

## API Calls

| Méthode | Endpoint | Description |
|---------|----------|-------------|
