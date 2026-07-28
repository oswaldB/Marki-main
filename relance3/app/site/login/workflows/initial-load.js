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
 * Vérifie si l'utilisateur possède une session active au chargement de la page login.
 * @param {Object} context - Contexte avec localDB, remoteDB, couchDbUrl
 * @param {Object} params - Paramètres du workflow (aucun requis)
 * @returns {Promise<Object>} Résultat { success, data, error }
 */
export async function execute(context, params = {}) {
    console.log('initial-load: démarrage vérification session');
    
    try {
        const { localDB, couchDbUrl } = context;
        
        // Vérifier le cookie de session CouchDB (AuthSession)
        console.log('initial-load: vérification cookie AuthSession');
        
        const sessionResponse = await fetch(`${couchDbUrl}_session`, {
            credentials: 'include'
        });
        
        if (!sessionResponse.ok) {
            throw new Error(`Erreur HTTP ${sessionResponse.status} lors de la vérification de session`);
        }
        
        const sessionData = await sessionResponse.json();
        const userName = sessionData.userCtx?.name;
        const userRoles = sessionData.userCtx?.roles || [];
        
        // Pas de session active
        if (!userName) {
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
        
        console.log(`initial-load: session CouchDB active pour: ${userName}`);
        
        // Vérifier PouchDB local
        const pouchInfo = await localDB.info();
        const docCount = pouchInfo.doc_count || 0;
        console.log(`initial-load: PouchDB local: ${docCount} documents`);
        
        // Récupérer rememberMe depuis localStorage
        const rememberMe = localStorage.getItem('auth_remember_me') === 'true';
        
        const session = {
            name: userName,
            roles: userRoles
        };
        
        // PouchDB est déjà à jour (a des documents)
        if (docCount > 0) {
            console.log('initial-load: PouchDB à jour → redirection vers /dashboard');
            
            // Redirection immédiate
            window.location.href = '/dashboard';
            
            return { 
                success: true, 
                data: {
                    hasSession: true,
                    session: session,
                    pouchDbStatus: {
                        docCount: docCount,
                        lastSync: new Date().toISOString(),
                        needsSync: false
                    },
                    rememberMe: rememberMe,
                    redirectTo: "/dashboard"
                },
                error: null
            };
        }
        
        // PouchDB vide - besoin de sync initial
        console.log('initial-load: sync initial requis → affichage loading screen');
        
        // Démarrer sync initial (one-shot)
        const sync = localDB.sync(`${couchDbUrl}marki`, {
            live: false,
            retry: true
        });
        
        // Écouter les événements de sync
        sync.on('complete', () => {
            console.log('initial-load: sync terminé → redirection vers /dashboard');
            window.location.href = '/dashboard';
        });
        
        sync.on('error', (err) => {
            console.error('initial-load: erreur de sync', err);
            // Option: rediriger quand même en mode hors-ligne
            // window.location.href = '/dashboard';
        });
        
        // Retourner l'état de sync en cours
        return { 
            success: true, 
            data: {
                hasSession: true,
                session: session,
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
