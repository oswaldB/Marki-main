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
 * @param {Object} context - Contexte avec localDB, remoteDB
 * @param {Object} params - Paramètres du workflow
 * @returns {Promise<Object>} Résultat { success, data, error }
 */
export async function execute(context, params = {}) {
    console.log('auth-submit: démarrage authentification');
    
    const { username, password, rememberMe = false } = params;
    
    try {
        // 1. Validation des entrées
        if (!username || username.trim() === '') {
            console.log('auth-submit: validation échouée: L\'identifiant est requis');
            return {
                success: false,
                data: null,
                error: "L'identifiant est requis"
            };
        }
        
        if (!password || password.trim() === '') {
            console.log('auth-submit: validation échouée: Le mot de passe est requis');
            return {
                success: false,
                data: null,
                error: "Le mot de passe est requis"
            };
        }
        
        // 2. Authentification CouchDB (Cookie Authentication)
        console.log('auth-submit: tentative connexion pour:', username);
        
        const authResponse = await fetch(`${COUCHDB_URL}_session`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ name: username, password })
        });
        
        if (!authResponse.ok) {
            if (authResponse.status === 401) {
                console.log('auth-submit: identifiants invalides (401)');
                return {
                    success: false,
                    data: null,
                    error: "Identifiant ou mot de passe incorrect"
                };
            }
            throw new Error(`HTTP ${authResponse.status}: ${authResponse.statusText}`);
        }
        
        const sessionResult = await authResponse.json();
        console.log('auth-submit: authentification réussie pour:', sessionResult.name);
        
        // 3. Vérification session CouchDB (GET /_session)
        const sessionCheck = await fetch(`${COUCHDB_URL}_session`, {
            credentials: 'include'
        });
        
        if (!sessionCheck.ok) {
            throw new Error('Échec de la vérification de session');
        }
        
        const sessionData = await sessionCheck.json();
        console.log('auth-submit: session CouchDB validée');
        
        // 4. Stockage session (localStorage)
        localStorage.setItem('auth_username', sessionData.userCtx.name);
        localStorage.setItem('auth_roles', JSON.stringify(sessionData.userCtx.roles));
        localStorage.setItem('auth_db', DB_NAME);
        localStorage.setItem('auth_remember_me', rememberMe.toString());
        localStorage.setItem('auth_last_login', new Date().toISOString());
        
        // 5. Démarrage du sync PouchDB (initial one-shot)
        console.log('auth-submit: sync PouchDB démarré (one-shot)');
        
        // PouchDB est disponible globalement (chargé via CDN)
        const localDb = context.localDB || new PouchDB(DB_NAME);
        
        const remoteDb = new PouchDB(`${COUCHDB_URL}${DB_NAME}`, {
            fetch: (url, opts) => {
                opts.credentials = 'include';
                return fetch(url, opts);
            }
        });
        
        // Sync initial one-shot
        const syncResult = await new Promise((resolve, reject) => {
            const sync = localDb.sync(remoteDb, {
                live: false,
                retry: true
            });
            
            sync.on('change', (info) => {
                const docsReceived = info.pull?.docs_read || 0;
                console.log('auth-submit: documents reçus:', docsReceived);
            });
            
            sync.on('complete', (info) => {
                console.log('auth-submit: sync initial terminé');
                resolve(info);
            });
            
            sync.on('error', (err) => {
                console.error('auth-submit: erreur sync:', err);
                reject(err);
            });
        });
        
        console.log('auth-submit: redirection vers /dashboard');
        
        // Redirection vers le dashboard
        window.location.href = '/dashboard';
        
        return {
            success: true,
            data: {
                user: {
                    id: `user_${sessionData.userCtx.name}`,
                    username: sessionData.userCtx.name,
                    displayName: sessionData.userCtx.name,
                    roles: sessionData.userCtx.roles,
                    db: DB_NAME
                },
                session: {
                    ok: true,
                    name: sessionData.userCtx.name,
                    roles: sessionData.userCtx.roles
                },
                rememberMe: rememberMe
            },
            error: null
        };
        
    } catch (err) {
        console.error('auth-submit error:', err);
        return {
            success: false,
            data: null,
            error: "Erreur technique lors de la connexion. Veuillez réessayer."
        };
    }
}
