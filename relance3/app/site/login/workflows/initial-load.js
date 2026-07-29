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

// URL CouchDB depuis le contexte ou valeur par défaut
const getCouchDbUrl = (context) => context?.remoteDB?.url || window.MARKI_CONFIG?.COUCHDB_URL || 'http://localhost:5984/';

/**
 * Workflow initial-load
 * Vérifie si l'utilisateur possède une session active au chargement de la page login
 * @param {Object} context - Contexte avec localDB, remoteDB, etc.
 * @param {Object} params - Paramètres du workflow
 * @returns {Promise<Object>} Résultat { success, data, error }
 */
export async function execute(context, params = {}) {
    console.log('initial-load: démarrage vérification session');
    
    try {
        const COUCHDB_URL = getCouchDbUrl(context);
        
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
        if (!sessionData?.userCtx?.name) {
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
        const userRoles = sessionData.userCtx.roles || [];
        console.log('initial-load: session CouchDB active pour:', userName);
        
        // 2. Vérifier PouchDB local (fallback)
        let pouchDbStatus = {
            docCount: 0,
            needsSync: true,
            syncing: false
        };
        
        try {
            // PouchDB est disponible globalement via CDN
            const localDb = new PouchDB('marki');
            const info = await localDb.info();
            pouchDbStatus.docCount = info.doc_count || 0;
            console.log('initial-load: PouchDB local:', pouchDbStatus.docCount, 'documents');
            
            // Vérifier si une sync est nécessaire (pas de documents locaux)
            pouchDbStatus.needsSync = pouchDbStatus.docCount === 0;
            
        } catch (pouchError) {
            console.error('initial-load: erreur PouchDB:', pouchError.message);
            // Continuer sans PouchDB
        }
        
        // 3. Récupérer rememberMe
        let rememberMe = false;
        try {
            rememberMe = localStorage.getItem('auth_remember_me') === 'true';
        } catch (e) {
            // localStorage non disponible
        }
        
        // Cas 1: PouchDB à jour → redirection immédiate
        if (!pouchDbStatus.needsSync) {
            const lastSync = localStorage.getItem('marki_last_sync') || new Date().toISOString();
            
            console.log('initial-load: PouchDB à jour → redirection vers /dashboard');
            
            // Retourner le résultat avec redirect
            return {
                success: true,
                data: {
                    hasSession: true,
                    session: {
                        name: userName,
                        roles: userRoles
                    },
                    pouchDbStatus: {
                        docCount: pouchDbStatus.docCount,
                        lastSync: lastSync,
                        needsSync: false
                    },
                    rememberMe: rememberMe,
                    redirectTo: '/dashboard'
                },
                error: null
            };
        }
        
        // Cas 2: Sync initial requis → affichage loading screen
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
        return {
            success: false,
            data: null,
            error: `Erreur lors de la vérification de session: ${err.message}`
        };
    }
}
