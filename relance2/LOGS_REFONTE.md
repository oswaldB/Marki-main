# REFONTE DU SYSTÈME DE LOGS

## 1. ARCHITECTURE DU NOUVEAU SYSTÈME

### Format standardisé

**Backend (Python):**
```python
# Niveau INFO: Flux principal
print(f"[NIVEAU.MODULE.FONCTION] ÉTAT: Description - contexte")

# Exemples:
print(f"[INFO.API.CONTACTS.LIST] START: Requête reçue - params={params}")
print(f"[DEBUG.API.CONTACTS.LIST] STEP: Application filtre - blacklist=True")
print(f"[INFO.API.CONTACTS.LIST] SUCCESS: {count} résultats - page=1")
print(f"[ERROR.API.CONTACTS.LIST] FAILED: Exception - {str(e)}")
```

**Frontend (JavaScript):**
```javascript
// Niveau standard
console.log('[NIVEAU.STORE.METHODE] ÉTAT: Description', data);

// Exemples:
console.log('[INFO.DASHBOARD.INIT] START: Initialisation store');
console.log('[DEBUG.DASHBOARD.LOAD] STEP: Appel API', {url, params});
console.log('[INFO.DASHBOARD.LOAD] SUCCESS: Données chargées', {count});
console.error('[ERROR.DASHBOARD.LOAD] FAILED:', error);
```

### Niveaux de log

| Niveau | Usage | Couleur/Affichage |
|--------|-------|-------------------|
| `START` | Début de fonction/workflow | 🟦 Info standard |
| `STEP` | Étapes intermédiaires | 🟨 Debug (détail) |
| `DATA` | Données importantes | 🟨 Debug |
| `SUCCESS` | Opération réussie | 🟩 Info |
| `WARNING` | Avertissement | 🟧 Warn |
| `ERROR` | Erreur | 🟥 Error |
| `END` | Fin de fonction | 🟦 Info |

---

## 2. PLAN DE MIGRATION PAR FICHIER

### Phase 1: Frontend Stores

#### Fichier: `app/static/pages/dashboard/store/store.js`

| Méthode | Logs requis |
|---------|-------------|
| `init()` | START → CHECK_AUTH → [HAS_TOKEN/NO_TOKEN] → END |
| `loadData()` | START → FETCH_START → [4x FETCH_STEP] → PROCESS_DATA → CALC_STATS → CALC_DEBTORS → CALC_CHART → GEN_ADVICES → INIT_CHART → SUCCESS/ERROR → END |
| `fetchApi()` | START → REQUEST → SUCCESS/ERROR → END |
| `calculateStats()` | START → CALC_KPIS → CALC_ANCIENNETE → DATA → END |
| `calculateTopDebtors()` | START → GROUP_BY_CONTACT → CALC_DAYS → SORT → DATA → END |
| `calculateChartData()` | START → DATA → END |
| `generateSmartMarkiConseils()` | START → GEN_CONSEILS → DATA → END |
| `initChart()` | START → CHECK_CANVAS → [CREATE/SKIP] → END |
| `syncData()` | START → SYNC_START → LOAD_DATA → SUCCESS/ERROR → END |
| `clearEvents()` | START → COUNT_BEFORE → CLEAR → END |

#### Fichier: `app/static/pages/login/store/store.js`

| Méthode | Logs requis |
|---------|-------------|
| `init()` | START → CHECK_TOKEN → [REDIRECT/SHOW_FORM] → END |
| `validate()` | START → CHECK_FIELDS → [VALID/INVALID] → END |
| `submitLogin()` | START → CLEAR_ERRORS → VALIDATE → [PASS/FAIL] → API_CALL → [SUCCESS/ERROR] → END |
| `loginSuccess()` | START → SAVE_TOKEN → REDIRECT → END |

### Phase 2: Backend Routes

#### Fichier: `app/routes/auth.py`

| Fonction | Logs requis |
|----------|-------------|
| `generate_token()` | START → GEN_PAYLOAD → ENCODE → END |
| `decode_token()` | START → DECODE → [VALID/EXPIRED/INVALID] → END |
| `require_auth()` | START → EXTRACT_TOKEN → VERIFY → [SUCCESS/FAIL] → END |
| `login()` | START → PARSE_DATA → FIND_USER → [NOT_FOUND/DISABLED/BAD_PASSWORD] → GEN_TOKEN → SUCCESS → END |
| `logout()` | START → CLEAR → END |
| `me()` | START → GET_USER → DATA → END |

#### Fichier: `app/routes/contacts.py`

| Fonction | Logs requis |
|----------|-------------|
| `list_contacts()` | START → PARSE_PARAMS → APPLY_FILTERS → QUERY_COUNT → QUERY_DATA → SUCCESS → END |
| `get_contact()` | START → QUERY → [FOUND/NOT_FOUND] → END |
| `create_contact()` | START → PARSE_DATA → INSERT → SUCCESS → END |
| `update_contact()` | START → PARSE_DATA → UPDATE → SUCCESS → END |
| `delete_contact()` | START → DELETE → SUCCESS → END |
| `get_contact_impayes()` | START → CHECK_CONTACT → QUERY_IMPAYES → CALC_TOTAL → SUCCESS → END |

#### Fichier: `app/routes/impayes.py`

| Fonction | Logs requis |
|----------|-------------|
| `list_impayes()` | START → PARSE_PARAMS → APPLY_FILTERS → QUERY_COUNT → QUERY_DATA → SUCCESS → END |
| `get_impaye()` | START → QUERY → [FOUND/NOT_FOUND] → END |
| `create_impaye()` | START → PARSE_DATA → GEN_UUID → INSERT → SUCCESS → END |
| `update_impaye()` | START → PARSE_DATA → UPDATE → SUCCESS → END |

#### Fichier: `app/routes/relances.py`

| Fonction | Logs requis |
|----------|-------------|
| `list_relances()` | START → PARSE_PARAMS → APPLY_FILTERS → QUERY → SUCCESS → END |
| `get_relance()` | START → QUERY → [FOUND/NOT_FOUND] → QUERY_IMPAYES → SUCCESS → END |
| `create_relance()` | START → PARSE_DATA → INSERT → SUCCESS → END |
| `update_relance()` | START → PARSE_DATA → UPDATE → SUCCESS → END |
| `delete_relance()` | START → DELETE → SUCCESS → END |

#### Fichier: `app/routes/events.py`

| Fonction | Logs requis |
|----------|-------------|
| `list_events()` | START → PARSE_PARAMS → APPLY_FILTERS → QUERY → SUCCESS → END |
| `create_event()` | START → PARSE_DATA → INSERT → SUCCESS → END |

#### Fichier: `app/routes/cron.py`

| Fonction | Logs requis |
|----------|-------------|
| `get_status()` | START → GET_STATUS → DATA → END |
| `list_jobs()` | START → COUNT → DATA → END |
| `trigger_job()` | START → PARSE_BODY → EXECUTE → [SUCCESS/ERROR] → END |
| `trigger_workflow_direct()` | START → PARSE_BODY → VALIDATE → EXECUTE → [SUCCESS/ERROR] → END |

#### Fichier: `app/routes/workflow.py`

| Fonction | Logs requis |
|----------|-------------|
| `require_cron_token()` | START → EXTRACT_TOKEN → VERIFY → [SUCCESS/FAIL] → END |
| `generic_workflow()` | START → RECEIVE_CALL → [NOT_IMPLEMENTED] → END |

#### Fichier: `app/routes/pages.py`

| Fonction | Logs requis |
|----------|-------------|
| `index()` | START → REDIRECT → END |
| `hello_page()` | START → SERVE → END |
| `login_page()` | START → SERVE → END |
| `dashboard_page()` | START → SERVE → END |
| `serve_page()` | START → SERVE → END |
| `serve_static()` | START → SERVE → END |

### Phase 3: Backend Services

#### Fichier: `app/services/workflow_caller.py`

| Méthode | Logs requis |
|---------|-------------|
| `__init__()` | START → CONFIG → END |
| `call_workflow()` | START → BUILD_URL → REQUEST → [SUCCESS/TIMEOUT/ERROR] → DATA → END |
| `log_execution()` | START → FORMAT → END |

#### Fichier: `app/cron/scheduler.py`

| Méthode | Logs requis |
|---------|-------------|
| `init_scheduler()` | START → INIT → END |
| `_add_listeners()` | START → ADD_LISTENERS → END |
| `register_jobs()` | START → COUNT → [LOOP: CONFIGURE_EACH] → END |
| `start()` | START → RUN → END |
| `shutdown()` | START → STOP → END |
| `get_status()` | START → BUILD_STATUS → DATA → END |
| `trigger_job()` | START → FIND_JOB → [EXECUTE/SCHEDULE] → [SUCCESS/FAIL] → END |

#### Fichier: `app/cron/jobs.py`

| Fonction | Logs requis |
|----------|-------------|
| `execute_workflow_job()` | START → CREATE_CALLER → CALL → LOG_RESULT → [SUCCESS/FAIL] → END |
| `generate_relances_job()` | START → CALL_GENERIC → END |
| `cleanup_logs_job()` | START → CALL_GENERIC → END |
| `check_expired_job()` | START → CALL_GENERIC → END |

---

## 3. CHECKLIST DE MIGRATION

### À faire par fichier

- [ ] Supprimer les anciens logs incohérents
- [ ] Ajouter les logs START/END sur chaque fonction
- [ ] Ajouter les logs STEP pour les étapes importantes
- [ ] Ajouter les logs DATA pour les données clés
- [ ] Ajouter les logs ERROR explicites avec contexte
- [ ] Vérifier la cohérence des préfixes
- [ ] Tester l'affichage des logs

### Ordre de traitement recommandé

1. **Frontend stores** (2 fichiers) - Validation rapide
2. **Backend routes** (8 fichiers) - API principale
3. **Backend services** (3 fichiers) - Infrastructure

---

*Plan de refonte des logs - Version 2.0*
