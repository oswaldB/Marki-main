/*
 * INSTRUCTIONS IA - À APPLIQUER (À LIRE EN PREMIER):
 * =================================================
 * PRIORITÉ ABSOLUE: LIRE .specs/page-specs.md AVANT TOUTE MODIFICATION
 *
 * 1. FONCTION PRINCIPALE OBLIGATOIRE:
 *    - Utiliser UNIQUEMENT: Alpine.data('loginPage', () => ({...}))
 *    - NE PAS utiliser: function loginPage() ou window.loginPage
 *    - Alpine.data() enregistre le composant dans le registre interne d'Alpine
 *    - Dans index.html: x-data="loginPage" (SANS parenthèses)
 *
 * 2. WORKFLOWS:
 *    - Les workflows sont déjà importés et stockés dans window.workflows
 *    - NE PAS modifier la structure window.workflows = { 'nom': { execute: fn } }
 *    - Chaque workflow exporte: execute(context, params) => { success, data, error }
 *
 * 3. POUCHDB: window.localDB et window.remoteDB sont initialisés ci-dessous
 *    - NE PAS supprimer ou déplacer ce code
 *
 * 4. CONSOLE: Maintenir les console.log('... loaded') pour debug
 *
 * 5. DÉMARRAGE: Garder Alpine.start() à la fin du fichier
 *    - NE PAS modifier l'ordre d'exécution
 *
 * Aucune route en localhost.
 */

// ═══════════════════════════════════════════════════════════════
// IMPORTS DES WORKFLOWS (modules ES)
// ═══════════════════════════════════════════════════════════════
import { execute as initial_loadExecute } from './workflows/initial-load.js';
import { execute as auth_submitExecute } from './workflows/auth-submit.js';
import { execute as sync_loadingExecute } from './workflows/sync-loading.js';

// ═══════════════════════════════════════════════════════════════
// IMPORT ALPINE.JS (ESM via CDN)
// ═══════════════════════════════════════════════════════════════
import Alpine from 'https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/module.esm.js';

console.log('main.js loaded');

// ═══════════════════════════════════════════════════════════════
// ENREGISTREMENT DES WORKFLOWS DANS window
// ═══════════════════════════════════════════════════════════════
window.workflows = {
    'initial-load': { execute: initial_loadExecute },
    'auth-submit': { execute: auth_submitExecute },
    'sync-loading': { execute: sync_loadingExecute }
};

console.log('initial-load.js loaded');
console.log('auth-submit.js loaded');
console.log('sync-loading.js loaded');

// ═══════════════════════════════════════════════════════════════
// INITIALISATION POUCHDB (si non initialisée avant)
// ═══════════════════════════════════════════════════════════════
if (typeof PouchDB !== 'undefined') {
    if (!window.localDB) {
        window.localDB = new PouchDB('login-local');
    }
    if (!window.remoteDB) {
        window.remoteDB = null; // à configurer avec votre URL CouchDB
    }
}

// ═══════════════════════════════════════════════════════════════
// FONCTION PRINCIPALE - ENREGISTREMENT ALPINE (NE PAS MODIFIER CETTE STRUCTURE)
// Utilise Alpine.data() - PAS de fonction globale, PAS d'exposition sur window
// Dans HTML: x-data="loginPage" (sans parenthèses)
// ═══════════════════════════════════════════════════════════════
Alpine.data('loginPage', () => ({
    // ───────────────────────────────────────────────────────
    // ÉTAT DE LA PAGE
    // ───────────────────────────────────────────────────────
    loading: false,
    error: null,
    data: {},
    form: {
        username: '',
        password: ''
    },

    // ───────────────────────────────────────────────────────
    // INITIALISATION (appelée automatiquement par Alpine)
    // ───────────────────────────────────────────────────────
    init() {
        console.log('loginPage initialized');
        this.loadInitialData();
    },

    // ───────────────────────────────────────────────────────
    // MÉTHODES
    // ───────────────────────────────────────────────────────

    /**
     * Charge les données initiales via le workflow initial-load
     */
    async loadInitialData() {
        this.loading = true;
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
            this.loading = false;
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
        this.loading = true;
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
            this.loading = false;
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
