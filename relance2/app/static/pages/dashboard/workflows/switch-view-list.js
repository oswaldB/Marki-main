/**
 * Workflow: dashboard-switch-view-list
 * Responsabilité : basculer la section "Top débiteurs" en mode liste
 * (met à jour topDebtorsView, propage viewMode vers le x-data imbriqué,
 * persiste la préférence en localStorage).
 *
 * Convention : exporte ses méthodes sur
 *   window.MarkiWorkflows['switch-view-list'] = { switchViewList }
 */
(function () {
  window.MarkiWorkflows = window.MarkiWorkflows || {};
  window.MarkiWorkflows['switch-view-list'] = {

    /**
     * Bascule en vue liste (workflow: dashboard-switch-view-list)
     */
    switchViewList(store) {
      const t0 = performance.now();
      try {
        console.log('[WORKFLOW.dashboard-switch-view-list] START: Bascule en vue liste');
        store.topDebtorsView = 'list';
        store._propagateViewMode('list');
        console.log('[WORKFLOW.dashboard-switch-view-list] STEP: viewMode = "list"');
        try {
          localStorage.setItem('dashboard_view', 'list');
          console.log('[WORKFLOW.dashboard-switch-view-list] STEP: Préférence persistée en localStorage (dashboard_view = list)');
        } catch (_) { /* localStorage indisponible */ }
        console.log('[WORKFLOW.dashboard-switch-view-list] STEP: DOM ré-affiché en mode liste');
        const duree = Math.round(performance.now() - t0);
        console.log('[WORKFLOW.dashboard-switch-view-list] SUCCESS: Vue liste activée en', duree, 'ms');
      } catch (err) {
        console.error('[WORKFLOW.dashboard-switch-view-list] ERROR:', err);
      }
    },
  };
})();
