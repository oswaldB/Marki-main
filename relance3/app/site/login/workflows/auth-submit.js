/*
INSTRUCTIONS IA - À APPLIQUER:
=============================

PRIORITÉ ABSOLUE: LIT EN PREMIER .specs/page-specs.md

1. NOM DU WORKFLOW: auth-submit

2. SPECS: Implémenter selon:
   - .specs/wf-frontend/auth-submit.md
   - /home/ubuntu/marki/relance3/app/site/login/.specs/wf-frontend/auth-submit.md

3. FONCTION: Export nommé execute(context, params) qui:
   - Prend context (avec localDB, remoteDB, etc.)
   - Prend params (paramètres du workflow)
   - Retourne { success: true/false, data: {}, error: string }

4. CONSOLE: Logger 'auth-submit.js loaded' au chargement
*/

console.log('auth-submit.js loaded');

const COUCHDB_URL = 'https://dev.markidiags.com/data/';
const DB_NAME = 'marki';

/**
 * Workflow auth-submit
 * Authentifie l'utilisateur avec CouchDB et initialise la synchronisation PouchDB
 * @param {Object} context - Contexte avec localDB, remoteDB
 * @param {Object} params - Paramètres du workflow
 * @returns {Promise<Object>} Résultat { success, data, error }
 */
export async function execute(context, params = {}) {
    console.log('auth-submit: démarrage authentification');
    
    const { username, password, rememberMe = false } = params;
    
    try {
        // 1. Validation des entrées
        if (!username) {
            console.log('auth-submit: validation échouée: identifiant requis');
            return { success: false, data: null, error: "L'identifiant est requis" };
        }
        
        if (!password) {
            console.log('auth-submit: validation échouée: mot de passe requis');
            return { success: false, data: null, error: "Le mot de passe est requis" };
        }
        
        console.log(`auth-submit: tentative connexion pour: ${username}`);
        
        // 2. Authentification CouchDB
        const authResponse = await fetch(`${COUCHDB_URL}_session`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ name: username, password })
        });
        
        if (authResponse.status === 401) {
            console.log('auth-submit: identifiants invalides (401)');
            return { success: false, data: null, error: "Identifiant ou mot de passe incorrect" };
        }
        
        if (!authResponse.ok) {
            throw new Error(`Erreur HTTP ${authResponse.status}`);
        }
        
        const sessionResult = await authResponse.json();
        console.log(`auth-submit: authentification réussie pour: ${username}`);
        
        // 3. Vérification session CouchDB
        const sessionCheck = await fetch(`${COUCHDB_URL}_session`, {
            credentials: 'include'
        });
        
        if (!sessionCheck.ok) {
            throw new Error('Échec vérification session');
        }
        
        const sessionData = await sessionCheck.json();
        console.log('auth-submit: session CouchDB validée');
        
        // 4. Démarrer sync PouchDB si localDB disponible dans le contexte
        let syncHandler = null;
        if (context?.localDB) {
            const remoteDbUrl = `${COUCHDB_URL}${DB_NAME}`;
            syncHandler = context.localDB.sync(remoteDbUrl, {
                live: true,
                retry: true,
                ajax: { credentials: 'include' }
            });
            
            syncHandler.on('change', (info) => console.log('auth-submit: sync change:', info));
            syncHandler.on('paused', () => console.log('auth-submit: sync paused'));
            syncHandler.on('active', () => console.log('auth-submit: sync active'));
            syncHandler.on('error', (err) => console.error('auth-submit: erreur sync:', err));
            
            console.log('auth-submit: sync PouchDB démarré (live: true)');
        }
        
        // 5. Stockage session localStorage
        localStorage.setItem('auth_username', sessionData.userCtx?.name || username);
        localStorage.setItem('auth_roles', JSON.stringify(sessionData.userCtx?.roles || sessionResult.roles || []));
        localStorage.setItem('auth_db', DB_NAME);
        localStorage.setItem('auth_remember_me', rememberMe.toString());
        localStorage.setItem('auth_last_login', new Date().toISOString());
        
        if (!rememberMe) {
            // Si rememberMe=false, on supprime l'username mais garde les autres infos temporaires
            localStorage.removeItem('auth_username');
        }
        
        return {
            success: true,
            data: {
                user: {
                    id: `user_${sessionData.userCtx?.name || username}`,
                    username: sessionData.userCtx?.name || username,
                    displayName: sessionData.userCtx?.name || username,
                    roles: sessionData.userCtx?.roles || sessionResult.roles || [],
                    db: DB_NAME
                },
                session: {
                    ok: true,
                    name: sessionData.userCtx?.name || username,
                    roles: sessionData.userCtx?.roles || sessionResult.roles || []
                },
                rememberMe: rememberMe
            },
            error: null
        };
        
    } catch (err) {
        console.error('auth-submit: erreur technique:', err);
        return { 
            success: false, 
            data: null,
            error: "Erreur technique lors de la connexion. Veuillez réessayer."
        };
    }
}
