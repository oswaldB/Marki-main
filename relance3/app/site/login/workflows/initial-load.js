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
const COUCHDB_URL = window.COUCHDB_URL || 'http://localhost:5984/';

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
        
        // Pas de session active
        if (!sessionData.userCtx.name) {
            console.log('initial-load: cookie AuthSession absent ou invalide');
            
            // Restaurer rememberMe même sans session
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
        
        // Session active détectée
        const userName = sessionData.userCtx.name;
        const userRoles = sessionData.userCtx.roles || [];
        console.log('initial-load: session CouchDB active pour:', userName);
        
        // 2. Vérifier PouchDB local
        const localDb = new PouchDB('marki');
        const dbInfo = await localDb.info();
        const docCount = dbInfo.doc_count || 0;
        console.log('initial-load: PouchDB local:', docCount, 'documents');
        
        // 3. Vérifier rememberMe
        const rememberMe = localStorage.getItem('auth_remember_me') === 'true';
        
        // Déterminer si sync est nécessaire
        const needsSync = docCount === 0;
        
        // Session active avec PouchDB à jour → redirection immédiate
        if (!needsSync) {
            console.log('initial-load: PouchDB à jour → redirection vers /dashboard');
            
            // Redirection différée pour permettre le retour de la réponse
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
                    pouchDbStatus: {
                        docCount: docCount,
                        needsSync: false
                    },
                    rememberMe,
                    redirectTo: '/dashboard'
                },
                error: null
            };
        }
        
        // Session active mais PouchDB vide → sync initial requis
        console.log('initial-load: sync initial requis → affichage loading screen');
        
        // Démarrer sync initial (one-shot)
        const sync = localDb.sync(`${COUCHDB_URL}marki`, {
            live: false,    // Sync initial one-shot
            retry: true
        });
        
        // Retourner en mode sync en cours
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
                rememberMe
            },
            error: null,
            // Exposer le sync pour que l'UI puisse écouter les événements
            _sync: sync
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
