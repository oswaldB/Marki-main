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

/**
 * Workflow initial-load
 * Vérifie si l'utilisateur possède une session active et l'état de PouchDB
 * @param {Object} context - Contexte avec localDB, remoteDB
 * @param {Object} params - Paramètres du workflow
 * @returns {Promise<Object>} Résultat { success, data, error }
 */
export async function execute(context, params = {}) {
    console.log('initial-load workflow executing', params);
    console.log('initial-load: démarrage vérification session');
    
    try {
        // Configuration CouchDB
        const COUCHDB_URL = context.couchdbUrl || 'http://localhost:5984/';
        
        // Étape 1: Vérifier le cookie de session CouchDB (AuthSession)
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
            // Fallback: considérer qu'il n'y a pas de session
            sessionData = { ok: true, userCtx: { name: null, roles: [] } };
        }
        
        const hasSession = sessionData?.userCtx?.name !== null && 
                           sessionData?.userCtx?.name !== undefined;
        
        if (!hasSession) {
            console.log('initial-load: cookie AuthSession absent ou invalide');
            
            // Vérifier si token expiré (pas de session mais données locales)
            const localDb = context.localDB || new PouchDB('marki');
            const info = await localDb.info();
            
            if (info.doc_count > 0) {
                console.log('initial-load: données locales présentes mais session expirée');
                return {
                    success: true,
                    data: {
                        hasSession: false,
                        reason: 'token_expired'
                    },
                    error: null
                };
            }
            
            return {
                success: true,
                data: {
                    hasSession: false,
                    reason: 'no_session_cookie'
                },
                error: null
            };
        }
        
        console.log('initial-load: session CouchDB active pour:', sessionData.userCtx.name);
        
        // Étape 2: Vérifier PouchDB local
        const localDb = context.localDB || new PouchDB('marki');
        const info = await localDb.info();
        console.log('initial-load: PouchDB local:', info.doc_count, 'documents');
        
        // Étape 3: Vérifier le statut de sync
        const lastSync = localStorage.getItem('marki_last_sync');
        const needsSync = info.doc_count === 0 || !lastSync;
        
        // Étape 4: Récupérer rememberMe
        const rememberMe = localStorage.getItem('auth_remember_me') === 'true';
        
        // Construire la réponse
        const pouchDbStatus = {
            docCount: info.doc_count,
            lastSync: lastSync,
            needsSync: needsSync,
            syncing: needsSync
        };
        
        // Étape 5: Gérer la redirection ou le sync
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
                    pouchDbStatus: pouchDbStatus,
                    rememberMe: rememberMe,
                    redirectTo: '/dashboard'
                },
                error: null
            };
        }
        
        // Session active mais sync nécessaire
        console.log('initial-load: sync initial requis → affichage loading screen');
        return {
            success: true,
            data: {
                hasSession: true,
                session: {
                    name: sessionData.userCtx.name,
                    roles: sessionData.userCtx.roles || []
                },
                pouchDbStatus: pouchDbStatus,
                rememberMe: rememberMe
            },
            error: null
        };
        
    } catch (err) {
        console.error('initial-load error:', err);
        console.log('initial-load: erreur réseau → mode hors-ligne (pas de session)');
        return {
            success: false,
            data: null,
            error: `Erreur lors de la vérification de session: ${err.message}`
        };
    }
}
