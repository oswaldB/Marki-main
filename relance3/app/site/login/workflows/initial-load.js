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

const COUCHDB_URL = 'http://localhost:5984/';

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
        // Vérifier le cookie de session CouchDB (AuthSession)
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
        
        // Vérifier si session active
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
        
        // Session active - récupérer infos utilisateur
        const userName = sessionData.userCtx.name;
        const userRoles = sessionData.userCtx.roles || [];
        
        console.log(`initial-load: session CouchDB active pour: ${userName}`);
        
        // Vérifier PouchDB local
        const localDb = new PouchDB('marki');
        const dbInfo = await localDb.info();
        const docCount = dbInfo.doc_count || 0;
        
        console.log(`initial-load: PouchDB local: ${docCount} documents`);
        
        // Récupérer rememberMe
        const rememberMe = localStorage.getItem('auth_remember_me') === 'true';
        
        // Vérifier si sync nécessaire
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
        
        // Démarrer sync initial (one-shot)
        const sync = localDb.sync(`${COUCHDB_URL}marki`, {
            live: false,
            retry: true
        });
        
        // Attendre la fin du sync
        await new Promise((resolve, reject) => {
            sync.on('complete', (info) => {
                console.log('initial-load: sync terminé → redirection vers /dashboard');
                resolve(info);
            });
            
            sync.on('error', (err) => {
                console.error('initial-load: erreur sync', err);
                reject(err);
            });
        });
        
        // Redirection après sync
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
                    syncing: false
                },
                rememberMe: rememberMe
            },
            error: null
        };
        
    } catch (err) {
        console.error('initial-load: erreur récupération session (réponse non-JSON ou réseau)');
        console.error('initial-load error:', err);
        return {
            success: false,
            data: null,
            error: `Erreur lors de la vérification de session: ${err.message}`
        };
    }
}
