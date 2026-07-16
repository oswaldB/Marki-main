---
id: sequences-initial-load
type: frontend
folder: specs/workflows/frontend/sequences/
description: Charger la liste des séquences de relance et de suivi
depends_on: [auth-check]
screen: sequences
global: false
mockup_entry: specs/mockups/sequences.html
---

# sequences-initial-load : Chargement initial Liste Séquences

## Description

Charger les séquences de relance et de suivi avec leurs métadonnées (nombre d'étapes, factures liées).

## Étapes

```javascript
/**
 * @action Initialiser les filtres par défaut (type='all')
 * @checkpoint state-initialized, filtres prêts
 */

/**
 * @action Afficher le skeleton loader
 * @checkpoint skeleton-shown, liste en chargement
 */

/**
 * @action Récupérer les séquences via GET /api/sequences
 * @checkpoint sequences-fetched, séquences reçues
 * 
 * **Note** : Le nombre d'étapes est calculé côté client depuis `sequence.emails.length`.
 * Pas de paramètre `include` dans le CRUD.
 */

/**
 * @action Calculer les statistiques des séquences côté client
 * @checkpoint stats-calculated, compteurs de factures liées calculés
 * 
 * **Approche full frontend** : Pas d'endpoint /stats.
 * Calcul à partir des données impayes : impayes.filter(i => i.sequence_id === seq.id).length
 */

/**
 * @action Stocker les données dans Alpine.store('sequences')
 * @checkpoint data-stored, séquences enrichies disponibles
 */

/**
 * @action Rendre la liste des séquences avec cartes visuelles
 * @checkpoint list-rendered, cartes séquences avec stats affichées
 */

/**
 * @action Activer le bouton de création de nouvelle séquence
 * @checkpoint create-button-enabled, bouton "Nouvelle séquence" fonctionnel
 */
```

## Mockups de référence

- `specs/mockups/sequences.html`

## API Calls

| Méthode | Endpoint | Description |
|---------|----------|-------------|
