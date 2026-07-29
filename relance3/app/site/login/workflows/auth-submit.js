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

// Configuration
const COUCHDB_URL = 'https://dev.markidiags.com/data/';
const DB_NAME = 'marki';

/**
 * Workflow auth-submit
 * Authentifie l'utilisateur avec CouchDB et démarre le sync PouchDB
 * @param {Object} context - Contexte avec localDB, remoteDB
 * @param {Object} params - Paramètres du workflow { username, password, rememberMe }
 * @returns {Promise<Object>} Résultat { success, data, error }
 */
export async function execute(context, params = {}) {
    console.log('auth-submit: démarrage authentification', params);
    
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
        
        const trimmedUsername = username.trim();
        console.log('auth-submit: tentative connexion pour:', trimmedUsername);
        
        // 2. Authentification CouchDB (Cookie Authentication)
        const authResponse = await fetch(`${COUCHDB_URL}_session`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ name: trimmedUsername, password })
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
        const sessionData = await sessionCheck.json();
        console.log('auth-submit: session CouchDB validée');
        
        // 4. Stockage session dans localStorage
        localStorage.setItem('auth_username', sessionData.userCtx.name);
        localStorage.setItem('auth_roles', JSON.stringify(sessionData.userCtx.roles));
        localStorage.setItem('auth_db', DB_NAME);
        localStorage.setItem('auth_remember_me', rememberMe.toString());
        localStorage.setItem('auth_last_login', new Date().toISOString());
        
        if (!rememberMe) {
            // Marquer pour suppression au prochain chargement
            localStorage.setItem('auth_temp_session', 'true');
        }
        
        // 5. Démarrer le sync PouchDB (one-shot initial)
        console.log('auth-submit: sync PouchDB démarré (one-shot)');
        
        // PouchDB est disponible globalement (chargé via CDN)
        const localDb = context.localDB || new PouchDB(DB_NAME);
        const remoteDb = new PouchDB(`${COUCHDB_URL}${DB_NAME}`, {
            fetch: (url, opts) => {
                opts.credentials = 'include';
                return fetch(url, opts);
            }
        });
        
        // Sync initial avec suivi
        return new Promise((resolve) => {
            const sync = localDb.sync(remoteDb, {
                live: false,
                retry: true
            });
            
            sync.on('change', (info) => {
                console.log('auth-submit: documents reçus:', info.pull?.docs_read || 0);
            });
            
            sync.on('complete', (info) => {
                console.log('auth-submit: sync initial terminé', info);
                console.log('auth-submit: redirection vers /dashboard');
                
                // Redirection vers dashboard
                window.location.href = '/dashboard';
                
                resolve({
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
                        rememberMe,
                        syncInfo: info
                    },
                    error: null
                });
            });
            
            sync.on('error', (err) => {
                console.error('auth-submit: erreur sync:', err);
                
                // En cas d'erreur de sync, on redirige quand même (mode hors-ligne)
                console.log('auth-submit: redirection vers /dashboard (mode hors-ligne)');
                window.location.href = '/dashboard';
                
                resolve({
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
                        rememberMe,
                        offline: true
                    },
                    error: null
                });
            });
        });
        
    } catch (err) {
        console.error('auth-submit: erreur technique:', err);
        return {
            success: false,
            data: null,
            error: "Erreur technique lors de la connexion. Veuillez réessayer."
        };
    }
}
