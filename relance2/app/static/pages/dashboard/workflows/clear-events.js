/**
 * Workflow: dashboard-clear-events
 * Responsabilité : effacer les événements affichés (bouton "Effacer tout")
 * via POST /api/dashboard/clear-events, puis marquer tous les events
 * locaux comme lus et remettre unreadCount à 0.
 *
 * Convention : exporte ses méthodes sur
 *   window.MarkiWorkflows['clear-events'] = { clearEvents }
 */
(function () {
  window.MarkiWorkflows = window.MarkiWorkflows || {};
  window.MarkiWorkflows['clear-events'] = {

    /**
     * Efface les événements affichés (workflow: dashboard-clear-events)
     */
    async clearEvents(store) {
      const t0 = performance.now();
      const count = store.events.length;
      console.log('[WORKFLOW.dashboard-clear-events] START: Effacement des événements non lus');
      try {
        console.log('[WORKFLOW.dashboard-clear-events] STEP: Appel API POST /api/dashboard/clear-events');
        const res = await store.fetchApi('/api/dashboard/clear-events', { method: 'POST' });
        // Mise à jour locale : tous les events deviennent lus
        store.events = store.events.map(event => ({ ...event, read: true }));
        store.unreadCount = 0;
        console.log('[WORKFLOW.dashboard-clear-events] STEP: events marqués read=true, unreadCount=0');
        const duree = Math.round(performance.now() - t0);
        console.log(`[WORKFLOW.dashboard-clear-events] SUCCESS: ${count} événements effacés (${res.cleared} côté serveur) en`, duree, 'ms');
      } catch (err) {
        console.error('[WORKFLOW.dashboard-clear-events] ERROR:', err);
        store.error = err.message || 'Erreur lors du clear events';
      }
    },
  };
})();
