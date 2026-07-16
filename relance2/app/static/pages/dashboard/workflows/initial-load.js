/**
 * Workflow: dashboard-initial-load
 * Responsabilité : initialisation du store (auth check) + chargement initial
 * de toutes les données du dashboard (impayés, relances, events, last-sync,
 * top-debtors, KPIs, graphique, Smart Marki).
 *
 * Convention : ce fichier exporte ses méthodes sur
 *   window.MarkiWorkflows['initial-load'] = { init, loadData }
 * Chaque méthode reçoit le store Alpine en paramètre (this côté store).
 */
(function () {
  window.MarkiWorkflows = window.MarkiWorkflows || {};
  window.MarkiWorkflows['initial-load'] = {

    /**
     * Initialisation (workflow: dashboard-initial-load)
     * Vérifie l'auth puis charge les données.
     */
    async init(store) {
      const t0 = performance.now();
      console.log('[WORKFLOW.dashboard-initial-load] START: Affichage spinner chargement');
      store.loading = true;
      store.error = null;

      const token = localStorage.getItem('token');
      if (!token) {
        console.log('[WORKFLOW.dashboard-initial-load] ERROR: Aucun token, redirection /login');
        window.location.href = '/login';
        return;
      }
      console.log('[WORKFLOW.dashboard-initial-load] STEP: Token auth vérifié');

      try {
        await this.loadData(store);
        const duree = Math.round(performance.now() - t0);
        console.log('[WORKFLOW.dashboard-initial-load] END: Dashboard chargé en', duree, 'ms');
      } catch (err) {
        console.error('[WORKFLOW.dashboard-initial-load] ERROR:', err);
        store.error = err.message || 'Erreur lors du chargement initial';
      } finally {
        store.loading = false;
      }
    },

    /**
     * Charge toutes les données des API (workflow: dashboard-initial-load)
     */
    async loadData(store) {
      console.log('[WORKFLOW.dashboard-initial-load] STEP: Appel API GET /api/impayes?facture_soldee=0&statut=impaye');
      const impayesRes = await store.fetchApi('/api/impayes?per_page=1000&facture_soldee=0&statut=impaye');
      store.impayes = impayesRes.impayes || [];
      console.log('[WORKFLOW.dashboard-initial-load] DATA: Impayés reçus:', { count: store.impayes.length });

      console.log('[WORKFLOW.dashboard-initial-load] STEP: Appel API GET /api/relances');
      const relancesRes = await store.fetchApi('/api/relances');
      store.relances = relancesRes.relances || [];
      console.log('[WORKFLOW.dashboard-initial-load] DATA: Relances reçues:', { count: store.relances.length });

      console.log('[WORKFLOW.dashboard-initial-load] STEP: Appel API GET /api/events?limit=10');
      const eventsRes = await store.fetchApi('/api/dashboard/events?limit=10');
      store.events = eventsRes.events || [];
      store.unreadCount = store.events.filter(e => !e.read).length;
      console.log('[WORKFLOW.dashboard-initial-load] DATA: Events reçus:', { count: store.events.length });

      console.log('[WORKFLOW.dashboard-initial-load] STEP: Appel API GET /api/dashboard/last-sync');
      try {
        const lastSyncRes = await store.fetchApi('/api/dashboard/last-sync');
        if (lastSyncRes && lastSyncRes.lastSyncTime) {
          store.lastSyncTime = store.formatLastSync(lastSyncRes.lastSyncTime);
        }
      } catch (e) {
        console.warn('[WORKFLOW.dashboard-initial-load] WARN: last-sync indisponible, valeur par défaut conservée');
      }
      console.log('[WORKFLOW.dashboard-initial-load] DATA: Dernière synchro:', store.lastSyncTime);

      console.log('[WORKFLOW.dashboard-initial-load] STEP: Appel API GET /api/dashboard/top-debtors');
      try {
        const topRes = await store.fetchApi('/api/dashboard/top-debtors?limit=10');
        store.topDebtors = (topRes.topDebtors || []).map(d => ({
          ...d,
          initials: store.getInitials(d.name || 'Inconnu'),
        }));
        console.log('[WORKFLOW.dashboard-initial-load] DATA: Top débiteurs reçus:', { count: store.topDebtors.length });
      } catch (e) {
        console.warn('[WORKFLOW.dashboard-initial-load] WARN: top-debtors indisponible, fallback calcul local');
        store.calculateTopDebtors();
      }

      console.log('[WORKFLOW.dashboard-initial-load] STEP: Appel API GET /api/impayes (nouvelles factures)');
      store.newInvoices = store.impayes
        .filter(i => i.facture_soldee === 0)
        .slice(0, 5)
        .map(i => ({
          id: i.id,
          nfacture: i.nfacture,
          montant: i.reste_a_payer || i.solde_du || 0,
          date: i.date_facture,
        }));
      console.log('[WORKFLOW.dashboard-initial-load] DATA: Nouvelles factures reçues:', { count: store.newInvoices.length });

      // Calculs côté frontend
      console.log('[WORKFLOW.dashboard-initial-load] STEP: Début calcul KPIs');
      store.calculateStats();
      store.kpis = { ...store.kpis }; // force reactivity
      console.log('[WORKFLOW.dashboard-initial-load] SUCCESS: KPIs calculés:', store.kpis);

      console.log('[WORKFLOW.dashboard-initial-load] STEP: Calcul données graphique');
      store.calculateChartData();
      console.log('[WORKFLOW.dashboard-initial-load] DATA: Données graphique calculées:', store.chartData);

      console.log('[WORKFLOW.dashboard-initial-load] STEP: Calcul top débiteurs');
      // Si pas encore alimentés via l'API, fallback au calcul local
      if (store.topDebtors.length === 0) {
        store.calculateTopDebtors();
      }
      console.log('[WORKFLOW.dashboard-initial-load] DATA: Top débiteurs calculé:', { count: store.topDebtors.length });

      console.log('[WORKFLOW.dashboard-initial-load] STEP: Initialisation Chart.js');
      store.$nextTick(() => {
        store.initChart();
        console.log('[WORKFLOW.dashboard-initial-load] SUCCESS: Graphique rendu');
      });

      store.generateSmartMarkiConseils();
    },
  };
})();
