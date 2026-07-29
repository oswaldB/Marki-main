console.log('initial-load.js loaded');

// Configuration CouchDB
const COUCHDB_URL = 'http://dev.markidiags.com:5984/';

/**
 * Workflow initial-load
 * Vérifie si l'utilisateur possède une session active et gère la synchro PouchDB
 * @param {Object} context - Contexte avec localDB, remoteDB, etc.
 * @param {Object} params - Paramètres du workflow
 * @returns {Promise<Object>} Résultat { success, data, error }
 */
export async function execute(context, params = {}) {
    console.log('initial-load: démarrage vérification session');
    
    try {
        // 1. Vérifier le cookie de session CouchDB (AuthSession)
        console.log('initial-load: vérification cookie AuthSession');
        
        let sessionData = null;
        let sessionError = null;
        
        try {
            const response = await fetch(`${COUCHDB_URL}_session`, {
                credentials: 'include'  // Envoie le cookie AuthSession
            });
            
            // Vérifier Content-Type avant parsing JSON
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error(`Réponse non-JSON: ${contentType}`);
            }
            
            sessionData = await response.json();
        } catch (error) {
            console.error('initial-load: erreur récupération session:', error.message);
            console.log('initial-load: erreur réseau → mode hors-ligne (pas de session)');
            // Fallback: considérer qu'il n'y a pas de session
            sessionData = { ok: true, userCtx: { name: null, roles: [] } };
            sessionError = error.message;
        }
        
        // 2. Vérifier si session active
        const hasSession = sessionData && sessionData.userCtx && sessionData.userCtx.name !== null;
        
        if (!hasSession) {
            const reason = sessionError ? 'network_error' : 'no_session_cookie';
            console.log('initial-load: cookie AuthSession absent ou invalide');
            
            // 3. Restaurer rememberMe pour le formulaire
            const rememberMe = localStorage.getItem('auth_remember_me') === 'true';
            
            return {
                success: true,
                data: {
                    hasSession: false,
                    reason: reason,
                    rememberMe: rememberMe
                },
                error: null
            };
        }
        
        // Session active détectée
        const userName = sessionData.userCtx.name;
        const userRoles = sessionData.userCtx.roles || [];
        console.log('initial-load: session CouchDB active pour:', userName);
        
        // 4. Vérifier PouchDB local
        let pouchDbStatus = {
            docCount: 0,
            lastSync: null,
            needsSync: true,
            syncing: false
        };
        
        try {
            // PouchDB est disponible globalement
            const localDb = new PouchDB('marki');
            const info = await localDb.info();
            pouchDbStatus.docCount = info.doc_count || 0;
            console.log('initial-load: PouchDB local:', pouchDbStatus.docCount, 'documents');
            
            // Vérifier s'il y a besoin de sync (seuil arbitraire: si 0 docs, besoin de sync)
            pouchDbStatus.needsSync = pouchDbStatus.docCount === 0;
            
            // Vérifier dernier sync dans localStorage
            const lastSync = localStorage.getItem('marki_last_sync');
            if (lastSync) {
                pouchDbStatus.lastSync = lastSync;
                // Si sync récent (< 5 min), considérer à jour
                const syncTime = new Date(lastSync).getTime();
                const now = Date.now();
                if (now - syncTime < 5 * 60 * 1000) {
                    pouchDbStatus.needsSync = false;
                }
            }
        } catch (dbError) {
            console.error('initial-load: erreur PouchDB:', dbError.message);
            // Continue avec PouchDB vide
        }
        
        // 5. Récupérer rememberMe
        const rememberMe = localStorage.getItem('auth_remember_me') === 'true';
        
        // 6. Décider de l'action
        if (!pouchDbStatus.needsSync) {
            // PouchDB à jour → redirection immédiate
            console.log('initial-load: PouchDB à jour → redirection vers /dashboard');
            
            // Redirection après un court délai pour permettre le retour de la fonction
            setTimeout(() => {
                window.location.href = '/dashboard';
            }, 100);
            
            return {
                success: true,
                data: {
                    hasSession: true,
                    session: {
                        name: userName,
                        roles: userRoles
                    },
                    pouchDbStatus: pouchDbStatus,
                    rememberMe: rememberMe,
                    redirectTo: '/dashboard'
                },
                error: null
            };
        }
        
        // 7. Sync initial requis → démarrer la synchro
        console.log('initial-load: sync initial requis → affichage loading screen');
        pouchDbStatus.syncing = true;
        
        // Démarrer le sync en arrière-plan (non-bloquant pour le retour)
        const localDb = new PouchDB('marki');
        const sync = localDb.sync(`${COUCHDB_URL}marki`, {
            live: false,    // Sync initial one-shot
            retry: true
        });
        
        // Écouter les événements de sync
        sync.on('complete', (info) => {
            console.log('initial-load: sync terminé → redirection vers /dashboard');
            localStorage.setItem('marki_last_sync', new Date().toISOString());
            window.location.href = '/dashboard';
        });
        
        sync.on('error', (err) => {
            console.error('initial-load: erreur sync:', err);
            // Option: rediriger quand même en mode hors-ligne
            // window.location.href = '/dashboard';
        });
        
        return {
            success: true,
            data: {
                hasSession: true,
                session: {
                    name: userName,
                    roles: userRoles
                },
                pouchDbStatus: pouchDbStatus,
                rememberMe: rememberMe
            },
            error: null
        };
        
    } catch (err) {
        console.error('initial-load error:', err);
        console.error('initial-load: erreur technique:', err.message);
        return {
            success: false,
            data: null,
            error: `Erreur lors de la vérification de session: ${err.message}`
        };
    }
}
