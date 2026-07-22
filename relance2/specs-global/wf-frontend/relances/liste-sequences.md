---
id: relances-liste-sequences
type: frontend
folder: specs/workflows/frontend/relances/
description: Afficher la liste des séquences de relance disponibles
depends_on: [auth-check]
screen: sequences
global: false
mockup_entry: specs/mockups/sequences.html
---

# relances-liste-sequences : Liste des séquences de relance

## Description

Afficher la liste complète des séquences de relance configurées, avec leurs étapes, délais et templates associés.

## Étapes

```javascript
/**
 * @action Initialiser l'état avec filtres par défaut (actives uniquement)
 * @checkpoint state-initialized, filtre actif=true par défaut
 */

/**
 * @action Afficher le skeleton loader
 * @checkpoint skeleton-shown, lignes de chargement visibles
 */

/**
 * @action Récupérer les séquences via GET /api/sequences
 * @checkpoint sequences-fetched, liste complète reçue
 * @api GET /api/sequences?include_etapes=true
 * @response { sequences: [{ id, nom, description, actif, etapes: [...] }] }
 */

/**
 * @action Calculer les statistiques par séquence
 * @checkpoint stats-calculated, nombre de relances utilisant chaque séquence
 * 
 **Approche** : Compter pour chaque séquence combien de relances l'utilisent
 * depuis les données déjà chargées ou via une requête séparée
 */

/**
 * @action Trier par ordre d'affichage (champ ordre) ou par nom
 * @checkpoint sorted, ordre appliqué (défaut: ordre croissant)
 */

/**
 * @action Afficher le tableau des séquences
 * @checkpoint table-rendered, lignes avec noms et statuts visibles
 */

/**
 * @action Afficher le nombre d'étapes pour chaque séquence
 * @checkpoint etapes-count-rendered, badge avec nb étapes visible
 */

/**
 * @action Afficher le statut actif/inactif avec toggle
 * @checkpoint status-rendered, switch on/off visible et fonctionnel
 */

/**
 * @action Activer le bouton "Voir détails" par ligne
 * @checkpoint view-enabled, navigation vers fiche séquence possible
 */

/**
 * @action Activer le bouton "Réorganiser" pour changer l'ordre
 * @checkpoint reorder-enabled, drag & drop ou boutons d'ordre actifs
 */

/**
 * @action Activer le bouton "Dupliquer" pour créer une copie
 * @checkpoint duplicate-enabled, action de duplication disponible
 */
```

## API Calls

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/sequences` | Liste des séquences |
| GET | `/api/relances?sequence_id=:id` | Relances par séquence (pour stats) |

## Colonnes affichées

| Colonne | Source | Description |
|---------|--------|-------------|
| Ordre | sequence.ordre | Position dans la liste |
| Nom | sequence.nom | Nom de la séquence |
| Description | sequence.description | Description courte |
| Nb étapes | sequence.etapes.length | Nombre d'étapes |
| Délais | etapes[].delai_jours | J+15, J+30, etc. |
| Relances | count | Nb de relances utilisant cette séquence |
| Statut | sequence.actif | Actif/Inactif (toggle) |
| Actions | - | Voir, Modifier, Dupliquer, Supprimer |

## Actions disponibles

| Action | Condition | Description |
|--------|-----------|-------------|
| Voir | Toujours | Ouvrir la fiche détail |
| Modifier | Toujours | Éditer la séquence |
| Dupliquer | Toujours | Créer une copie |
| Supprimer | Aucune relance liée | Supprimer définitivement |
| Activer/Désactiver | Toujours | Toggle statut |

## Mockups de référence

- `specs/mockups/sequences.html` (liste des séquences)
