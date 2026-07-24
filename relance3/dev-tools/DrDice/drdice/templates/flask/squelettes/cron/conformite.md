# Checklist de Conformité Cron - Vérification IA

Cette checklist doit être complétée lors de la phase de vérification de conformité pour les cells cron.

## Structure du Blueprint

- [ ] Le blueprint est nommé `cron_{cell_name}`
- [ ] PAS de `template_folder` ni de routes HTTP
- [ ] L'enregistrement du job APScheduler est présent

## Configuration Cron

- [ ] Le décorateur `@scheduler.task()` est utilisé
- [ ] L'intervalle/timing est correctement configuré
- [ ] L'ID du job est unique : `{cell_name}_job`
- [ ] La fonction `execute()` est appelée dans le job

## Pattern Workflow Cron

- [ ] Fonction `execute()` principale présente
- [ ] Logs au début : `logger.info(f'[{workflow_id}] CRON_START')`
- [ ] Try/catch englobe la logique métier
- [ ] Logs de succès : `logger.info(f'[{workflow_id}] CRON_SUCCESS')`
- [ ] Logs d'erreur : `logger.error(f'[{workflow_id}] CRON_FAILED: {e}')`
- [ ] Retourne un dict avec `success` et `workflow_id`

## Gestion des Erreurs

- [ ] Les exceptions sont capturées
- [ ] Les erreurs sont loguées avec niveau ERROR
- [ ] La fonction retourne `{'success': False, 'error': str(e)}` en cas d'échec

## Accès aux Données

- [ ] Utilisation de sqlite3 standard
- [ ] Pas de connexion persistante (ouverture/fermeture par exécution)
- [ ] Les requêtes sont optimisées pour le cron

## Contexte Flask

- [ ] `with scheduler.app.app_context():` utilisé dans le job
- [ ] Accès aux modèles via imports relatifs

## Cohérence Globale

- [ ] Pas de variables mélangeant langues
- [ ] Les noms sont cohérents
- [ ] Pas de code bloquant ou trop long sans timeout
- [ ] Pas de code mort

## Notes de Vérification

<!-- L'IA doit remplir cette section avec les problèmes trouvés -->

**Problèmes détectés :**
- 

**Corrections appliquées :**
- 

**Statut final :** ⬜ Conforme / ⬜ Corrections nécessaires
