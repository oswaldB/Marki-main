---
id: relances-liste-par-payeur
type: frontend
folder: specs/workflows/frontend/relances/
description: Afficher la liste des relances d'un payeur spécifique
depends_on: [relances-initial-load]
screen: relances
global: false
mockup_entry: specs/mockups/relances.html
---

# relances-liste-par-payeur : Liste des relances par payeur

## Description

Afficher toutes les relances associées à un payeur spécifique, avec leur statut, dates et actions possibles.

## Étapes

```javascript
/**
 * @action Filtrer la liste des relances par payeur_id
 * @checkpoint filter-applied, paramètre payeur_id extrait de l'URL ou sélectionné
 */

/**
 * @action Afficher le skeleton loader
 * @checkpoint skeleton-shown, état de chargement visible
 */

/**
 * @action Récupérer les relances via GET /api/relances?payeur_id=:id
 * @checkpoint relances-fetched, liste filtrée reçue
 * @api GET /api/relances?payeur_id=:id&order_by=date_creation&order=DESC
 * @response { relances: [...], total: N }
 */

/**
 * @action Récupérer les détails du payeur via GET /api/payers/:id
 * @checkpoint payeur-fetched, nom et informations reçues
 */

/**
 * @action Enrichir les relances avec les données de séquence
 * @checkpoint sequences-enriched, noms des séquences ajoutés
 * 
 * Pour chaque relance, récupérer le nom de la séquence associée
 * depuis les données déjà chargées ou via GET /api/sequences
 */

/**
 * @action Calculer les statistiques des relances du payeur
 * @checkpoint stats-calculated, indicateurs calculés côté client
 * - total_relances
 * - relances_par_statut
 * - montant_total_relance
 */

/**
 * @action Afficher l'en-tête avec nom du payeur et résumé
 * @checkpoint header-rendered, titre et stats visibles
 */

/**
 * @action Afficher le tableau des relances
 * @checkpoint table-rendered, lignes avec statuts et actions visibles
 */

/**
 * @action Colorer les lignes selon le statut
 * @checkpoint status-colors-applied, brouillon=gris, envoyee=vert, etc.
 */

/**
 * @action Activer les boutons d'action par ligne
 * @checkpoint row-actions-enabled, boutons selon statut de chaque relance
 */

/**
 * @action Afficher le résumé des impayés liés
 * @checkpoint linked-impayes-shown, montant total des impayés visible
 */
```

## API Calls

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/relances?payeur_id=:id` | Relances filtrées par payeur |
| GET | `/api/payers/:id` | Détails du payeur |
| GET | `/api/sequences` | Séquences (pour noms) |

## Colonnes affichées

| Colonne | Source | Description |
|---------|--------|-------------|
| ID relance | relance.id | Identifiant unique |
| Séquence | sequence.nom | Nom de la séquence |
| Étape | relance.etape_sequence | N° d'étape |
| Statut | relance.statut | Badge coloré |
| Date création | relance.date_creation | Date de création |
| Date envoi | relance.date_envoi_programmee | Date programmée/réelle |
| Montant | relance.montant_total | Total des impayés |
| Actions | - | Voir/Modifier/Annuler/Valider |

## Statuts et couleurs

| Statut | Couleur | Actions disponibles |
|--------|---------|---------------------|
| brouillon | gris | Voir, Modifier, Supprimer |
| a_valider | orange | Voir, Valider, Modifier |
| programmee | bleu | Voir, Annuler |
| envoyee | vert | Voir |
| annulee | rouge | Voir |

## Mockups de référence

- `specs/mockups/relances.html` (liste filtrée par payeur)
