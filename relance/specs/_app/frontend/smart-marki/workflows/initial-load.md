---
id: smart-marki-initial-load
type: frontend
folder: specs/workflows/frontend/smart-marki/
description: Charger les suggestions IA et statistiques Smart Marki
depends_on: [auth-check]
screen: smart-marki
global: false
mockup_entry: specs/mockups/smart-marki.html
---

# smart-marki-initial-load : Chargement initial Smart Marki

## Description

Charger les suggestions générées par l'IA, les statistiques d'utilisation et l'état des features.

## Étapes

```javascript
/**
 * @action Initialiser l'état des features activées depuis localStorage
 * @checkpoint features-initialized, préférences utilisateur chargées
 */

/**
 * @action Afficher le spinner de chargement
 * @checkpoint loading-shown, interface en chargement
 */

/**
 * @action Récupérer les suggestions IA via GET /api/smart/suggestions
 * @checkpoint suggestions-fetched, suggestions d'actions reçues
 */

/**
 * @action Récupérer les statistiques Smart via GET /api/smart/stats
 * @checkpoint stats-fetched, taux d'acceptation et temps économisé reçus
 */

/**
 * @action Récupérer l'historique des actions via GET /api/smart/history
 * @checkpoint history-fetched, actions précédemment acceptées/rejetées
 */

/**
 * @action Stocker les données dans Alpine.store('smartMarki')
 * @checkpoint data-stored, suggestions, stats et historique disponibles
 */

/**
 * @action Rendre les cartes de suggestions avec niveaux de confiance
 * @checkpoint cards-rendered, suggestions affichées avec boutons accepter/refuser
 */

/**
 * @action Activer l'assistant chat si feature activée
 * @checkpoint chat-enabled, interface de chat fonctionnelle
 */
```

## Mockups de référence

- `specs/mockups/smart-marki.html`

## API Calls

| Méthode | Endpoint | Description |
|---------|----------|-------------|
