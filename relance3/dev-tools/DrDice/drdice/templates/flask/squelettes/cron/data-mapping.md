# Data Mapping - {cell_name}

## ⏰ Job Cron

Ce type de cell (`cron`) implémente une tâche périodique sans interface HTTP.

### Configuration du job

| Paramètre | Valeur | Description |
|-----------|--------|-------------|
| `id` | `{cell_name}_job` | Identifiant unique du job |
| `trigger` | `interval` | Type de déclenchement |
| `interval` | `60` minutes | Fréquence d'exécution |
| `function` | `execute()` | Fonction principale dans `cron.py` |

---

## 🔄 Logique métier

| Étape | Description | Dépendances |
|-------|-------------|-------------|
| 1. Initialisation | Chargement de la config | `config.py` |
| 2. Traitement | Logique métier principale | Models, APIs externes |
| 3. Finalisation | Sauvegarde résultats | Database, Logs |

---

## 🗂️ Modèles de données

| Modèle | Fichier | Champs principaux | Utilisé par |
|--------|---------|-------------------|-------------|
| `{CellName}Run` | `models/{cell_name}_run.py` | `id`, `started_at`, `status`, `result` | Cron job |
| ... | ... | ... | ... |

---

## 🗃️ Schéma de la Base de Données

Documenter le schéma complet des tables utilisées par le job cron.

### Tables principales

| Table | Description | Usage |
|-------|-------------|-------|
| `{cell_name}_runs` | Historique des exécutions cron | Monitoring, Retry |
| `{cell_name}_logs` | Logs détaillés par exécution | Debug, Audit |
| ... | ... | ... |

### Schéma détaillé

#### Table `{cell_name}_runs`

| Champ | Type SQL | Contraintes | Description | Python Type |
|-------|----------|-------------|-------------|-------------|
| `id` | `INTEGER` | `PRIMARY KEY AUTOINCREMENT` | Identifiant unique | `int` |
| `run_id` | `VARCHAR(36)` | `NOT NULL UNIQUE` | UUID de l'exécution | `str` |
| `status` | `VARCHAR(50)` | `NOT NULL DEFAULT 'started'` | started, success, failed | `str` |
| `started_at` | `DATETIME` | `NOT NULL` | Date de début | `datetime` |
| `completed_at` | `DATETIME` | `NULL` | Date de fin | `datetime` |
| `duration_ms` | `INTEGER` | `NULL` | Durée en millisecondes | `int` |
| `records_processed` | `INTEGER` | `NULL DEFAULT 0` | Nombre de records traités | `int` |
| `records_failed` | `INTEGER` | `NULL DEFAULT 0` | Nombre de records en échec | `int` |
| `result_summary` | `JSON` | `NULL` | Résumé du résultat | `Dict` |
| `error_message` | `TEXT` | `NULL` | Message d'erreur si échec | `str` |

#### Table `{cell_name}_logs`

| Champ | Type SQL | Contraintes | Description | Python Type |
|-------|----------|-------------|-------------|-------------|
| `id` | `INTEGER` | `PRIMARY KEY AUTOINCREMENT` | Identifiant unique | `int` |
| `run_id` | `VARCHAR(36)` | `NOT NULL FOREIGN KEY` | Référence vers run | `str` |
| `log_level` | `VARCHAR(20)` | `NOT NULL` | DEBUG, INFO, ERROR | `str` |
| `event` | `VARCHAR(100)` | `NOT NULL` | Code événement | `str` |
| `message` | `TEXT` | `NULL` | Message détaillé | `str` |
| `data` | `JSON` | `NULL` | Données contextuelles | `Dict` |
| `created_at` | `DATETIME` | `NOT NULL` | Timestamp | `datetime` |

### Relations entre tables

```
┌─────────────────────┐         ┌─────────────────────┐
│  {cell_name}_runs   │◄───────►│   {cell_name}_logs  │
├─────────────────────┤   1:N   ├─────────────────────┤
│ id (PK)             │         │ id (PK)             │
│ run_id (UUID)       │────────►│ run_id (FK)         │
│ status              │         │ log_level           │
│ started_at          │         │ event               │
│ completed_at        │         │ message             │
│ duration_ms         │         │ data                │
│ records_processed   │         │ created_at          │
│ records_failed      │         └─────────────────────┘
│ result_summary      │
│ error_message       │
└─────────────────────┘
```

### Flux de données Cron

```
┌─────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  APScheduler │────►│   execute()     │────►│  {cell_name}_  │
│  (déclenche) │     │   (cron.py)     │     │   _runs         │
└─────────────┘     └─────────────────┘     ├─────────────────┤
                                            │ status: started │
                                            │ started_at: now │
                                            └────────┬────────┘
                                                     │
                            ┌────────────────────────┘
                            ▼
                     ┌─────────────────┐     ┌─────────────────┐
                     │  Logique métier │────►│ {cell_name}_    │
                     │  (process)      │     │ _logs           │
                     └─────────────────┘     │ (events/steps)  │
                            │                └─────────────────┘
                            ▼
                     ┌─────────────────┐
                     │   DB / API      │
                     │   (outputs)     │
                     └─────────────────┘
```

### Indexes recommandés

```sql
-- Pour les recherches par status et date
CREATE INDEX idx_{cell_name}_runs_status ON {cell_name}_runs(status);
CREATE INDEX idx_{cell_name}_runs_started ON {cell_name}_runs(started_at);

-- Pour les jointures run_id
CREATE INDEX idx_{cell_name}_logs_run_id ON {cell_name}_logs(run_id);
CREATE INDEX idx_{cell_name}_logs_level ON {cell_name}_logs(log_level);
```

---

## 🔗 Mapping cron_job.py ↔️ Workflow Backend

Le cron job peut appeler un workflow backend existant ou avoir sa propre logique. Documenter le lien entre `cron.py` et le workflow.

### Si cron.py appelle un workflow backend existant

| Élément | Source | Destination | Description |
|---------|--------|-------------|-------------|
| Appel | `cron.execute()` | `wf_backend.execute()` | Le cron délègue au workflow |
| Paramètres | `context` | `**kwargs` | Contexte transmis au workflow |
| Résultat | `WorkflowResult` | `run.result_summary` | Stockage du résultat |
| Logs | `WorkflowLogger` | `{cell_name}_logs` | Logs agrégés |

```python
# Exemple: cron.py appelant un workflow backend
from app.backend_wf.{workflow_name} import execute as wf_execute

def execute():
    # ... setup context ...
    result = wf_execute(
        workflow_id=run_id,
        user_id="system",
        **config
    )
    # ... log result ...
```

### Si cron.py contient sa propre logique (sans workflow backend)

| Élément | Fichier | Méthode | Description |
|---------|---------|---------|-------------|
| Entry point | `cron.py` | `execute()` | Point d'entrée APScheduler |
| Logging | `cron.py` | `_log_event()` | Logs internes du cron |
| DB Access | `models/{cell_name}_run.py` | `save()` | Persistance des runs |
| Validation | `cron.py` | `_validate_input()` | Validation des entrées |

### Table de correspondance des données

| Donnée cron.py | Type Python | Workflow Backend | Champ DB | Description |
|----------------|-------------|------------------|----------|-------------|
| `run_id` | `str` | `context.workflow_id` | `runs.run_id` | UUID de l'exécution |
| `start_time` | `datetime` | `context.started_at` | `runs.started_at` | Début du traitement |
| `config` | `Dict` | `kwargs['config']` | `runs.input_data` | Configuration du job |
| `results` | `Dict` | `result.data` | `runs.result_summary` | Résultats |
| `error` | `Exception` | `result.error` | `runs.error_message` | Erreur si échec |

### Flux d'appel

```
┌─────────────────┐
│   APScheduler   │
│   (déclenche)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────────┐
│   cron.py       │────►│  {cell_name}_runs  │
│   execute()     │     │  INSERT started     │
└────────┬────────┘     └─────────────────────┘
         │
         ├──► Soit: Workflow Backend ──┐
         │                            ▼
         │                   ┌─────────────────┐
         │                   │  wf_backend.py  │
         │                   │   execute()     │
         │                   └────────┬────────┘
         │                            │
         │                            ▼
         │                   ┌─────────────────┐
         │                   │  Logique métier │
         │                   │   + DB / API    │
         │                   └────────┬────────┘
         │                            │
         └──► Soit: Logique directe ◄─┘
              (dans cron.py)
                   │
                   ▼
         ┌─────────────────┐
         │  {cell_name}_   │
         │   _runs         │
         │  UPDATE result  │
         └─────────────────┘
```

---

## 📊 Monitoring

| Métrique | Source | Action si échec |
|----------|--------|-----------------|
| Durée d'exécution | Logs | Alerte si > threshold |
| Erreurs | Logs | Retry + notification |
| Résultats | DB | Archivage |

---

## 🔗 Dépendances externes

| Service | Type | Usage |
|---------|------|-------|
| Database | SQLite | Stockage résultats |
| APScheduler | Lib | Orchestration cron |
| ... | ... | ... |

---

## ✅ Checklist de validation

- [ ] La spec du workflow existe dans `specs/wf-backend/*.md`
- [ ] Les modèles nécessaires sont dans `specs/models/`
- [ ] **Le schéma de la base de données est documenté (tables, champs, types)**
- [ ] **Les tables d'historisation et de logs sont définies**
- [ ] **Les indexes sont créés pour les requêtes de monitoring**
- [ ] **Le lien entre cron_job.py et le workflow backend est documenté**
- [ ] La configuration du job est documentée
- [ ] Les mécanismes de retry/alerte sont définis
- [ ] Les logs sont configurés (WORKFLOW_START, etc.)

---

*Généré automatiquement par DrDice dev2*
*Date: {date}*
