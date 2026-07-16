/**
 * Workflow: dashboard-refresh-stats
 * Responsabilité : rafraîchir uniquement les statistiques du dashboard
 * (appel API /api/dashboard/stats + recalcul du graphique Chart.js).
 *
 * Convention : exporte ses méthodes sur
 *   window.MarkiWorkflows['refresh-stats'] = { refreshStats }
 */
(function () {
  window.MarkiWorkflows = window.MarkiWorkflows || {};
  window.MarkiWorkflows['refresh-stats'] = {

    /**
     * Rafraîchit uniquement les stats (workflow: dashboard-refresh-stats)
     */
    async refreshStats(store) {
      const t0 = performance.now();
      console.log('[WORKFLOW.dashboard-refresh-stats] START: Rafraîchissement des stats dashboard demandé');
      console.log('[WORKFLOW.dashboard-refresh-stats] STEP: this.loading = true');
      store.loading = true;

      try {
        console.log('[WORKFLOW.dashboard-refresh-stats] API_CALL: Début appel GET /api/dashboard/stats');
        const res = await store.fetchApi('/api/dashboard/stats');
        console.log('[WORKFLOW.dashboard-refresh-stats] DATA: Stats récupérées', {
          facturesEnAttente: res.facturesEnAttente,
          impayesActifs: res.impayesActifs,
          montantTotal: res.montantTotal,
          anciennete: res.anciennete,
        });
        // Fusionne avec l'objet kpis existant pour préserver les autres champs
        store.kpis = {
          ...store.kpis,
          ...res,
          anciennete: { ...store.kpis.anciennete, ...(res.anciennete || {}) },
        };
        console.log('[WORKFLOW.dashboard-refresh-stats] STEP: KPIs recalculés', store.kpis);
        console.log('[WORKFLOW.dashboard-refresh-stats] STEP: Graphiques mis à jour avec nouvelles données');
        store.calculateChartData();
        store.$nextTick(() => {
          if (store.chart) {
            store.chart.data = store.chart.data;
            store.chart.update();
          } else {
            store.initChart();
          }
        });
        const duree = Math.round(performance.now() - t0);
        console.log('[WORKFLOW.dashboard-refresh-stats] SUCCESS: Stats rafraîchies en', duree, 'ms');
      } catch (err) {
        console.error('[WORKFLOW.dashboard-refresh-stats] ERROR:', err);
        store.error = err.message || 'Erreur rafraîchissement stats';
      } finally {
        store.loading = false;
        console.log('[WORKFLOW.dashboard-refresh-stats] STEP: this.loading = false');
      }
    },
  };
})();
