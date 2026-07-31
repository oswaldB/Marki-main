---
id: relances-impayes-by-payeur
type: frontend
folder: specs/workflows/frontend/relances/
description: Afficher les impayés regroupés par payeur dans les relances
depends_on: [relances-initial-load]
screen: relances
global: false
mockup_entry: specs/mockups/relances.html
---

# relances-impayes-by-payeur : Impayés par payeur

## Description

Afficher les impayés groupés par payeur dans le contexte des relances, avec possibilité de sélection pour relance.

## Étapes

```javascript
/**
 * @action Charger la vue relances avec groupement par payeur
 * @checkpoint view-loaded, mode groupement actif
 */

/**
 * @action Récupérer les impayés non soldés via GET /api/impayes?facture_soldee=0
 * @checkpoint impayes-fetched, liste des impayés reçue
 * @api GET /api/impayes?facture_soldee=0&blacklist=0
 * @response { impayes: [...] }
 */

/**
 * @action Récupérer les contacts/payeurs via GET /api/contacts
 * @checkpoint contacts-fetched, mapping payeur_id => contact établi
 */

/**
 * @action Grouper les impayés par payeur côté client
 * @checkpoint grouped-by-payeur, Map(payeur_id => impayes[])
 * 
 * **Approche** : Pour chaque impayé, agréger dans un objet groupé :
 * - payeur_id, payeur_nom
 * - total_impayes (montant)
 * - count_impayes (nombre)
 * - date_premiere_echeance
 * - date_derniere_echeance
 * - impayes[] (détail)
 */

/**
 * @action Calculer les totaux par payeur
 * @checkpoint totals-calculated, montants agrégés calculés
 */

/**
 * @action Trier les payeurs par montant total décroissant
 * @checkpoint sorted-by-montant, ordre décroissant appliqué
 */

/**
 * @action Afficher les sections dépliables par payeur
 * @checkpoint sections-rendered, accordéons payeurs visibles
 */

/**
 * @action Afficher le résumé par payeur (nom, nb impayés, montant total)
 * @checkpoint summary-rendered, en-tête de section visible
 */

/**
 * @action Afficher la liste des impayés dans chaque section
 * @checkpoint impayes-list-rendered, tableau détaillé par payeur
 */

/**
 * @action Activer les checkboxes de sélection par impayé
 * @checkpoint checkboxes-enabled, sélection multiple possible
 */

/**
 * @action Activer le bouton "Créer relance" pour les impayés sélectionnés
 * @checkpoint create-button-enabled, bouton actif si sélection > 0
 */
```

## API Calls

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/impayes?facture_soldee=0&blacklist=0` | Impayés non soldés et non blacklistés |
| GET | `/api/contacts?statut=actif` | Contacts actifs |

## Structure des données groupées

```javascript
{
  payeur_id: "PAY_001",
  payeur_nom: "ACME Corp",
  contact_email: "contact@acme.com",
  total_impayes: 12500.00,
  count_impayes: 3,
  date_premiere_echeance: "2026-01-15",
  date_derniere_echeance: "2026-03-20",
  impayes: [
    { id: "IMP_001", numero_facture: "FAC-001", montant: 5000, ... },
    { id: "IMP_002", numero_facture: "FAC-002", montant: 4500, ... },
    { id: "IMP_003", numero_facture: "FAC-003", montant: 3000, ... }
  ]
}
```

## Mockups de référence

- `specs/mockups/relances.html` (vue groupement par payeur)
