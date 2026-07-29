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
        
        const hasSession = sessionData?.userCtx?.name !== null;
        
        if (!hasSession) {
            console.log('initial-load: cookie AuthSession absent ou invalide');
            return {
                success: true,
                data: {
                    hasSession: false,
                    reason: 'no_session_cookie'
                },
                error: null
            };
        }
        
        const userName = sessionData.userCtx.name;
        const userRoles = sessionData.userCtx.roles;
        console.log('initial-load: session CouchDB active pour:', userName);
        
        // 2. Vérifier PouchDB local
        const localDb = new PouchDB('marki');
        const info = await localDb.info();
        const docCount = info.doc_count || 0;
        console.log('initial-load: PouchDB local:', docCount, 'documents');
        
        // 3. Récupérer rememberMe
        const rememberMe = localStorage.getItem('auth_remember_me') === 'true';
        
        // 4. Déterminer si sync est nécessaire
        const needsSync = docCount === 0;
        
        if (!needsSync) {
            console.log('initial-load: PouchDB à jour → redirection vers /dashboard');
            
            // Redirection immédiate
            window.location.href = '/dashboard';
            
            return {
                success: true,
                data: {
                    hasSession: true,
                    session: {
                        name: userName,
                        roles: userRoles
                    },
                    pouchDbStatus: {
                        docCount: docCount,
                        needsSync: false
                    },
                    rememberMe: rememberMe,
                    redirectTo: '/dashboard'
                },
                error: null
            };
        }
        
        // 5. Démarrer sync initial
        console.log('initial-load: sync initial requis → affichage loading screen');
        
        const syncResult = await performInitialSync(localDb);
        
        if (syncResult.success) {
            console.log('initial-load: sync terminé → redirection vers /dashboard');
            window.location.href = '/dashboard';
            
            return {
                success: true,
                data: {
                    hasSession: true,
                    session: {
                        name: userName,
                        roles: userRoles
                    },
                    pouchDbStatus: {
                        docCount: syncResult.docCount,
                        needsSync: false,
                        syncing: false
                    },
                    rememberMe: rememberMe,
                    redirectTo: '/dashboard'
                },
                error: null
            };
        } else {
            // Sync en erreur, mais on a une session - on redirige quand même
            console.log('initial-load: sync en erreur, redirection en mode dégradé');
            window.location.href = '/dashboard';
            
            return {
                success: true,
                data: {
                    hasSession: true,
                    session: {
                        name: userName,
                        roles: userRoles
                    },
                    pouchDbStatus: {
                        docCount: docCount,
                        needsSync: true,
                        syncing: false,
                        error: syncResult.error
                    },
                    rememberMe: rememberMe,
                    redirectTo: '/dashboard'
                },
                error: null
            };
        }
        
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
 * Effectue la synchronisation initiale avec le serveur CouchDB
 * @param {Object} localDb - Instance PouchDB locale
 * @returns {Promise<Object>} Résultat de la sync
 */
async function performInitialSync(localDb) {
    return new Promise((resolve) => {
        const sync = localDb.sync(`${COUCHDB_URL}marki`, {
            live: false,
            retry: true
        });
        
        sync.on('complete', async (info) => {
            const dbInfo = await localDb.info();
            resolve({
                success: true,
                docCount: dbInfo.doc_count
            });
        });
        
        sync.on('error', (err) => {
            console.error('initial-load: erreur sync:', err);
            resolve({
                success: false,
                error: err.message
            });
        });
    });
}
