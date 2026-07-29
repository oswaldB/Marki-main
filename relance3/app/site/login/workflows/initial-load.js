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

const COUCHDB_URL = 'https://dev.markidiags.com/data/';

/**
 * Workflow initial-load
 * Vérifie si l'utilisateur possède une session active au chargement de la page
 * @param {Object} context - Contexte avec localDB, remoteDB
 * @param {Object} params - Paramètres du workflow
 * @returns {Promise<Object>} Résultat { success, data, error }
 */
export async function execute(context, params = {}) {
    console.log('initial-load: démarrage vérification session');
    
    try {
        // Étape 1: Vérifier le cookie de session CouchDB (AuthSession)
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
        
        const hasSession = sessionData?.userCtx?.name !== null && sessionData?.userCtx?.name !== undefined;
        
        // Étape 2: Pas de session active
        if (!hasSession) {
            console.log('initial-load: cookie AuthSession absent ou invalide');
            return { 
                success: true, 
                data: {
                    hasSession: false,
                    reason: 'no_session_cookie'
                }
            };
        }
        
        console.log('initial-load: session CouchDB active pour:', sessionData.userCtx.name);
        
        // Étape 3: Vérifier PouchDB local
        const localDbName = context?.localDB?.name || 'marki';
        let pouchDbStatus = {
            docCount: 0,
            lastSync: null,
            needsSync: true
        };
        
        try {
            // PouchDB est disponible globalement
            const localDb = new PouchDB(localDbName);
            const info = await localDb.info();
            pouchDbStatus.docCount = info.doc_count || 0;
            console.log('initial-load: PouchDB local:', pouchDbStatus.docCount, 'documents');
            
            // Considérer que PouchDB est à jour s'il y a des documents
            if (pouchDbStatus.docCount > 0) {
                pouchDbStatus.needsSync = false;
            }
        } catch (pouchErr) {
            console.error('initial-load: erreur PouchDB:', pouchErr.message);
            // Continuer avec needsSync: true
        }
        
        // Étape 4: Récupérer rememberMe depuis localStorage
        let rememberMe = false;
        try {
            rememberMe = localStorage.getItem('auth_remember_me') === 'true';
        } catch (e) {
            // localStorage peut être indisponible
        }
        
        // Étape 5: Décider de la navigation
        if (!pouchDbStatus.needsSync) {
            // PouchDB est à jour → redirection immédiate
            console.log('initial-load: PouchDB à jour → redirection vers /dashboard');
            
            // Redirection (sera effectuée par le caller ou ici)
            if (typeof window !== 'undefined') {
                window.location.href = '/dashboard';
            }
            
            return { 
                success: true, 
                data: {
                    hasSession: true,
                    session: {
                        name: sessionData.userCtx.name,
                        roles: sessionData.userCtx.roles || []
                    },
                    pouchDbStatus,
                    rememberMe,
                    redirectTo: '/dashboard'
                }
            };
        }
        
        // PouchDB nécessite une synchronisation
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
            }
        };
        
    } catch (err) {
        console.error('initial-load error:', err);
        return { 
            success: false, 
            error: `Erreur lors de la vérification de session: ${err.message}`
        };
    }
}
