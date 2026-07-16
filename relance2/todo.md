# TODO - Ajout des console.log EXHAUSTIF dans tous les workflows et routes API

## ✅ COMPLET - Backend Python - Routes API (/api/)

### `app/routes/auth.py` (19 logs)
- [x] `generate_token()` - Début, génération, succès
- [x] `decode_token()` - Décodage, succès, erreurs (expiré/invalide)
- [x] `require_auth()` - Vérification header, token manquant, token invalide, utilisateur non trouvé, succès
- [x] `login()` - Appel reçu, validation entrée, recherche utilisateur, erreurs (non trouvé/désactivé/mdp incorrect), succès
- [x] `logout()` - Appel reçu avec user_id, succès
- [x] `me()` - Appel reçu, retour profil

### `app/routes/contacts.py` (24 logs)
- [x] `list_contacts()` - Début, params reçus, parsing, filtres appliqués (search, blacklist), requête count, total, requête principale, résultat avec pagination
- [x] `get_contact()` - Début, requête, succès, non trouvé
- [x] `create_contact()` - Début, données reçues, insertion, succès avec id
- [x] `update_contact()` - Début, données reçues, mise à jour, succès
- [x] `delete_contact()` - Début, suppression, succès
- [x] `get_contact_impayes()` - Début, vérification contact, requête impayés, calcul total, succès

### `app/routes/impayes.py` (27 logs)
- [x] `list_impayes()` - Début, params reçus, parsing, filtres appliqués (statut, contact_id, dates, montants), requête count, total, requête principale, résultat
- [x] `get_impaye()` - Début, requête avec JOIN, succès, non trouvé
- [x] `create_impaye()` - Début, données reçues, génération UUID, insertion, succès
- [x] `update_impaye()` - Début, données reçues, mise à jour, succès

### `app/routes/relances.py` (26 logs)
- [x] `list_relances()` - Début, params reçus, parsing, filtres appliqués (statut, contact_id, sequence_id, dates), requête, résultat
- [x] `get_relance()` - Début, requête avec JOINs, vérification, requête impayés liés, succès
- [x] `create_relance()` - Début, données reçues, insertion, succès
- [x] `update_relance()` - Début, données reçues, mise à jour, succès
- [x] `delete_relance()` - Début, suppression, succès

### `app/routes/events.py` (16 logs)
- [x] `list_events()` - Début, params reçus, parsing, filtres appliqués (type, contact_id, dates, limit), requête, résultat
- [x] `create_event()` - Début, données reçues, insertion, succès

### `app/routes/cron.py` (13 logs)
- [x] `get_status()` - Début, récupération status, retour
- [x] `list_jobs()` - Début, comptage, retour
- [x] `trigger_job()` - Début, parsing body, exécution, succès/erreur
- [x] `trigger_workflow_direct()` - Début, parsing body, validation, exécution, succès/erreur

### `app/routes/workflow.py` (9 logs)
- [x] `require_cron_token()` - Début vérification, extraction token, validation, succès/échec
- [x] `generic_workflow()` - Appel reçu (méthode, URL), headers, body, réponse 501

## ✅ COMPLET - Backend Python - Services & Workflows

### `app/services/workflow_caller.py` (9 logs)
- [x] `__init__()` - Initialisation, configuration base_url/token
- [x] `call_workflow()` - Début appel, URL construite, méthode/payload, tentative requête, succès (HTTP 200), erreurs (Timeout, RequestException)
- [x] `log_execution()` - Enregistrement log avec timestamp, status, erreur

### `app/cron/jobs.py` (18 logs)
- [x] `execute_workflow_job()` - Démarrage, payload reçu, création caller, appel workflow, enregistrement log, résultat (succès/échec), fin
- [x] `generate_relances_job()` - Démarrage spécifique, appel générique, fin
- [x] `cleanup_logs_job()` - Démarrage spécifique, appel générique, fin
- [x] `check_expired_job()` - Démarrage spécifique, appel générique, fin

### `app/cron/scheduler.py` (32 logs)
- [x] `__new__()` - Création instance singleton
- [x] `init_scheduler()` - Initialisation scheduler
- [x] `_add_listeners()` - Ajout listeners (exécuted, error, missed), confirmation
- [x] `register_jobs()` - Début, nombre jobs, boucle configuration (détail chaque job: suppression existant, fonction choisie, trigger args, enregistrement), fin
- [x] `start()` - Démarrage scheduler
- [x] `shutdown()` - Arrêt scheduler
- [x] `get_status()` - Vérification initialisation, construction liste jobs, retour
- [x] `trigger_job()` - Appel reçu, recherche config, exécution immédiate ou prochaine exécution, succès/erreur
- [x] `init_cron()` - Initialisation complète cron

## ✅ COMPLET - Frontend JavaScript - Workflows/Stores

### `app/static/pages/dashboard/store/store.js` (37 logs)
- [x] `init()` - Démarrage, vérification token, présence/absence, chargement données, fin
- [x] `loadData()` - Début, mise à jour état (loading=true), appels API parallèles (4 endpoints), réception données, calcul stats, calcul top débiteurs, génération données graphique, génération conseils, initialisation graphique, succès, gestion erreurs (401, autres), finally (loading=false)
- [x] `fetchApi()` - Début appel, envoi requête, succès, erreur HTTP
- [x] `calculateStats()` - Début, réinitialisation, calculs (factures, impayés actifs, montant total, ancienneté par tranche), relances du jour, taux recouvrement, fin avec résultats
- [x] `calculateTopDebtors()` - Début, filtrage impayés, boucle traitement contacts, calcul jours, détermination niveau relance (R1/R2/R3), tri, fin avec résultat
- [x] `calculateChartData()` - Début, génération labels, données démo, fin
- [x] `generateSmartMarkiConseils()` - Début, génération 3 conseils, fin
- [x] `initChart()` - Début, vérification canvas, déjà initialisé, création Chart.js, configuration datasets, options, succès
- [x] `setDemoData()` - Début, chargement KPIs, impayés démo, contacts démo, relances démo, événements démo, factures démo, données graphique, fin
- [x] `syncData()` - Début, syncing=true, attente simulation, mise à jour horodatage, rechargement données, succès, erreur, finally (syncing=false)
- [x] `clearEvents()` - Début, nombre événements avant, vidage, confirmation

### `app/static/pages/login/store/store.js` (13 logs)
- [x] `init()` - Démarrage, vérification token stocké, présence (redirection), absence (formulaire), fin
- [x] `validate()` - Début, présence username/password, validation champs, résultat (valide/invalide avec détails)
- [x] `setLoading()` - Changement état avec valeur
- [x] `setError()` - Définition erreur avec message
- [x] `clearErrors()` - Réinitialisation erreurs
- [x] `loginSuccess()` - Sauvegarde token, redirection
- [x] `submitLogin()` - Début, reset erreurs, validation, loading=true, appel API login avec username, réponse HTTP, erreur (status/message), succès (token reçu), erreur réseau, finally (loading=false)

## Résumé Exhaustif

| Catégorie | Fichier | Nombre de logs |
|-----------|---------|----------------|
| **Backend Routes** | auth.py | 19 |
| | contacts.py | 24 |
| | impayes.py | 27 |
| | relances.py | 26 |
| | events.py | 16 |
| | cron.py | 13 |
| | workflow.py | 9 |
| **Backend Services** | workflow_caller.py | 9 |
| | cron/jobs.py | 18 |
| | cron/scheduler.py | 32 |
| **Frontend Stores** | dashboard/store.js | 37 |
| | login/store.js | 13 |
| **TOTAL** | | **243 logs** |

## Couverture par étape du workflow

### Workflow Frontend Dashboard:
1. ✅ Initialisation → Vérification auth → Chargement données → Affichage
2. ✅ Chaque calcul (stats, débiteurs, graphique) : Début → Traitement → Résultat
3. ✅ Chaque appel API : Début → Envoi → Réception → Succès/Échec
4. ✅ Synchronisation : Début → Simulation → Rechargement → Fin
5. ✅ Gestion erreurs : Capture → Log → Redirection si 401

### Workflow Frontend Login:
1. ✅ Initialisation → Vérification token existant → Redirection ou Formulaire
2. ✅ Validation : Début → Vérification champs → Résultat (valide/invalide)
3. ✅ Soumission : Début → Validation → Appel API → Réponse → Succès/Érreur → Redirection

### Workflow Backend API:
1. ✅ Requête entrante : Méthode + URL + Headers + Body/Params
2. ✅ Authentification : Vérification token → Extraction → Validation → Utilisateur
3. ✅ Traitement : Parsing paramètres → Application filtres → Requête DB
4. ✅ Résultat : Nombre résultats → Construction réponse → Envoi JSON
5. ✅ Erreurs : Capture → Log détaillé → Réponse appropriée

### Workflow Cron/Backend:
1. ✅ Initialisation : Scheduler → Listeners → Enregistrement jobs → Démarrage
2. ✅ Exécution job : Démarrage → Appel workflow → Attente réponse → Log → Fin
3. ✅ Appel workflow : Configuration → Requête HTTP → Réponse → Traitement → Retour

## Format des logs standardisé

**Backend Python:**
```
[API MODULE] METHOD /path - Description étape
[API MODULE] Paramètres/Données: {...}
[API MODULE] ✅ Succès: résultat
[API MODULE] ❌ Erreur: description
```

**Frontend JavaScript:**
```
[WORKFLOW NAME] method() - Description étape
[WORKFLOW NAME] method() - Données: {...}
[WORKFLOW NAME] method() - ✅ Succès
[WORKFLOW NAME] method() - ❌ Erreur: {...}
```

## Terminé ✅
**243 logs** ajoutés couvrant exhaustivement chaque étape de chaque workflow frontend et backend, plus chaque appel API entrant/reçu avec tous les paramètres et résultats intermédiaires.
