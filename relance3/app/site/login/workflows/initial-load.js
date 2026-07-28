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

// Configuration CouchDB
const COUCHDB_URL = window.location.origin.replace(/:\d+/, ':5984') + '/';

/**
 * Workflow initial-load
 * Vérifie si l'utilisateur possède une session active au chargement de la page login
 * @param {Object} context - Contexte avec localDB, remoteDB
 * @param {Object} params - Paramètres du workflow
 * @returns {Promise<Object>} Résultat { success, data, error }
 */
export async function execute(context, params = {}) {
    console.log('initial-load workflow executing', params);
    console.log('initial-load: démarrage vérification session');
    
    try {
        // Récupérer les instances DB depuis le contexte
        const localDB = context?.localDB;
        
        if (!localDB) {
            throw new Error('Contexte PouchDB local manquant');
        }
        
        // 1. Vérifier le cookie de session CouchDB (AuthSession)
        console.log('initial-load: vérification cookie AuthSession');
        
        let sessionData = null;
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
        }
        
        // Vérifier si session active
        const hasSession = sessionData?.userCtx?.name !== null && sessionData?.userCtx?.name !== undefined;
        
        if (!hasSession) {
            console.log('initial-load: cookie AuthSession absent ou invalide');
            
            // Vérifier si token expiré (présence d'ancien cookie mais invalide)
            // Note: Le navigateur gère ça automatiquement, on vérifie juste la réponse
            const reason = sessionData?.info?.authentication_handlers 
                ? 'token_expired' 
                : 'no_session_cookie';
            
            return {
                success: true,
                data: {
                    hasSession: false,
                    reason: reason
                },
                error: null
            };
        }
        
        // Session active détectée
        const userName = sessionData.userCtx.name;
        const userRoles = sessionData.userCtx.roles || [];
        
        console.log('initial-load: session CouchDB active pour:', userName);
        
        // 2. Vérifier PouchDB local
        const pouchInfo = await localDB.info();
        const docCount = pouchInfo.doc_count || 0;
        
        console.log('initial-load: PouchDB local:', docCount, 'documents');
        
        // 3. Récupérer rememberMe depuis localStorage
        const rememberMe = localStorage.getItem('auth_remember_me') === 'true';
        
        // 4. Vérifier si sync nécessaire
        const needsSync = docCount === 0;
        
        if (!needsSync) {
            console.log('initial-load: PouchDB à jour → redirection vers /dashboard');
            
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
                        lastSync: new Date().toISOString(),
                        needsSync: false
                    },
                    rememberMe: rememberMe,
                    redirectTo: '/dashboard'
                },
                error: null
            };
        }
        
        // Sync initial requis
        console.log('initial-load: sync initial requis → affichage loading screen');
        
        return {
            success: true,
            data: {
                hasSession: true,
                session: {
                    name: userName,
                    roles: userRoles
                },
                pouchDbStatus: {
                    docCount: 0,
                    needsSync: true,
                    syncing: true
                },
                rememberMe: rememberMe
            },
            error: null
        };
        
    } catch (err) {
        console.error('initial-load error:', err);
        console.error('initial-load: erreur récupération session (réponse non-JSON ou réseau)');
        return {
            success: false,
            data: null,
            error: `Erreur lors de la vérification de session: ${err.message}`
        };
    }
}
