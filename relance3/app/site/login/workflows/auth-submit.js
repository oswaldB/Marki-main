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

const COUCHDB_URL = 'https://dev.markidiags.com/data/';
const DB_NAME = 'marki';

console.log('auth-submit.js loaded');

/**
 * Workflow auth-submit
 * Authentifie l'utilisateur avec CouchDB et démarre le sync PouchDB
 * @param {Object} context - Contexte avec localDB, remoteDB
 * @param {Object} params - Paramètres du workflow
 * @param {string} params.username - Identifiant
 * @param {string} params.password - Mot de passe
 * @param {boolean} params.rememberMe - Se souvenir de moi
 * @returns {Promise<Object>} Résultat { success, data, error }
 */
export async function execute(context, params = {}) {
    console.log('auth-submit: démarrage authentification');
    
    const { username, password, rememberMe = false } = params;
    
    try {
        // 1. Validation des entrées
        if (!username) {
            console.log('auth-submit: validation échouée: identifiant requis');
            return {
                success: false,
                data: null,
                error: "L'identifiant est requis"
            };
        }
        
        if (!password) {
            console.log('auth-submit: validation échouée: mot de passe requis');
            return {
                success: false,
                data: null,
                error: "Le mot de passe est requis"
            };
        }
        
        // 2. Authentification CouchDB
        console.log('auth-submit: tentative connexion pour:', username);
        
        const authResponse = await fetch(`${COUCHDB_URL}_session`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ name: username, password })
        });
        
        if (authResponse.status === 401) {
            console.log('auth-submit: identifiants invalides (401)');
            return {
                success: false,
                data: null,
                error: "Identifiant ou mot de passe incorrect"
            };
        }
        
        if (!authResponse.ok) {
            throw new Error(`Erreur HTTP ${authResponse.status}`);
        }
        
        const session = await authResponse.json();
        console.log('auth-submit: authentification réussie pour:', session.name);
        
        // 3. Vérification de la session CouchDB
        const sessionCheck = await fetch(`${COUCHDB_URL}_session`, {
            credentials: 'include'
        });
        
        if (!sessionCheck.ok) {
            throw new Error('Session validation failed');
        }
        
        const sessionData = await sessionCheck.json();
        console.log('auth-submit: session CouchDB validée');
        
        const userCtx = sessionData.userCtx;
        
        // 4. Stockage session dans localStorage
        localStorage.setItem('auth_username', userCtx.name);
        localStorage.setItem('auth_roles', JSON.stringify(userCtx.roles));
        localStorage.setItem('auth_db', DB_NAME);
        localStorage.setItem('auth_remember_me', rememberMe.toString());
        localStorage.setItem('auth_last_login', new Date().toISOString());
        
        // Supprimer auth_username si rememberMe=false
        if (!rememberMe) {
            localStorage.removeItem('auth_username');
        }
        
        // 5. Démarrer le sync PouchDB initial (one-shot)
        console.log('auth-submit: sync PouchDB démarré (one-shot)');
        
        // PouchDB est disponible globalement (chargé via CDN)
        const localDb = new PouchDB(DB_NAME);
        const remoteDb = new PouchDB(`${COUCHDB_URL}${DB_NAME}`, {
            fetch: (url, opts) => {
                opts.credentials = 'include';
                return fetch(url, opts);
            }
        });
        
        // Lancer le sync initial (one-shot)
        const syncResult = await localDb.sync(remoteDb, {
            live: false,
            retry: true
        });
        
        console.log('auth-submit: documents reçus:', syncResult.pull?.docs_read || 0);
        console.log('auth-submit: sync initial terminé');
        
        // 6. Redirection vers le dashboard
        console.log('auth-submit: redirection vers /dashboard');
        window.location.href = '/dashboard';
        
        return {
            success: true,
            data: {
                user: {
                    id: `user_${userCtx.name}`,
                    username: userCtx.name,
                    displayName: userCtx.name,
                    roles: userCtx.roles,
                    db: DB_NAME
                },
                session: {
                    ok: session.ok,
                    name: session.name,
                    roles: session.roles
                },
                rememberMe: rememberMe
            },
            error: null
        };
        
    } catch (err) {
        console.error('auth-submit: erreur sync:', err.message);
        return {
            success: false,
            data: null,
            error: "Erreur technique lors de la connexion. Veuillez réessayer."
        };
    }
}
