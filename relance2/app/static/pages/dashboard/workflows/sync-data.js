/**
 * Workflow: dashboard-sync-data
 * Responsabilité : déclencher la synchronisation des données (bouton header)
 * avec progression visuelle 0/25/50/75/100, mettre à jour lastSyncTime
 * et l'event de sync, puis recharger les données via le workflow
 * dashboard-initial-load.
 *
 * Convention : exporte ses méthodes sur
 *   window.MarkiWorkflows['sync-data'] = { syncData }
 */
(function () {
  window.MarkiWorkflows = window.MarkiWorkflows || {};

  // Référence paresseuse vers le workflow initial-load (évite les
  // problèmes d'ordre de chargement des scripts).
  function getInitialLoad() {
    return (window.MarkiWorkflows || {})['initial-load'];
  }

  window.MarkiWorkflows['sync-data'] = {

    /**
     * Synchronise les données (workflow: dashboard-sync-data)
     */
    async syncData(store) {
      const t0 = performance.now();
      console.log('[WORKFLOW.dashboard-sync-data] START: Clic bouton synchronisation');

      if (store.syncing) {
        console.log('[WORKFLOW.dashboard-sync-data] STATE: Déjà en cours, clic ignoré');
        return;
      }

      store.syncing = true;
      store.syncProgress = 0;
      store.error = null;
      console.log('[WORKFLOW.dashboard-sync-data] STATE: Bouton désactivé, syncing=true, progress=0');

      try {
        // Étape 1: import-invoices (simulée par progression visuelle)
        store.syncProgress = 25;
        console.log('[WORKFLOW.dashboard-sync-data] STEP: Appel API POST /api/dashboard/sync (étape import-invoices)');
        // Petite pause pour rendre l'UX lisible
        await new Promise(r => setTimeout(r, 200));

        // Étape 2: verify-paid-invoices
        store.syncProgress = 50;
        console.log('[WORKFLOW.dashboard-sync-data] STEP: Appel API POST /api/dashboard/sync (étape verify-paid-invoices)');
        await new Promise(r => setTimeout(r, 200));

        // Étape 3: regels-attribution
        store.syncProgress = 75;
        console.log('[WORKFLOW.dashboard-sync-data] STEP: Appel API POST /api/dashboard/sync (étape regels-attribution)');
        await new Promise(r => setTimeout(r, 200));

        // Étape 4: création de l'event sync
        console.log('[WORKFLOW.dashboard-sync-data] STEP: Appel API POST /api/dashboard/sync');
        const response = await store.fetchApi('/api/dashboard/sync', { method: 'POST' });
        store.syncProgress = 100;
        console.log('[WORKFLOW.dashboard-sync-data] DATA: Réponse orchestrateur reçue:', { syncedAt: response.syncedAt });

        if (response && response.syncedAt) {
          store.lastSyncTime = store.formatLastSync(response.syncedAt);
        }
        if (response && response.event) {
          console.log('[WORKFLOW.dashboard-sync-data] DATA: Event sync créé:', response.event);
          store.events.unshift(response.event);
        }
        console.log('[WORKFLOW.dashboard-sync-data] SUCCESS: lastSyncTime et syncStatus mis à jour');

        console.log('[WORKFLOW.dashboard-sync-data] STEP: Rechargement données dashboard (loadData)');
        const initialLoad = getInitialLoad();
        if (initialLoad && typeof initialLoad.loadData === 'function') {
          await initialLoad.loadData(store);
        } else {
          // Fallback : appelle loadData() du store (orchestrateur)
          await store.loadData();
        }

        const duree = Math.round(performance.now() - t0);
        console.log('[WORKFLOW.dashboard-sync-data] END: Synchronisation terminée en', duree, 'ms');
      } catch (err) {
        console.error('[WORKFLOW.dashboard-sync-data] ERROR:', err.message || err);
        store.error = err.message || 'Erreur lors de la synchronisation';
      } finally {
        store.syncing = false;
        setTimeout(() => { store.syncProgress = 0; }, 500);
        console.log('[WORKFLOW.dashboard-sync-data] STATE: syncing=false, progress=0');
      }
    },
  };
})();
