console.log('initial-load.js loaded');

const COUCHDB_URL = 'https://dev.markidiags.com/data/';

/**
 * Workflow initial-load
 * Vérifie si l'utilisateur possède une session active au chargement de la page login
 * @param {Object} context - Contexte avec localDB, remoteDB
 * @param {Object} params - Paramètres du workflow
 * @returns {Promise<Object>} Résultat { success, data, error }
 */
export async function execute(context, params = {}) {
    console.log('initial-load: démarrage vérification session');
    
    try {
        // 1. Vérifier le cookie de session CouchDB (AuthSession)
        console.log('initial-load: vérification cookie AuthSession');
        
        let sessionData = null;
        try {
            const response = await fetch(`${COUCHDB_URL}_session`, {
                credentials: 'include'
            });
            
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error(`Réponse non-JSON: ${contentType}`);
            }
            
            sessionData = await response.json();
        } catch (error) {
            console.error('initial-load: erreur récupération session:', error.message);
            console.log('initial-load: erreur réseau → mode hors-ligne (pas de session)');
            sessionData = { ok: true, userCtx: { name: null, roles: [] } };
        }
        
        const hasSession = sessionData.ok && sessionData.userCtx.name !== null;
        
        if (!hasSession) {
            console.log('initial-load: cookie AuthSession absent ou invalide');
            
            // Vérifier rememberMe pour pré-remplir le formulaire
            const rememberMe = localStorage.getItem('auth_remember_me') === 'true';
            
            return {
                success: true,
                data: {
                    hasSession: false,
                    reason: 'no_session_cookie',
                    rememberMe
                },
                error: null
            };
        }
        
        console.log(`initial-load: session CouchDB active pour: ${sessionData.userCtx.name}`);
        
        // 2. Vérifier PouchDB local
        const localDb = new PouchDB('marki');
        const info = await localDb.info();
        const docCount = info.doc_count || 0;
        
        console.log(`initial-load: PouchDB local: ${docCount} documents`);
        
        // Vérifier rememberMe
        const rememberMe = localStorage.getItem('auth_remember_me') === 'true';
        
        // 3. Déterminer si sync est nécessaire
        const needsSync = docCount === 0;
        
        if (!needsSync) {
            console.log('initial-load: PouchDB à jour → redirection vers /dashboard');
            
            return {
                success: true,
                data: {
                    hasSession: true,
                    session: {
                        name: sessionData.userCtx.name,
                        roles: sessionData.userCtx.roles || []
                    },
                    pouchDbStatus: {
                        docCount: docCount,
                        lastSync: new Date().toISOString(),
                        needsSync: false
                    },
                    rememberMe,
                    redirectTo: '/dashboard'
                },
                error: null
            };
        }
        
        // 4. Démarrer sync initial
        console.log('initial-load: sync initial requis → affichage loading screen');
        
        return {
            success: true,
            data: {
                hasSession: true,
                session: {
                    name: sessionData.userCtx.name,
                    roles: sessionData.userCtx.roles || []
                },
                pouchDbStatus: {
                    docCount: 0,
                    needsSync: true,
                    syncing: true
                },
                rememberMe
            },
            error: null
        };
        
    } catch (err) {
        console.error('initial-load error:', err);
        return {
            success: false,
            data: null,
            error: `Erreur lors de la vérification de session: ${err.message}`
        };
    }
}

/**
 * Démarre la synchronisation initiale avec CouchDB
 * @param {Function} onProgress - Callback pour les mises à jour de progression
 * @param {Function} onComplete - Callback quand la sync est terminée
 * @param {Function} onError - Callback en cas d'erreur
 */
export function startInitialSync(onProgress, onComplete, onError) {
    const localDb = new PouchDB('marki');
    
    const sync = localDb.sync(`${COUCHDB_URL}marki`, {
        live: false,
        retry: true
    });
    
    sync.on('change', (info) => {
        if (onProgress) onProgress(info);
    });
    
    sync.on('complete', (info) => {
        console.log('initial-load: sync terminé → redirection vers /dashboard');
        if (onComplete) onComplete(info);
    });
    
    sync.on('error', (err) => {
        console.error('initial-load: erreur sync:', err);
        if (onError) onError(err);
    });
    
    return sync;
}
