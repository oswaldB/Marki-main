# Checklist de Conformité Backend - Vérification IA

Cette checklist doit être complétée lors de la phase de vérification de conformité pour les cells backend-wf.

## Structure du Blueprint

- [ ] Le blueprint est correctement nommé `{cell_name}`
- [ ] PAS de `template_folder` (backend uniquement)
- [ ] L'import des routes se fait après la création du blueprint

## Routes API (routes/wf_*.py)

- [ ] Le décorateur `@bp.route()` utilise les bonnes méthodes HTTP (POST, GET)
- [ ] La fonction endpoint retourne `jsonify(result)`
- [ ] Le format de l'URL API est `/api/{endpoint}`

## Workflow Pattern

- [ ] Classe `WorkflowContext` initialisée avec uuid, timestamp
- [ ] Classe `WorkflowResult` retournée par la fonction execute()
- [ ] Classe `WorkflowLogger` utilisée pour tous les logs
- [ ] Fonction `execute(**kwargs)` principale présente
- [ ] Pattern de logging exhaustif respecté:
  - [ ] `WORKFLOW_START` au début
  - [ ] `VALIDATION_START/END` pour les validations
  - [ ] `DB_QUERY_START/END` pour les requêtes
  - [ ] `WORKFLOW_SUCCESS` ou `WORKFLOW_ERROR` à la fin

## Gestion des Erreurs

- [ ] Try/catch/finally englobe tout le workflow
- [ ] Les erreurs sont loguées avec `log.error()`
- [ ] Le résultat retourné contient `success: false` en cas d'erreur
- [ ] Le message d'erreur est inclus dans `error:`

## Imports et Dépendances

- [ ] Pas d'imports circulaires
- [ ] Les imports lourds sont dans les fonctions, pas en global
- [ ] `from .. import bp` pour accéder au blueprint
- [ ] `from flask import request, jsonify` pour les routes

## Validations

- [ ] Les entrées sont validées avant traitement
- [ ] Les types de données sont vérifiés
- [ ] Les champs requis sont présents

## Base de Données

- [ ] Utilisation de sqlite3 standard (pas d'ORM)
- [ ] Les requêtes utilisent des paramètres (?, :name) pour éviter les injections
- [ ] La connexion est fermée après usage
- [ ] Les transactions sont commitées

## Cohérence Globale

- [ ] Pas de variables mélangeant langues
- [ ] Les noms sont cohérents entre fichiers
- [ ] Les imports sont organisés (stdlib, tiers, locaux)
- [ ] Pas de code mort ou de commentaires de debug

## Notes de Vérification

<!-- L'IA doit remplir cette section avec les problèmes trouvés -->

**Problèmes détectés :**
- 

**Corrections appliquées :**
- 

**Statut final :** ⬜ Conforme / ⬜ Corrections nécessaires
