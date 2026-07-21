# Scheduler Flask - Synchronisation Automatique

## Fonctionnement

Le scheduler est intégré directement dans l'application Flask via **Flask-APScheduler**. Pas besoin de cron ou de commandes externes.

## Tâches planifiées

| Tâche | Fréquence | Heure | Fonction |
|-------|-----------|-------|----------|
| `sync_invoices_daily` | Quotidien | 00:00:00 | `sync_invoices_job()` |

## Démarrage automatique

Le scheduler démarre automatiquement avec l'application Flask. Aucune configuration supplémentaire requise.

```python
# Dans app.py - démarrage auto
from scheduler import init_scheduler
init_scheduler(app)
```

## Logs

Les exécutions sont loguées dans la console Flask :

```
[SCHEDULER] Scheduler démarré - synchro planifiée à 00h00 quotidien
[SCHEDULER] [2024-07-17T00:00:00] Démarrage synchro auto
[SCHEDULER] ✓ Succès: 1547 pièces, 234 créés, 1313 maj
```

## Synchronisation manuelle

Via le bouton dans le dashboard ou l'API :

```bash
POST /api/sync/invoices
Authorization: Bearer <token>
```

## Configuration

Le scheduler est configuré dans `app/scheduler.py` :

- **Max workers**: 1 (évite les exécutions simultanées)
- **Coalesce**: True (regroupe les exécutions manquées)
- **Misfire grace time**: 3600s (1h de tolérance si le serveur était down)

## Pas de CRON nécessaire

Tout est géré par Flask. Plus besoin de `crontab` ou de scripts bash.
