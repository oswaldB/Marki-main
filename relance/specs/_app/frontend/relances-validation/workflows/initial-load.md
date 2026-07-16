---
id: relances-validation-initial-load
type: frontend
folder: specs/workflows/frontend/relances-validation/
description: Charger les relances en attente de validation avec preview
depends_on: [auth-check]
screen: relances-validation
global: false
mockup_entry: specs/mockups/relances-validation.html
---

# relances-validation-initial-load : Chargement initial Validation Relances

## Description

Charger les relances en statut 'à valider' permettant leur revue et approbation avant envoi.

## Étapes

```javascript
/**
 * @action Initialiser l'état de sélection (selectedRelances vide)
 * @checkpoint state-initialized, mode sélection prêt
 */

/**
 * @action Afficher le skeleton loader
 * @checkpoint skeleton-shown, tableau en chargement
 */

/**
 * @action Récupérer les relances à valider via GET /api/relancesvalide=false&statut=pret%20pour%20envoi
 * @checkpoint relances-fetched, relances en attente de validation reçues
 * 
 * **Filtre** : `valide=false` (boolean) ET `statut=pret pour envoi`.
 * Le champ `valide` indique si la relance a été validée par un utilisateur.
 * Le statut `pret pour envoi` indique qu'elle est prête à être envoyée.
 * 
 * **Note** : Le CRUD supporte le filtrage par query params sur les champs indexés.
 */

/**
 * @action Récupérer les templates email pour preview via GET /api/templates
 * @checkpoint templates-fetched, templates disponibles pour aperçu
 */

/**
 * @action Stocker les données dans le store
 * @checkpoint data-stored, relancesAValider et templates prêts
 */

/**
 * @action Rendre le tableau avec cases à cocher de sélection
 * @checkpoint table-rendered, colonnes sélection + aperçu disponibles
 */

/**
 * @action Activer les boutons d'action batch (valider/rejeter sélection)
 * @checkpoint batch-actions-enabled, boutons fonctionnels
 */
```

## Mockups de référence

- `specs/mockups/relances-validation.html`

## API Calls

| Méthode | Endpoint | Description |
|---------|----------|-------------|
