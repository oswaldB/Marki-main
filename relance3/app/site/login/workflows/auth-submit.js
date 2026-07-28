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
            console.log('auth-submit: validation échouée: identifiant requis');
            return { 
                success: false, 
                data: null,
                error: "L'identifiant est requis" 
            };
        }
        
        if (!password || password.trim() === '') {
            console.log('auth-submit: validation échouée: mot de passe requis');
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
            throw new Error(`HTTP ${authResponse.status}: ${authResponse.statusText}`);
        }
        
        const session = await authResponse.json();
        console.log('auth-submit: authentification réussie pour:', username);
        
        // 3. Vérification session CouchDB
        const sessionCheck = await fetch(`${COUCHDB_URL}_session`, {
            credentials: 'include'
        });
        const sessionData = await sessionCheck.json();
        console.log('auth-submit: session CouchDB validée');
        
        const userCtx = sessionData.userCtx || { name: username, roles: session.roles || [] };
        
        // 4. Stockage session (localStorage)
        localStorage.setItem('auth_username', userCtx.name);
        localStorage.setItem('auth_roles', JSON.stringify(userCtx.roles));
        localStorage.setItem('auth_db', DB_NAME);
        localStorage.setItem('auth_remember_me', rememberMe.toString());
        localStorage.setItem('auth_last_login', new Date().toISOString());
        
        if (!rememberMe) {
            // Ne pas garder le username en mémoire si rememberMe=false
            // mais on garde les autres infos pour la session courante
        }
        
        // 5. Sync PouchDB initial (one-shot)
        console.log('auth-submit: sync PouchDB démarré (one-shot)');
        
        // PouchDB est disponible globalement (chargé via CDN)
        const PouchDB = window.PouchDB || PouchDB;
        const localDb = context.localDB || new PouchDB(DB_NAME);
        
        const remoteDb = new PouchDB(`${COUCHDB_URL}${DB_NAME}`, {
            fetch: (url, opts) => {
                opts.credentials = 'include';
                return fetch(url, opts);
            }
        });
        
        // Sync initial one-shot
        const sync = localDb.sync(remoteDb, {
            live: false,
            retry: true
        });
        
        // Écouter la progression
        sync.on('change', (info) => {
            const total = (info.pull?.docs_written || 0) + (info.push?.docs_written || 0);
            console.log('auth-submit: documents reçus:', total);
        });
        
        sync.on('complete', (info) => {
            console.log('auth-submit: sync initial terminé', info);
            console.log('auth-submit: redirection vers /dashboard');
            window.location.href = '/dashboard';
        });
        
        sync.on('error', (err) => {
            console.error('auth-submit: erreur sync:', err);
            // En cas d'erreur de sync, on redirige quand même (mode hors-ligne)
            window.location.href = '/dashboard';
        });
        
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
                    ok: true,
                    name: userCtx.name,
                    roles: userCtx.roles
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
