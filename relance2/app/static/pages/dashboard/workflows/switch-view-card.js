/**
 * Workflow: dashboard-switch-view-card
 * Responsabilité : basculer la section "Top débiteurs" en mode carte
 * (met à jour topDebtorsView, propage viewMode vers le x-data imbriqué,
 * persiste la préférence en localStorage).
 *
 * Convention : exporte ses méthodes sur
 *   window.MarkiWorkflows['switch-view-card'] = { switchViewCard }
 */
(function () {
  window.MarkiWorkflows = window.MarkiWorkflows || {};
  window.MarkiWorkflows['switch-view-card'] = {

    /**
     * Bascule en vue carte (workflow: dashboard-switch-view-card)
     */
    switchViewCard(store) {
      const t0 = performance.now();
      try {
        console.log('[WORKFLOW.dashboard-switch-view-card] START: Bascule en mode carte demandée');
        store.topDebtorsView = 'card';
        // Synchronise aussi le viewMode local utilisé par l'HTML (nested x-data="{ viewMode: 'list' }")
        store._propagateViewMode('card');
        console.log('[WORKFLOW.dashboard-switch-view-card] STEP: viewMode = card, currentView mis à jour, activeTab synchronisé');
        try {
          localStorage.setItem('dashboard_view', 'card');
          console.log('[WORKFLOW.dashboard-switch-view-card] STEP: Préférence dashboard_view persistée en localStorage');
        } catch (_) { /* localStorage indisponible */ }
        console.log('[WORKFLOW.dashboard-switch-view-card] STEP: Vue cartes re-rendue par Alpine.js (x-show/x-if)');
        const duree = Math.round(performance.now() - t0);
        console.log('[WORKFLOW.dashboard-switch-view-card] SUCCESS: Bascule en vue carte terminée en', duree, 'ms');
      } catch (err) {
        console.error('[WORKFLOW.dashboard-switch-view-card] ERROR:', err);
      }
    },
  };
})();
