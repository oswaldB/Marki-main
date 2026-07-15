# Système de Cron - Documentation

## Architecture

Le système de cron est basé sur **APScheduler** et s'exécute dans le même process que Flask.

```
┌─────────────────────────────────────────────────────────────┐
│                      Flask App                              │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │   Routes     │  │  Scheduler   │  │   Workflows    │  │
│  │  /api/cron/* │◄─┤  (Thread)   ├─►│ (Business Logic)│  │
│  └──────────────┘  └──────┬───────┘  └────────────────┘  │
│                           │                                 │
│                    ┌──────▼───────┐                       │
│                    │   Job Store  │                       │
│                    │   (Memory)   │                       │
│                    └───────────────┘                       │
└─────────────────────────────────────────────────────────────┘
```

## Fichiers

| Fichier | Description |
|---------|-------------|
| `cron/config.py` | Configuration des jobs (schedules, fréquences) |
| `cron/scheduler.py` | Initialisation et gestion du scheduler |
| `cron/jobs.py` | Fonctions de job exécutables |
| `routes/cron.py` | API REST pour déclenchement manuel |
| `routes/workflow.py` | Réception des appels de workflow |
| `workflows/*.py` | Logique métier des workflows |

## Jobs configurés

### Par défaut (dans `cron/config.py`)

| ID | Workflow | Schedule | Description |
|----|----------|----------|-------------|
| `generate-relances-daily` | `generate-relances` | 8h00 quotidien | Génère les relances du jour |
| `cleanup-old-logs` | `cleanup-logs` | Dimanche 3h00 | Nettoie les vieux logs |
| `check-sequences-expired` | `check-expired` | Toutes les heures | Vérifie les expirations |

## API REST

### Voir le statut
```bash
GET /api/cron/status
```

### Lister les jobs
```bash
GET /api/cron/jobs
```

### Déclencher un job manuellement
```bash
POST /api/cron/trigger/generate-relances-daily
Content-Type: application/json

{"run_now": true}
```

### Déclencher un workflow directement
```bash
POST /api/cron/workflows
Content-Type: application/json

{
  "workflow_id": "generate-relances",
  "payload": {"auto_validate": false}
}
```

## Configuration

### Variables d'environnement

| Variable | Description | Défaut |
|----------|-------------|--------|
| `CRON_API_TOKEN` | Token pour auth cron | `cron-secret-token` |
| `APP_URL` | URL de l'app pour appels internes | `http://localhost:5000` |

### Activer/Désactiver un job

Dans `cron/config.py`:

```python
{
    'id': 'mon-job',
    'workflow_id': 'mon-workflow',
    'trigger': 'cron',
    'hour': 9,
    'minute': 0,
    'enabled': True,  # ← Mettre à False pour désactiver
}
```

## Ajouter un nouveau workflow cron

### 1. Créer le fichier workflow

`workflows/mon_workflow.py`:

```python
def execute(**kwargs) -> dict:
    """Mon workflow."""
    # Logique métier ici
    return {'success': True, 'data': {...}}
```

### 2. Ajouter la route (optionnel)

`routes/workflow.py`:

```python
@bp.route('/mon-workflow', methods=['POST'])
@require_cron_token
def mon_workflow():
    from workflows.mon_workflow import execute
    result = execute(**request.get_json())
    return jsonify(result)
```

### 3. Configurer le job

`cron/config.py`:

```python
{
    'id': 'mon-workflow-daily',
    'name': 'Mon Workflow Quotidien',
    'workflow_id': 'mon-workflow',
    'trigger': 'cron',
    'hour': 10,
    'minute': 0,
    'payload': {},
    'enabled': True
}
```

### 4. Ajouter la fonction job (si nécessaire)

`cron/jobs.py`:

```python
def mon_workflow_job():
    return execute_workflow_job(
        job_id='mon-workflow-daily',
        workflow_id='mon-workflow',
        payload={'source': 'cron'}
    )
```

## Checkpoints

Les workflows doivent émettre des checkpoints pour le monitoring:

```python
print("[CHECKPOINT] relances-generation-started")
print("[CHECKPOINT] relances-generated { count: 15 }")
print("[CHECKPOINT] relances-generation-failed { error: '...' }")
```

## Démarrage manuel (sans Docker)

```bash
cd /home/ubuntu/marki/relance2/app
source venv/bin/activate
pip install -r requirements.txt
python app.py
```

Le scheduler démarre automatiquement avec l'app Flask.
