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
 * Authentifie l'utilisateur avec CouchDB et démarre la synchro PouchDB
 * @param {Object} context - Contexte avec localDB, remoteDB
 * @param {Object} params - Paramètres du workflow { username, password, rememberMe }
 * @returns {Promise<Object>} Résultat { success, data, error }
 */
export async function execute(context, params = {}) {
    console.log('auth-submit: démarrage authentification');
    
    const { username, password, rememberMe = false } = params;
    
    try {
        // 1. Validation des entrées
        if (!username || username.trim() === '') {
            console.log('auth-submit: validation échouée: username requis');
            return { 
                success: false, 
                data: null,
                error: "L'identifiant est requis" 
            };
        }
        
        if (!password || password.trim() === '') {
            console.log('auth-submit: validation échouée: password requis');
            return { 
                success: false, 
                data: null,
                error: "Le mot de passe est requis" 
            };
        }
        
        console.log('auth-submit: tentative connexion pour:', username);
        
        // 2. Authentification CouchDB (Cookie Authentication)
        const authResponse = await fetch(`${COUCHDB_URL}_session`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',  // Important: reçoit le cookie AuthSession
            body: JSON.stringify({ name: username, password: password })
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
            throw new Error(`HTTP ${authResponse.status}: ${authResponse.statusText}`);
        }
        
        const sessionData = await authResponse.json();
        console.log('auth-submit: authentification réussie pour:', sessionData.name);
        
        // 3. Vérification de la session
        const sessionCheck = await fetch(`${COUCHDB_URL}_session`, {
            credentials: 'include'
        });
        
        if (!sessionCheck.ok) {
            throw new Error('Session validation failed');
        }
        
        const sessionInfo = await sessionCheck.json();
        const userCtx = sessionInfo.userCtx;
        
        if (!userCtx || !userCtx.name) {
            throw new Error('Session invalide');
        }
        
        console.log('auth-submit: session CouchDB validée');
        
        // 4. Stockage session dans localStorage
        localStorage.setItem('auth_username', userCtx.name);
        localStorage.setItem('auth_roles', JSON.stringify(userCtx.roles || []));
        localStorage.setItem('auth_db', DB_NAME);
        localStorage.setItem('auth_remember_me', rememberMe.toString());
        localStorage.setItem('auth_last_login', new Date().toISOString());
        
        // Si rememberMe=false, on supprime auth_username pour ne pas persister
        if (!rememberMe) {
            localStorage.removeItem('auth_username');
        }
        
        // 5. Démarrage du sync PouchDB (one-shot initial)
        // PouchDB est disponible globalement (chargé via CDN)
        const localDb = context?.localDB || new PouchDB(DB_NAME);
        
        const remoteDb = new PouchDB(`${COUCHDB_URL}${DB_NAME}`, {
            fetch: (url, opts) => {
                opts.credentials = 'include';
                return fetch(url, opts);
            }
        });
        
        console.log('auth-submit: sync PouchDB démarré (one-shot)');
        
        // Sync initial (one-shot)
        const sync = localDb.sync(remoteDb, {
            live: false,
            retry: true
        });
        
        // Écouter les événements de sync
        sync.on('change', (info) => {
            const docsReceived = info.pull?.docs_read || 0;
            console.log('auth-submit: documents reçus:', docsReceived);
        });
        
        sync.on('complete', (info) => {
            console.log('auth-submit: sync initial terminé');
            console.log('auth-submit: redirection vers /dashboard');
            window.location.href = '/dashboard';
        });
        
        sync.on('error', (err) => {
            console.error('auth-submit: erreur sync:', err);
        });
        
        // Retourner succès immédiatement (le sync continue en arrière-plan)
        return { 
            success: true, 
            data: {
                user: {
                    id: userCtx.name,
                    username: userCtx.name,
                    displayName: userCtx.name,
                    roles: userCtx.roles || [],
                    db: DB_NAME
                },
                session: {
                    ok: true,
                    name: userCtx.name,
                    roles: userCtx.roles || []
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
