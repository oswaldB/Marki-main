---
id: relances-a-valider-list
type: frontend
folder: specs/workflows/frontend/relances/
description: Afficher la liste des relances en attente de validation
depends_on: [auth-check]
screen: relances-validation
global: false
mockup_entry: specs/mockups/relances-validation.html
---

# relances-a-valider-list : Liste des relances à valider

## Description

Afficher toutes les relances en statut "à valider" nécessitant une action manuelle avant programmation ou envoi.

## Étapes

```javascript
/**
 * @action Initialiser le filtre sur statut='a_valider'
 * @checkpoint filter-initialized, paramètre statut défini
 */

/**
 * @action Afficher le skeleton loader
 * @checkpoint skeleton-shown, état de chargement visible
 */

/**
 * @action Récupérer les relances via GET /api/relances?statut=a_valider
 * @checkpoint relances-fetched, liste des relances à valider reçue
 * @api GET /api/relances?statut=a_valider&order_by=date_creation
 * @response { relances: [...], total: N }
 */

/**
 * @action Récupérer les payeurs associés via GET /api/payers
 * @checkpoint payers-fetched, mapping payeur_id => nom établi
 */

/**
 * @action Calculer les statistiques (total à valider, montant global)
 * @checkpoint stats-calculated, indicateurs visuels calculés
 */

/**
 * @action Afficher l'en-tête avec badge du nombre à valider
 * @checkpoint header-rendered, titre "Relances à valider (N)" visible
 */

/**
 * @action Afficher la liste des relances en attente
 * @checkpoint list-rendered, tableau avec toutes les relances visibles
 */

/**
 * @action Colorer les lignes selon l'ancienneté
 * @checkpoint aging-colors-applied, 
 * - > 7 jours: rouge
 * - > 3 jours: orange
 * - <= 3 jours: normal
 */

/**
 * @action Afficher le détail des impayés liés à chaque relance
 * @checkpoint impayes-preview-rendered, aperçu des factures visible
 */

/**
 * @action Activer les boutons d'action rapide
 * @checkpoint quick-actions-enabled, 
 * - Valider en 1 clic
 * - Voir détails
 * - Modifier
 * - Refuser
 */

/**
 * @action Activer la sélection multiple pour actions en lot
 * @checkpoint bulk-selection-enabled, checkboxes et actions groupées disponibles
 */

/**
 * @action Afficher les actions groupées (valider X relances)
 * @checkpoint bulk-actions-shown, boutons apparaissent si sélection > 0
 */
```

## API Calls

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/relances?statut=a_valider` | Relances à valider |
| GET | `/api/payers` | Payeurs pour noms |
| GET | `/api/impayes?relance_id=:id` | Impayés liés |

## Colonnes affichées

| Colonne | Source | Description |
|---------|--------|-------------|
| Sélection | - | Checkbox pour actions groupées |
| Date création | relance.date_creation | Triable |
| Payeur | payeur.nom | Nom du payeur |
| Montant | relance.montant_total | Total TTC |
| Nb impayés | count | Nombre de factures |
| Séquence | sequence.nom | Séquence de relance |
| Échéance | min(impayes.date_echeance) | Date échéance la plus ancienne |
| Ancienneté | calcul | Jours depuis création |
| Actions | - | Valider / Voir / Modifier |

## Actions individuelles

| Action | Description |
|--------|-------------|
| ✅ Valider | Passe en statut 'programmée' |
| 👁️ Voir | Ouvre la prévisualisation |
| ✏️ Modifier | Ouvre le modal d'édition |
| ❌ Refuser | Annule la relance (avec motif) |

## Actions groupées

| Action | Description |
|--------|-------------|
| Valider la sélection | Valide toutes les relances cochées |
| Refuser la sélection | Annule toutes les relances cochées |
| Exporter la liste | Génère un CSV des relances affichées |

## Mockups de référence

- `specs/mockups/relances-validation.html` (liste à valider)
