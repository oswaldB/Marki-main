# AUDIT COMPLET DES WORKFLOWS ET ROUTES API

## Date: 2024-07-15
## Projet: marki/relance2

---

## PARTIE 1: STRUCTURE ACTUELLE

### 1.1 Fichiers dans specs/_app/

```
specs/_app/
├── routes/          <- Routes API (spécifications)
│   ├── auth.md
│   ├── contacts.md
│   ├── events.md
│   ├── impayes.md
│   ├── pages.md
│   ├── relances.md
│   ├── sequences.md
│   ├── smtp.md
│   ├── tokens.md
│   ├── users.md
│   └── workflow.md
├── static/          <- Frontend workflows
│   ├── components/
│   │   ├── sidebar-nav-dual.js
│   │   └── sidebar-nav.js
│   └── pages/
│       ├── dashboard/
│       │   └── store/
│       │       └── store.js      <- WORKFLOW DASHBOARD
│       ├── login/
│       │   └── store/
│       │       └── store.js      <- WORKFLOW LOGIN
│       └── hello/
│           └── index.html
└── workflows/       <- Backend workflows (spécifications)
    ├── appliquer-regles-attribution.md
    ├── auth-login.md
    ├── cleanup-all-relances-contact-blackliste.md
    ├── cleanup-all-relances-paid-impayes.md
    ├── cleanup-orphan-relances.md
    ├── cleanup-relances-contact-blackliste.md
    ├── contacts-blacklist.md
    ├── generate-contact-token.md
    ├── generate-pdf-links.md
    ├── generate-relances.md
    ├── generate-suivi.md
    ├── get-contact-impayes.md
    ├── impayes-suspend.md
    ├── impayes-unsuspend.md
    ├── import-invoice.md
    ├── portail-client.md
    ├── regenerate-relances-contact.md
    ├── regenerate-relances-with-status.md
    ├── send-emails.md
    ├── send-suivi.md
    ├── sync-contacts.md
    ├── users-management.md
    └── verify-paid-invoices.md
```

### 1.2 Fichiers dans app/ (Implémentation)

```
app/
├── routes/          <- Routes API (implémentation Python)
│   ├── __init__.py
│   ├── auth.py      <- /api/auth/*
│   ├── contacts.py  <- /api/contacts/*
│   ├── cron.py      <- /api/cron/*
│   ├── events.py    <- /api/events/*
│   ├── impayes.py   <- /api/impayes/*
│   ├── pages.py     <- Pages statiques
│   ├── relances.py  <- /api/relances/*
│   └── workflow.py  <- /api/workflow/*
├── static/          <- Frontend workflows (implémentation)
│   ├── components/
│   └── pages/
│       ├── dashboard/
│       │   └── store/
│       │       └── store.js      <- WORKFLOW DASHBOARD (Alpine.js)
│       └── login/
│           └── store/
│               └── store.js      <- WORKFLOW LOGIN (Alpine.js)
├── services/
│   └── workflow_caller.py       <- Service appel workflows
├── cron/
│   ├── __init__.py
│   ├── config.py                <- Config jobs cron
│   ├── jobs.py                  <- Jobs exécutables
│   └── scheduler.py             <- Scheduler APScheduler
└── workflows/                   <- Workflows backend (vide actuellement)
    └── __init__.py
```

---

## PARTIE 2: INVENTAIRE EXHAUSTIF DES FICHIERS

### 2.1 FRONTEND - Workflows (JavaScript/Alpine.js)

| Fichier | Type | Description | Méthodes principales |
|---------|------|-------------|---------------------|
| `app/static/pages/dashboard/store/store.js` | Store Alpine.js | Workflow Dashboard - Gestion du tableau de bord | init(), loadData(), fetchApi(), calculateStats(), calculateTopDebtors(), calculateChartData(), generateSmartMarkiConseils(), initChart(), setDemoData(), syncData(), clearEvents(), getInitials(), formatMoney() |
| `app/static/pages/login/store/store.js` | Store Alpine.js | Workflow Login - Gestion de l'authentification | init(), validate(), setLoading(), setError(), clearErrors(), loginSuccess(), submitLogin() |
| `app/static/components/sidebar-nav.js` | Component | Navigation sidebar | - |
| `app/static/components/sidebar-nav-dual.js` | Component | Navigation sidebar dual | - |

### 2.2 BACKEND - Routes API (Python/Flask)

| Fichier | Blueprint | Routes | Fonctions |
|---------|-----------|--------|-----------|
| `app/routes/auth.py` | `auth` | `/api/auth/*` | generate_token(), decode_token(), require_auth(), login(), logout(), me() |
| `app/routes/contacts.py` | `contacts` | `/api/contacts/*` | list_contacts(), get_contact(), create_contact(), update_contact(), delete_contact(), get_contact_impayes() |
| `app/routes/impayes.py` | `impayes` | `/api/impayes/*` | list_impayes(), get_impaye(), create_impaye(), update_impaye() |
| `app/routes/relances.py` | `relances` | `/api/relances/*` | list_relances(), get_relance(), create_relance(), update_relance(), delete_relance() |
| `app/routes/events.py` | `events` | `/api/events/*` | list_events(), create_event() |
| `app/routes/cron.py` | `cron` | `/api/cron/*` | get_status(), list_jobs(), trigger_job(), trigger_workflow_direct() |
| `app/routes/workflow.py` | `workflow` | `/api/workflow/*` | require_cron_token(), generic_workflow() |
| `app/routes/pages.py` | `pages` | `/`, `/login`, `/dashboard`, etc. | index(), hello_page(), login_page(), dashboard_page(), serve_page(), serve_static() |

### 2.3 BACKEND - Services & Workflows (Python)

| Fichier | Classe/Fonctions | Description |
|---------|-----------------|-------------|
| `app/services/workflow_caller.py` | `WorkflowCaller` | Service d'appel HTTP aux workflows | __init__(), call_workflow(), log_execution() |
| `app/cron/scheduler.py` | `CronScheduler` | Gestionnaire de tâches planifiées | init_scheduler(), _add_listeners(), register_jobs(), start(), shutdown(), get_status(), trigger_job() |
| `app/cron/jobs.py` | Fonctions | Jobs exécutables par le scheduler | execute_workflow_job(), generate_relances_job(), cleanup_logs_job(), check_expired_job() |
| `app/cron/config.py` | Config | Configuration des jobs cron | CRON_JOBS, SCHEDULER_CONFIG |

---

## PARTIE 3: ANALYSE DES LOGS ACTUELS

### 3.1 Statistiques actuelles

```
Backend (print):        177 logs
Frontend (console.log): 50 logs
Total:                  227 logs
```

### 3.2 Couverture par fichier

| Fichier | Nombre de logs | Status |
|-----------|---------------|--------|
| app/routes/auth.py | 22 | ✅ |
| app/routes/contacts.py | 24 | ✅ |
| app/routes/cron.py | 12 | ✅ |
| app/routes/events.py | 13 | ✅ |
| app/routes/impayes.py | 23 | ✅ |
| app/routes/pages.py | 7 | ✅ |
| app/routes/relances.py | 22 | ✅ |
| app/routes/workflow.py | 8 | ✅ |
| app/services/workflow_caller.py | 8 | ✅ |
| app/cron/jobs.py | 14 | ✅ |
| app/cron/scheduler.py | 24 | ✅ |
| app/static/pages/dashboard/store/store.js | 33 | ✅ |
| app/static/pages/login/store/store.js | 19 | ✅ |

---

## PARTIE 4: PLAN DE REFONTE DES LOGS

### 4.1 Objectifs

1. **Uniformité**: Tous les logs suivent le même format
2. **Exhaustivité**: Chaque étape significative est loguée
3. **Traçabilité**: Possibilité de suivre un flux complet
4. **Performance**: Logs informatifs mais pas verbeux inutilement

### 4.2 Format standardisé proposé

**Backend Python:**
```python
# Entrée de fonction
logger.info(f"[MODULE.FONCTION] Début - param1={val1}, param2={val2}")

# Étapes intermédiaires
logger.debug(f"[MODULE.FONCTION] Étape: description - données={data}")

# Succès
logger.info(f"[MODULE.FONCTION] ✅ Succès - résultat={result}")

# Erreur
logger.error(f"[MODULE.FONCTION] ❌ Erreur - {error}")
```

**Frontend JavaScript:**
```javascript
// Entrée de fonction
console.log('[STORE.méthode] Début - param=', param);

// Étapes intermédiaires
console.log('[STORE.méthode] Étape: description');

// Succès
console.log('[STORE.méthode] ✅ Succès - résultat=', result);

// Erreur
console.error('[STORE.méthode] ❌ Erreur -', error);
```

---

## PARTIE 5: CHECKLIST DES FICHIERS À TRAITER

### Frontend
- [ ] `app/static/pages/dashboard/store/store.js`
- [ ] `app/static/pages/login/store/store.js`

### Backend Routes
- [ ] `app/routes/auth.py`
- [ ] `app/routes/contacts.py`
- [ ] `app/routes/impayes.py`
- [ ] `app/routes/relances.py`
- [ ] `app/routes/events.py`
- [ ] `app/routes/cron.py`
- [ ] `app/routes/workflow.py`
- [ ] `app/routes/pages.py`

### Backend Services
- [ ] `app/services/workflow_caller.py`
- [ ] `app/cron/scheduler.py`
- [ ] `app/cron/jobs.py`

---

*Document généré pour audit exhaustif des workflows*
