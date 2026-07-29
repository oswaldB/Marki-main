/*
INSTRUCTIONS IA - À APPLIQUER:
=============================

PRIORITÉ ABSOLUE: LIT EN PREMIER .specs/page-specs.md

1. NOM DU WORKFLOW: initial-load

2. SPECS: Implémenter selon:
   - .specs/wf-frontend/initial-load.md
   - /home/ubuntu/marki/relance3/app/site/login/.specs/wf-frontend/initial-load.md

3. FONCTION: Export nommé execute(context, params) qui:
   - Prend context (avec localDB, remoteDB, etc.)
   - Prend params (paramètres du workflow)
   - Retourne { success: true/false, data: {}, error: string }

4. CONSOLE: Logger 'initial-load.js loaded' au chargement
*/

console.log('initial-load.js loaded');

const COUCHDB_URL = 'https://dev.marki.com/data/';

/**
 * Vérifie si l'utilisateur possède une session active CouchDB
 * @returns {Promise<Object|null>} Données session ou null
 */
async function checkCouchSession() {
    console.log('initial-load: vérification cookie AuthSession');
    
    try {
        const response = await fetch(`${COUCHDB_URL}_session`, {
            credentials: 'include'
        });
        
        // Vérifier Content-Type avant parsing JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            throw new Error(`Réponse non-JSON: ${contentType}`);
        }
        
        const sessionData = await response.json();
        return sessionData;
        
    } catch (error) {
        console.error('initial-load: erreur récupération session:', error.message);
        console.log('initial-load: erreur réseau → mode hors-ligne (pas de session)');
        // Fallback: considérer qu'il n'y a pas de session
        return { ok: true, userCtx: { name: null, roles: [] } };
    }
}

/**
 * Vérifie le statut de PouchDB local
 * @returns {Promise<Object>} Informations sur PouchDB
 */
async function checkPouchDbStatus() {
    try {
        // PouchDB est disponible globalement via CDN
        const localDb = new PouchDB('marki');
        const info = await localDb.info();
        
        console.log(`initial-load: PouchDB local: ${info.doc_count} documents`);
        
        return {
            docCount: info.doc_count,
            lastSync: null, // Pourrait être stocké dans localStorage
            needsSync: info.doc_count === 0,
            syncing: false
        };
    } catch (error) {
        console.error('initial-load: erreur vérification PouchDB:', error);
        return {
            docCount: 0,
            needsSync: true,
            syncing: false
        };
    }
}

/**
 * Démarre la synchronisation initiale PouchDB
 * @param {Object} localDb - Instance PouchDB locale
 * @returns {Promise<void>}
 */
async function startInitialSync(localDb) {
    console.log('initial-load: sync initial requis → affichage loading screen');
    
    return new Promise((resolve, reject) => {
        const sync = localDb.sync(`${COUCHDB_URL}marki`, {
            live: false,
            retry: true
        });
        
        sync.on('change', (info) => {
            console.log('initial-load: sync progress', info);
        });
        
        sync.on('complete', () => {
            console.log('initial-load: sync terminé → redirection vers /dashboard');
            resolve();
        });
        
        sync.on('error', (err) => {
            console.error('initial-load: erreur sync:', err);
            reject(err);
        });
    });
}

/**
 * Lit le rememberMe du localStorage
 * @returns {boolean}
 */
function getRememberMe() {
    try {
        return localStorage.getItem('auth_remember_me') === 'true';
    } catch {
        return false;
    }
}

/**
 * Redirige vers le dashboard
 */
function redirectToDashboard() {
    window.location.href = '/dashboard';
}

/**
 * Workflow initial-load
 * Vérifie si l'utilisateur possède une session active au chargement
 * 
 * @param {Object} context - Contexte avec localDB, remoteDB
 * @param {Object} params - Paramètres du workflow
 * @returns {Promise<Object>} Résultat { success, data, error }
 */
export async function execute(context, params = {}) {
    console.log('initial-load workflow executing', params);
    console.log('initial-load: démarrage vérification session');
    
    try {
        // Étape 1: Vérifier session CouchDB
        const sessionData = await checkCouchSession();
        
        const hasSession = sessionData?.ok === true && sessionData?.userCtx?.name !== null;
        
        if (!hasSession) {
            console.log('initial-load: cookie AuthSession absent ou invalide');
            return { 
                success: true, 
                data: {
                    hasSession: false,
                    reason: "no_session_cookie"
                },
                error: null
            };
        }
        
        console.log(`initial-load: session CouchDB active pour: ${sessionData.userCtx.name}`);
        
        // Étape 2: Vérifier PouchDB local
        const pouchDbStatus = await checkPouchDbStatus();
        const rememberMe = getRememberMe();
        
        const result = {
            hasSession: true,
            session: {
                name: sessionData.userCtx.name,
                roles: sessionData.userCtx.roles || []
            },
            pouchDbStatus,
            rememberMe
        };
        
        // Étape 3: Décider de la redirection ou de la sync
        if (!pouchDbStatus.needsSync) {
            // PouchDB est à jour → redirection immédiate
            console.log('initial-load: PouchDB à jour → redirection vers /dashboard');
            result.redirectTo = '/dashboard';
            
            // Redirection asynchrone
            setTimeout(() => redirectToDashboard(), 0);
            
            return {
                success: true,
                data: result,
                error: null
            };
        }
        
        // PouchDB nécessite une sync
        const localDb = new PouchDB('marki');
        
        // On retourne immédiatement avec l'info que sync est en cours
        // La sync continue en arrière-plan
        result.pouchDbStatus.syncing = true;
        
        // Démarrer la sync en arrière-plan
        setTimeout(async () => {
            try {
                await startInitialSync(localDb);
                redirectToDashboard();
            } catch (syncErr) {
                console.error('initial-load: échec sync, redirection forcée:', syncErr);
                // Rediriger quand même en mode hors-ligne
                redirectToDashboard();
            }
        }, 0);
        
        return {
            success: true,
            data: result,
            error: null
        };
        
    } catch (err) {
        console.error('initial-load error:', err);
        console.error('initial-load: erreur récupération session (réponse non-JSON ou réseau)');
        return { 
            success: false, 
            data: null,
            error: err.message || "Erreur lors de la vérification de session"
        };
    }
}
