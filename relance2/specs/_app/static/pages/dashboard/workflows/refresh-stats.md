# dashboard/workflows/refresh-stats.js

Rafraîchit les statistiques sur bouton.

```javascript
async refreshStats() {
  this.loading = true;
  await this.loadStats();
  this.loading = false;
}
```

## Logs (console.log) - OBLIGATOIRE

Chaque étape du workflow doit être loguée avec `console.log()`:

| Checkpoint | Instruction console.log |
|------------|------------------------|
| `start` | `console.log('[WORKFLOW.dashboard-refresh-stats] START: Rafraîchissement des stats dashboard demandé')` |
| `loading-set` | `console.log('[WORKFLOW.dashboard-refresh-stats] STEP: this.loading = true')` |
| `api-call-start` | `console.log('[WORKFLOW.dashboard-refresh-stats] API_CALL: Début appel loadStats()')` |
| `data-fetched` | `console.log('[WORKFLOW.dashboard-refresh-stats] DATA: Stats récupérées', {contacts, kpis, lastUpdated})` |
| `kpis-recalculated` | `console.log('[WORKFLOW.dashboard-refresh-stats] STEP: KPIs recalculés', kpis)` |
| `chart-updated` | `console.log('[WORKFLOW.dashboard-refresh-stats] STEP: Graphiques mis à jour avec nouvelles données')` |
| `loading-cleared` | `console.log('[WORKFLOW.dashboard-refresh-stats] STEP: this.loading = false')` |
| `end` | `console.log('[WORKFLOW.dashboard-refresh-stats] SUCCESS: Stats rafraîchies en', duree, 'ms')` |
| `error` | `console.error('[WORKFLOW.dashboard-refresh-stats] ERROR:', error)` |
