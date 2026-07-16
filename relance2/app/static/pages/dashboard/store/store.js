/**
 * Store Alpine.js pour le Dashboard — ORCHESTRATEUR MINIMAL
 *
 * Ce fichier est l'orchestrateur du dashboard :
 *   - il déclare l'état (data properties) consommé par index.html ;
 *   - il déclare les helpers partagés (formatMoney, formatLastSync,
 *     getInitials, fetchApi, _propagateViewMode, calculateStats,
 *     calculateTopDebtors, calculateChartData, generateSmartMarkiConseils,
 *     initChart, setDemoData) ;
 *   - il délègue les 6 workflows (init/load, refresh stats, sync,
 *     clear events, switch view) à des fichiers séparés dans
 *     `/static/pages/dashboard/workflows/`, enregistrés sur
 *     `window.MarkiWorkflows[<workflow-name>]`.
 *
 * Préfixes de logs (hérités du fichier original, NE PAS CHANGER) :
 *   - [WORKFLOW DASHBOARD]              : méthodes partagées
 *   - [WORKFLOW.dashboard-initial-load] : déléguées (cf. workflows/initial-load.js)
 *   - [WORKFLOW.dashboard-refresh-stats]: déléguées (cf. workflows/refresh-stats.js)
 *   - [WORKFLOW.dashboard-sync-data]    : déléguées (cf. workflows/sync-data.js)
 *   - [WORKFLOW.dashboard-clear-events] : déléguées (cf. workflows/clear-events.js)
 *   - [WORKFLOW.dashboard-switch-view-card]: déléguées (cf. workflows/switch-view-card.js)
 *   - [WORKFLOW.dashboard-switch-view-list]: déléguées (cf. workflows/switch-view-list.js)
 */
function dashboardStore() {
  return {
    // ============================
    // ÉTAT (consommé par index.html)
    // ============================

    // État UI
    loading: false,
    error: null,
    syncing: false,
    syncProgress: 0,
    lastSyncTime: 'Aujourd\'hui à 09:45',
    unreadCount: 0,

    // Données brutes (depuis les API)
    impayes: [],
    relances: [],
    contacts: [],
    events: [],
    newInvoices: [],

    // Top débiteurs + vue active
    topDebtors: [],
    topDebtorsView: 'list', // 'list' | 'card'

    // Données pour le graphique
    chart: null,
    chartData: {
      labels: [],
      montantsPayes: [],
      restesAPayer: [],
      facturesImpayees: []
    },

    // Smart Marki
    smartMarkiConseils: [],

    // KPIs calculés (côté frontend)
    kpis: {
      facturesEnAttente: 0,
      impayesActifs: 0,
      montantTotal: 0,
      relancesJour: 0,
      reponsesRecues: 0,
      tauxRecouvrement: 0,
      tauxEvolution: '',
      anciennete: {
        moins7j: 0, moins7jMontant: 0,
        j8a30: 0, j8a30Montant: 0,
        j31a60: 0, j31a60Montant: 0,
        j60a120: 0, j60a120Montant: 0,
        plus120j: 0, plus120jMontant: 0
      }
    },

    // ===========================================
    // DÉLÉGATIONS VERS LES 6 WORKFLOWS
    // Chaque méthode appelle le workflow correspondant
    // enregistré sur window.MarkiWorkflows.
    // ===========================================

    /**
     * Init du store (workflow: dashboard-initial-load).
     * Vérifie l'auth puis charge les données.
     */
    async init() {
      const wf = (window.MarkiWorkflows || {})['initial-load'];
      if (wf && typeof wf.init === 'function') {
        return wf.init(this);
      }
      console.error('[WORKFLOW DASHBOARD] init() - workflow "initial-load" introuvable');
    },

    /**
     * Charge toutes les données des API (workflow: dashboard-initial-load).
     * Appelée aussi depuis le bouton "Réessayer" de l'index.html.
     */
    async loadData() {
      const wf = (window.MarkiWorkflows || {})['initial-load'];
      if (wf && typeof wf.loadData === 'function') {
        return wf.loadData(this);
      }
      console.error('[WORKFLOW DASHBOARD] loadData() - workflow "initial-load" introuvable');
    },

    /**
     * Synchronise les données (workflow: dashboard-sync-data).
     */
    async syncData() {
      const wf = (window.MarkiWorkflows || {})['sync-data'];
      if (wf && typeof wf.syncData === 'function') {
        return wf.syncData(this);
      }
      console.error('[WORKFLOW DASHBOARD] syncData() - workflow "sync-data" introuvable');
    },

    /**
     * Rafraîchit uniquement les stats (workflow: dashboard-refresh-stats).
     */
    async refreshStats() {
      const wf = (window.MarkiWorkflows || {})['refresh-stats'];
      if (wf && typeof wf.refreshStats === 'function') {
        return wf.refreshStats(this);
      }
      console.error('[WORKFLOW DASHBOARD] refreshStats() - workflow "refresh-stats" introuvable');
    },

    /**
     * Efface les événements affichés (workflow: dashboard-clear-events).
     */
    async clearEvents() {
      const wf = (window.MarkiWorkflows || {})['clear-events'];
      if (wf && typeof wf.clearEvents === 'function') {
        return wf.clearEvents(this);
      }
      console.error('[WORKFLOW DASHBOARD] clearEvents() - workflow "clear-events" introuvable');
    },

    /**
     * Bascule en vue carte (workflow: dashboard-switch-view-card).
     */
    switchViewCard() {
      const wf = (window.MarkiWorkflows || {})['switch-view-card'];
      if (wf && typeof wf.switchViewCard === 'function') {
        return wf.switchViewCard(this);
      }
      console.error('[WORKFLOW DASHBOARD] switchViewCard() - workflow "switch-view-card" introuvable');
    },

    /**
     * Bascule en vue liste (workflow: dashboard-switch-view-list).
     */
    switchViewList() {
      const wf = (window.MarkiWorkflows || {})['switch-view-list'];
      if (wf && typeof wf.switchViewList === 'function') {
        return wf.switchViewList(this);
      }
      console.error('[WORKFLOW DASHBOARD] switchViewList() - workflow "switch-view-list" introuvable');
    },

    // ===========================================
    // HELPERS PARTAGÉS (utilisés par les workflows)
    // ===========================================

    /**
     * Appel API avec auth (supporte GET par défaut, ou POST/PUT/DELETE via options).
     */
    async fetchApi(url, options = {}) {
      const token = localStorage.getItem('token');
      const method = (options.method || 'GET').toUpperCase();
      console.log(`[WORKFLOW DASHBOARD] fetchApi() - Appel ${method} ${url}`);

      const fetchOptions = {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...(options.headers || {}),
        },
        ...(options.body ? { body: options.body } : {}),
      };

      const response = await fetch(url, fetchOptions);

      if (!response.ok) {
        console.error(`[WORKFLOW DASHBOARD] fetchApi() - Erreur HTTP ${response.status} sur ${url}`);
        if (response.status === 401) {
          localStorage.removeItem('token');
        }
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const data = await response.json();
      console.log(`[WORKFLOW DASHBOARD] fetchApi() - Succès ${method} ${url}`);
      return data;
    },

    /**
     * Calcule les statistiques depuis les données brutes
     */
    calculateStats() {
      console.log('[WORKFLOW DASHBOARD] calculateStats() - Calcul des statistiques');
      const now = new Date();

      // Réinitialiser
      this.kpis.anciennete = {
        moins7j: 0, moins7jMontant: 0,
        j8a30: 0, j8a30Montant: 0,
        j31a60: 0, j31a60Montant: 0,
        j60a120: 0, j60a120Montant: 0,
        plus120j: 0, plus120jMontant: 0
      };

      // Calculs depuis les impayés (utilise reste_a_payer comme montant)
      this.kpis.facturesEnAttente = this.impayes.length;
      this.kpis.impayesActifs = this.impayes.filter(i => i.statut === 'actif' || i.facture_soldee === 0).length;
      this.kpis.montantTotal = this.impayes.reduce((sum, i) => sum + (i.reste_a_payer || i.solde_du || 0), 0);

      // Ancienneté
      this.impayes.forEach(impaye => {
        const dateFacture = new Date(impaye.date_facture);
        const jours = Math.floor((now - dateFacture) / (1000 * 60 * 60 * 24));
        const montant = impaye.reste_a_payer || impaye.solde_du || 0;

        if (jours < 7) {
          this.kpis.anciennete.moins7j++;
          this.kpis.anciennete.moins7jMontant += montant;
        } else if (jours <= 30) {
          this.kpis.anciennete.j8a30++;
          this.kpis.anciennete.j8a30Montant += montant;
        } else if (jours <= 60) {
          this.kpis.anciennete.j31a60++;
          this.kpis.anciennete.j31a60Montant += montant;
        } else if (jours <= 120) {
          this.kpis.anciennete.j60a120++;
          this.kpis.anciennete.j60a120Montant += montant;
        } else {
          this.kpis.anciennete.plus120j++;
          this.kpis.anciennete.plus120jMontant += montant;
        }
      });

      // Relances du jour
      const today = now.toISOString().split('T')[0];
      this.kpis.relancesJour = this.relances.filter(r =>
        r.created_at && r.created_at.startsWith(today)
      ).length;

      // Taux recouvrement (exemple de calcul)
      const totalPaye = this.impayes.filter(i => i.statut === 'paye').reduce((s, i) => s + i.montant, 0);
      this.kpis.tauxRecouvrement = this.kpis.montantTotal > 0
        ? Math.round((totalPaye / this.kpis.montantTotal) * 100)
        : 0;
      this.kpis.tauxEvolution = '+5% vs mois dernier';
      this.kpis.reponsesRecues = 8; // TODO: calculer depuis événements

      console.log('[WORKFLOW DASHBOARD] calculateStats() - Statistiques calculées:', this.kpis);
    },

    /**
     * Calcule le top débiteurs
     */
    calculateTopDebtors() {
      console.log('[WORKFLOW DASHBOARD] calculateTopDebtors() - Calcul top débiteurs');
      // Grouper par contact
      const byContact = {};

      this.impayes.filter(i => i.facture_soldee === 0).forEach(impaye => {
        const contactId = impaye.contact_relance_id;
        const montant = impaye.reste_a_payer || impaye.solde_du || 0;

        if (!contactId || !montant) return;

        if (!byContact[contactId]) {
          byContact[contactId] = {
            id: contactId,
            name: impaye.contact_nom || impaye.payeur_nom || 'Inconnu',
            initials: this.getInitials(impaye.contact_nom || impaye.payeur_nom || 'Inconnu'),
            montant: 0,
            impayesCount: 0,
            jours: 0,
            relance: 'R1'
          };
        }
        byContact[contactId].montant += montant;
        byContact[contactId].impayesCount++;

        const jours = Math.floor((new Date() - new Date(impaye.date_facture)) / (1000 * 60 * 60 * 24));
        if (jours > byContact[contactId].jours) {
          byContact[contactId].jours = jours;
        }

        // Déterminer la relance en fonction de l'ancienneté
        if (jours > 60) byContact[contactId].relance = 'R3';
        else if (jours > 30) byContact[contactId].relance = 'R2';
      });

      // Trier par montant et prendre les 5 premiers
      this.topDebtors = Object.values(byContact)
        .sort((a, b) => b.montant - a.montant)
        .slice(0, 5);

      console.log(`[WORKFLOW DASHBOARD] calculateTopDebtors() - ${this.topDebtors.length} débiteurs trouvés`);
    },

    /**
     * Génère les données du graphique
     */
    calculateChartData() {
      console.log('[WORKFLOW DASHBOARD] calculateChartData() - Génération données graphique');
      const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc'];
      this.chartData.labels = ['Avant', ...months];

      // Données de démo pour le graphique (à remplacer par vraies données historiques)
      this.chartData.montantsPayes = [45000, 52000, 48000, 61000, 55000, 58000, 62000, 59000, 65000, 70000, 68000, 72000, 75000];
      this.chartData.restesAPayer = [28000, 32000, 35000, 42000, 38000, 41000, 39000, 43000, 47000, 52000, 48000, 51000, 49000];
      this.chartData.facturesImpayees = [12, 15, 18, 22, 19, 21, 20, 23, 25, 28, 26, 27, 24];
      console.log('[WORKFLOW DASHBOARD] calculateChartData() - Données graphique générées');
    },

    /**
     * Génère les conseils Smart Marki
     */
    generateSmartMarkiConseils() {
      console.log('[WORKFLOW DASHBOARD] generateSmartMarkiConseils() - Génération conseils');
      this.smartMarkiConseils = [
        {
          id: 1,
          icon: 'fa-lightbulb',
          titre: 'Optimisez vos relances',
          description: `Vous avez ${this.kpis.anciennete.j31a60} impayés entre 31-60 jours. Envisagez d'intensifier les relances.`
        },
        {
          id: 2,
          icon: 'fa-exclamation-triangle',
          titre: 'Attention aux délais',
          description: `${this.kpis.anciennete.plus120j} clients dépassent les 120 jours. Privilégiez un contact téléphonique.`
        },
        {
          id: 3,
          icon: 'fa-trophy',
          titre: 'Votre progression',
          description: `Vous avez ${this.contacts.length} contacts actifs et ${this.kpis.facturesEnAttente} factures en attente.`
        }
      ];
      console.log(`[WORKFLOW DASHBOARD] generateSmartMarkiConseils() - ${this.smartMarkiConseils.length} conseils générés`);
    },

    /**
     * Initialise le graphique Chart.js
     */
    initChart() {
      console.log('[WORKFLOW DASHBOARD] initChart() - Initialisation Chart.js');
      const ctx = document.getElementById('evolutionChart');
      if (!ctx || this.chart) {
        console.log('[WORKFLOW DASHBOARD] initChart() - Canvas non trouvé ou graphique déjà initialisé');
        return;
      }

      this.chart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: this.chartData.labels,
          datasets: [
            {
              label: 'Reste à payer',
              data: this.chartData.restesAPayer,
              backgroundColor: '#7dd3fc',
              borderRadius: 4,
              yAxisID: 'y',
              order: 2,
            },
            {
              label: 'Montant payé',
              data: this.chartData.montantsPayes,
              backgroundColor: '#0ea5e9',
              borderRadius: 4,
              yAxisID: 'y',
              order: 2,
            },
            {
              type: 'line',
              label: 'Nb factures impayées',
              data: this.chartData.facturesImpayees,
              borderColor: '#0369a1',
              backgroundColor: '#0369a1',
              pointBackgroundColor: '#0369a1',
              pointRadius: 4,
              borderWidth: 2,
              tension: 0.3,
              yAxisID: 'y1',
              order: 1,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true,
              position: 'bottom',
              labels: { usePointStyle: true, padding: 15 }
            }
          },
          scales: {
            y: {
              stacked: true,
              position: 'left',
              ticks: {
                callback: (val) => val >= 1000 ? (val / 1000).toFixed(0) + ' k€' : val + ' €'
              },
              grid: { color: '#f3f4f6' }
            },
            y1: {
              position: 'right',
              beginAtZero: true,
              ticks: { stepSize: 1, callback: (val) => val + ' fa.' },
              grid: { drawOnChartArea: false }
            },
            x: { stacked: true, grid: { display: false } }
          }
        }
      });
      console.log('[WORKFLOW DASHBOARD] initChart() - Graphique Chart.js initialisé');
    },

    /**
     * Données de démonstration
     */
    setDemoData() {
      console.log('[WORKFLOW DASHBOARD] setDemoData() - Chargement données de démo');
      this.kpis = {
        facturesEnAttente: 45,
        impayesActifs: 28,
        montantTotal: 128500,
        relancesJour: 18,
        reponsesRecues: 8,
        tauxRecouvrement: 68,
        tauxEvolution: '+5% vs mois dernier',
        anciennete: {
          moins7j: 12, moins7jMontant: 15400,
          j8a30: 15, j8a30Montant: 28300,
          j31a60: 10, j31a60Montant: 42100,
          j60a120: 8, j60a120Montant: 22700,
          plus120j: 5, plus120jMontant: 20100
        }
      };

      this.impayes = [
        { id: '1', reste_a_payer: 5000, solde_du: 5000, date_facture: '2024-01-10', statut: 'actif', facture_soldee: 0, contact_relance_id: 'c1', contact_nom: 'DUPONT SARL', payeur_nom: 'Dupont' },
        { id: '2', reste_a_payer: 3200, solde_du: 3200, date_facture: '2024-01-05', statut: 'actif', facture_soldee: 0, contact_relance_id: 'c2', contact_nom: 'MARTIN SA', payeur_nom: 'Martin' },
        { id: '3', reste_a_payer: 7800, solde_du: 7800, date_facture: '2023-12-15', statut: 'actif', facture_soldee: 0, contact_relance_id: 'c3', contact_nom: 'BERGER SARL', payeur_nom: 'Berger' },
        { id: '4', reste_a_payer: 1200, solde_du: 1200, date_facture: '2024-01-12', statut: 'actif', facture_soldee: 0, contact_relance_id: 'c4', contact_nom: 'LEFEBVRE SAS', payeur_nom: 'Lefebvre' },
        { id: '5', reste_a_payer: 4500, solde_du: 4500, date_facture: '2023-11-20', statut: 'actif', facture_soldee: 0, contact_relance_id: 'c5', contact_nom: 'MOREL ET ASSOCIES', payeur_nom: 'Morel' }
      ];

      this.contacts = [
        { id: 'c1', nom: 'DUPONT SARL', email: 'contact@dupont.fr' },
        { id: 'c2', nom: 'MARTIN SA', email: 'contact@martin.fr' },
        { id: 'c3', nom: 'BERGER SARL', email: 'contact@berger.fr' }
      ];

      this.relances = [
        { id: 'r1', contact_id: 'c1', statut: 'en_cours', created_at: '2024-01-15T10:00:00' },
        { id: 'r2', contact_id: 'c2', statut: 'envoyee', created_at: '2024-01-15T14:30:00' }
      ];

      this.events = [
        { id: 1, type: 'sync', icon: 'fa-sync-alt', title: 'Synchronisation effectuée', description: '3 nouvelles factures importées depuis ADTI', time: 'Il y a 2 heures' },
        { id: 2, type: 'payment', icon: 'fa-check-circle', title: 'Paiement reçu', description: 'ACME Corp a réglé la facture F-2024-0123 (€4,230)', time: 'Il y a 3 heures' }
      ];

      this.newInvoices = [
        { id: 1, nfacture: 'F-2024-0156', montant: 3500, date: '2024-01-15' },
        { id: 2, nfacture: 'F-2024-0157', montant: 2800, date: '2024-01-15' },
        { id: 3, nfacture: 'F-2024-0158', montant: 4200, date: '2024-01-14' }
      ];

      this.chartData = {
        labels: ['Avant', 'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc'],
        montantsPayes: [45000, 52000, 48000, 61000, 55000, 58000, 62000, 59000, 65000, 70000, 68000, 72000, 75000],
        restesAPayer: [28000, 32000, 35000, 42000, 38000, 41000, 39000, 43000, 47000, 52000, 48000, 51000, 49000],
        facturesImpayees: [12, 15, 18, 22, 19, 21, 20, 23, 25, 28, 26, 27, 24]
      };
      console.log('[WORKFLOW DASHBOARD] setDemoData() - Données de démo chargées');
    },

    /**
     * Helper : propage le viewMode vers le x-data imbriqué de la section "Top débiteurs".
     * L'index.html utilise un x-data local avec `viewMode` ; on tente de le synchroniser
     * via l'API officielle d'Alpine 3 (Alpine.$data) si disponible.
     */
    _propagateViewMode(mode) {
      try {
        if (typeof window === 'undefined' || typeof document === 'undefined') return;
        const root = document.querySelector('[x-data*="viewMode"]');
        if (!root) return;
        const Alpine = window.Alpine;
        if (Alpine && typeof Alpine.$data === 'function') {
          const scope = Alpine.$data(root);
          if (scope) scope.viewMode = mode;
        } else if (root._x_dataStack && root._x_dataStack[0]) {
          // fallback pour Alpine 3 builds qui exposent _x_dataStack
          root._x_dataStack[0].viewMode = mode;
        }
      } catch (_) { /* silencieux : la bascule reste effective via topDebtorsView */ }
    },

    /**
     * Extrait les initiales d'un nom
     */
    getInitials(name) {
      if (!name) return '?';
      return name.split(' ').filter(Boolean).map(n => n[0]).join('').substring(0, 2).toUpperCase();
    },

    /**
     * Formate un montant
     */
    formatMoney(amount) {
      return new Intl.NumberFormat('fr-FR', {
        style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0
      }).format(amount || 0);
    },

    /**
     * Formate un timestamp ISO 8601 en libellé FR lisible pour l'affichage
     * (ex: "Aujourd'hui à 14:32", "Hier à 09:15", "12/07/2026 11:00")
     */
    formatLastSync(iso) {
      if (!iso) return '—';
      try {
        const d = new Date(iso);
        if (isNaN(d.getTime())) return iso;
        const now = new Date();
        const sameDay = d.toDateString() === now.toDateString();
        const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
        const isYesterday = d.toDateString() === yesterday.toDateString();
        const hh = String(d.getHours()).padStart(2, '0');
        const mm = String(d.getMinutes()).padStart(2, '0');
        if (sameDay) return `Aujourd'hui à ${hh}:${mm}`;
        if (isYesterday) return `Hier à ${hh}:${mm}`;
        const dd = String(d.getDate()).padStart(2, '0');
        const mo = String(d.getMonth() + 1).padStart(2, '0');
        return `${dd}/${mo}/${d.getFullYear()} ${hh}:${mm}`;
      } catch (_) {
        return iso;
      }
    }
  };
}
