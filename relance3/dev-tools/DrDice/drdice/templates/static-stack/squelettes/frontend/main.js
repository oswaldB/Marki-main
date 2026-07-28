/*
 * INSTRUCTIONS IA - À APPLIQUER:
 * =============================
 * PRIORITÉ ABSOLUE: LIT EN PREMIER .specs/page-specs.md
 *
 * 1. FONCTION PRINCIPALE: Utiliser Alpine.data('{cell_name}Page', () => ({...}))
 *    pour enregistrer le composant.
 * 2. WORKFLOWS: Les workflows sont importés et stockés dans window.workflows
 *    - Chaque workflow exporte une fonction execute(context, params)
 *    - Les imports sont générés automatiquement (WORKFLOW_IMPORTS_PLACEHOLDER)
 * 3. SPECS: Consulter les workflows dans .specs/wf-frontend/*.md
 * 4. POUCHDB: window.localDB et window.remoteDB sont initialisés dans ce script
 * 5. CONSOLE LOGS: Maintenir les console.log('... loaded') pour les workflows
 */

// ═══════════════════════════════════════════════════════════════
// IMPORTS DES WORKFLOWS (modules ES)
// ═══════════════════════════════════════════════════════════════
// WORKFLOW_IMPORTS_PLACEHOLDER

// ═══════════════════════════════════════════════════════════════
// IMPORT ALPINE.JS (ESM via CDN)
// ═══════════════════════════════════════════════════════════════
import Alpine from 'https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/module.esm.js';

console.log('main.js loaded');

// ═══════════════════════════════════════════════════════════════
// ENREGISTREMENT DES WORKFLOWS DANS window
// ═══════════════════════════════════════════════════════════════
window.workflows = {
    // WORKFLOW_REGISTRATION_PLACEHOLDER
};

// WORKFLOW_LOGS_PLACEHOLDER

// ═══════════════════════════════════════════════════════════════
// INITIALISATION POUCHDB (si non initialisée avant)
// ═══════════════════════════════════════════════════════════════
if (typeof PouchDB !== 'undefined') {
    if (!window.localDB) {
        window.localDB = new PouchDB('{cell_name}-local');
    }
    if (!window.remoteDB) {
        window.remoteDB = null; // à configurer avec votre URL CouchDB
    }
}

// ═══════════════════════════════════════════════════════════════
// FONCTION PRINCIPALE ALPINE.JS (Alpine.data)
// ═══════════════════════════════════════════════════════════════
Alpine.data('{cell_name}Page', () => ({
    // ───────────────────────────────────────────────────────
    // ÉTAT DE LA PAGE
    // ───────────────────────────────────────────────────────
    isLoading: false,
    error: null,
    data: {},
    
    // ───────────────────────────────────────────────────────
    // INITIALISATION (appelée automatiquement par Alpine)
    // ───────────────────────────────────────────────────────
    init() {
        console.log('{cell_name}Page initialized');
        this.loadInitialData();
    },

    // ───────────────────────────────────────────────────────
    // MÉTHODES
    // ───────────────────────────────────────────────────────

    /**
     * Charge les données initiales via le workflow initial-load
     */
    async loadInitialData() {
        this.isLoading = true;
        this.error = null;

        try {
            const result = await this.runWorkflow('initial-load');
            if (result.success) {
                this.data = result.data || {};
            } else {
                this.error = result.error || 'Erreur lors du chargement initial';
            }
        } catch (err) {
            console.error('Erreur init:', err);
            this.error = err.message;
        } finally {
            this.isLoading = false;
        }
    },

    /**
     * Exécute un workflow avec les paramètres donnés
     * @param {string} workflowName - Nom du workflow
     * @param {Object} params - Paramètres à passer
     * @returns {Promise<Object>} Résultat { success, data, error }
     */
    async runWorkflow(workflowName, params = {}) {
        console.log(`Running workflow: ${workflowName}`, params);
        this.isLoading = true;
        this.error = null;

        try {
            if (!window.workflows || !window.workflows[workflowName]) {
                throw new Error(`Workflow "${workflowName}" non trouvé`);
            }

            const context = {
                localDB: window.localDB,
                remoteDB: window.remoteDB,
            };

            const result = await window.workflows[workflowName].execute(context, params);

            if (!result.success) {
                this.error = result.error || `Erreur dans le workflow ${workflowName}`;
            }

            console.log(`Workflow ${workflowName} completed:`, result);
            return result;

        } catch (err) {
            console.error(`Erreur workflow ${workflowName}:`, err);
            this.error = err.message;
            return { success: false, error: err.message };
        } finally {
            this.isLoading = false;
        }
    },

    /**
     * Récupère un paramètre depuis l'URL (hash)
     * @param {string} key - Nom du paramètre
     * @returns {string|null} Valeur du paramètre
     */
    getUrlParam(key) {
        const params = new URLSearchParams(window.location.hash.slice(1));
        return params.get(key);
    },

    /**
     * Définit un paramètre dans l'URL (hash)
     * @param {string} key - Nom du paramètre
     * @param {string} value - Valeur du paramètre
     */
    setUrlParam(key, value) {
        const params = new URLSearchParams(window.location.hash.slice(1));
        if (value) {
            params.set(key, value);
        } else {
            params.delete(key);
        }
        window.location.hash = params.toString();
    },

    /**
     * Efface le message d'erreur
     */
    clearError() {
        this.error = null;
    }
}));

// ═══════════════════════════════════════════════════════════════
// DÉMARRAGE D'ALPINE
// ═══════════════════════════════════════════════════════════════
Alpine.start();
