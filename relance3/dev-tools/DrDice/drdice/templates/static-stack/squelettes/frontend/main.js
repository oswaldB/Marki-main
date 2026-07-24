/**
 * TODO IA:
 * +> je veux les instructions ici.
 * Les instructions sont :
 * toujours runWorkflow pour chaque bouton.
 */

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION POUCHDB + COUCHDB
// ═══════════════════════════════════════════════════════════════

const COUCHDB_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:5984/app_db'
    : 'https://dev.markidiags.com/data/';

const localDB = new PouchDB('app_db_local');
const remoteDB = new PouchDB(COUCHDB_URL);

// Synchronisation bidirectionnelle en temps réel
const sync = localDB.sync(remoteDB, {
    live: true,
    retry: true,
    checkpoint: true
});

sync.on('change', (change) => {
    console.log('📡 Sync change:', change);
}).on('error', (err) => {
    console.error('❌ Sync error:', err);
}).on('paused', () => {
    console.log('⏸️ Sync paused');
}).on('active', () => {
    console.log('▶️ Sync active');
});

// ═══════════════════════════════════════════════════════════════
// CHARGEMENT DYNAMIQUE DES WORKFLOWS
// ═══════════════════════════════════════════════════════════════

const workflows = {};

async function loadWorkflows() {
    // TODO IA: Charger tous les workflows depuis ./workflows/*.js
    // Exemple:
    // workflows.init = (await import('./workflows/init.js')).execute;
    // workflows.submit = (await import('./workflows/submit.js')).execute;
    console.log('📦 Workflows chargés:', Object.keys(workflows));
}

// ═══════════════════════════════════════════════════════════════
// LOGGER GLOBAL
// ═══════════════════════════════════════════════════════════════

const logger = {
    info: (event, data) => console.log(`[INFO] [${event}]`, data),
    error: (event, data) => console.error(`[ERROR] [${event}]`, data),
    debug: (event, data) => console.debug(`[DEBUG] [${event}]`, data),
    warning: (event, data) => console.warn(`[WARNING] [${event}]`, data)
};

// ═══════════════════════════════════════════════════════════════
// ALPINE.JS APP +> {Cell}
// ═══════════════════════════════════════════════════════════════

document.addEventListener('alpine:init', () => {
    Alpine.data('app', () => ({
        // ═══════════════════════════════════════════════════════
        // PROPS RÉACTIVES (définies D'ABORD)
        // ═══════════════════════════════════════════════════════
        isLoading: false,
        error: null,
        currentUser: null,
        data: {},
        logs: [],

        // ═══════════════════════════════════════════════════════
        // GETTERS
        // ═══════════════════════════════════════════════════════
        get hasError() {
            return this.error !== null;
        },

        get isAuthenticated() {
            return !!this.currentUser;
        },

        // ═══════════════════════════════════════════════════════
        // INITIALISATION
        // ═══════════════════════════════════════════════════════
        async init() {
            logger.info('APP_INIT', { cell: '{cell_name}' });

            await loadWorkflows();
            this.setupWatchers();

            // Vérifier auth
            const token = localStorage.getItem('auth_token');
            if (!token && '{cell_name}' !== 'login') {
                window.location.href = '/login';
                return;
            }

            // Charger les données initiales
            await this.runWorkflow('init');
        },

        // ═══════════════════════════════════════════════════════
        // WATCHERS ($watch)
        // ═══════════════════════════════════════════════════════
        setupWatchers() {
            // Surveiller les changements de data pour sync PouchDB
            this.$watch('data', (newVal, oldVal) => {
                logger.debug('DATA_CHANGED', { new: newVal, old: oldVal });
            }, { deep: true });

            // Surveiller les erreurs
            this.$watch('error', (newVal) => {
                if (newVal) {
                    logger.error('APP_ERROR', { error: newVal });
                }
            });
        },

        // ═══════════════════════════════════════════════════════
        // HELPERS
        // ═══════════════════════════════════════════════════════
        formatDate(dateString) {
            if (!dateString) return '';
            return new Date(dateString).toLocaleDateString('fr-FR');
        },

        formatCurrency(amount) {
            if (amount === null || amount === undefined) return '';
            return new Intl.NumberFormat('fr-FR', {
                style: 'currency',
                currency: 'EUR'
            }).format(amount);
        },

        addLog(level, event, data) {
            this.logs.push({
                timestamp: new Date().toISOString(),
                level,
                event,
                data
            });
        },

        // ═══════════════════════════════════════════════════════
        // UTILITAIRES POUCHDB
        // ═══════════════════════════════════════════════════════
        async saveToPouchDB(doc) {
            try {
                const result = await localDB.put(doc);
                logger.info('DB_SAVE_SUCCESS', { id: doc._id, rev: result.rev });
                return result;
            } catch (err) {
                logger.error('DB_SAVE_ERROR', { error: err.message, doc });
                throw err;
            }
        },

        async getFromPouchDB(docId) {
            try {
                const doc = await localDB.get(docId);
                logger.debug('DB_GET_SUCCESS', { id: docId });
                return doc;
            } catch (err) {
                if (err.status === 404) {
                    return null;
                }
                logger.error('DB_GET_ERROR', { error: err.message, id: docId });
                throw err;
            }
        },

        async queryPouchDB(selector, options = {}) {
            try {
                // S'assurer que l'index existe
                await localDB.createIndex({
                    index: { fields: Object.keys(selector) }
                });

                const result = await localDB.find({
                    selector,
                    ...options
                });
                logger.debug('DB_QUERY_SUCCESS', { count: result.docs.length, selector });
                return result.docs;
            } catch (err) {
                logger.error('DB_QUERY_ERROR', { error: err.message, selector });
                throw err;
            }
        },

        // ═══════════════════════════════════════════════════════
        // WORKFLOW RUNNER
        // ═══════════════════════════════════════════════════════
        async runWorkflow(name, params = {}) {
            this.isLoading = true;
            this.error = null;

            const workflowId = `wf_${Date.now()}`;
            this.addLog('INFO', 'WORKFLOW_START', { workflowId, name, params });

            try {
                if (!workflows[name]) {
                    throw new Error(`Workflow "${name}" non chargé. Vérifiez le fichier workflows/${name}.js`);
                }

                const context = {
                    localDB,
                    remoteDB,
                    currentUser: this.currentUser,
                    // Méthodes disponibles pour les workflows
                    setUser: (user) => { this.currentUser = user; },
                    setData: (data) => { this.data = { ...this.data, ...data }; },
                    navigate: (url) => { window.location.href = url; },
                    showError: (msg) => { this.error = msg; },
                    addLog: (level, event, data) => this.addLog(level, event, data)
                };

                const result = await workflows[name](context, params);

                if (result.success) {
                    this.addLog('INFO', 'WORKFLOW_SUCCESS', { workflowId, name });

                    // Mettre à jour les données si fournies
                    if (result.data) {
                        this.setData(result.data);
                    }

                    return result;
                } else {
                    throw new Error(result.error || 'Workflow failed');
                }
            } catch (err) {
                this.error = err.message;
                this.addLog('ERROR', 'WORKFLOW_ERROR', { workflowId, name, error: err.message });
                logger.error('WORKFLOW_ERROR', { workflowId, name, error: err.message });
                throw err;
            } finally {
                this.isLoading = false;
            }
        }
    }));
});
