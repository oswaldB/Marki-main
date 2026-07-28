console.log('auth-submit.js loaded');

const COUCHDB_URL = 'https://dev.markidiags.com/data/';
const DB_NAME = 'marki';

/**
 * Workflow auth-submit
 * Authentifie l'utilisateur avec CouchDB et initialise la synchronisation PouchDB
 * @param {Object} context - Contexte avec localDB, remoteDB
 * @param {Object} params - Paramètres du workflow { username, password, rememberMe }
 * @returns {Promise<Object>} Résultat { success, data, error }
 */
export async function execute(context, params = {}) {
    console.log('auth-submit: démarrage authentification');
    
    const { username, password, rememberMe = false } = params;
    
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
    
    try {
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
        console.log('auth-submit: authentification réussie pour:', session.name);
        
        // 3. Vérification session CouchDB (GET /_session)
        const sessionCheck = await fetch(`${COUCHDB_URL}_session`, {
            credentials: 'include'
        });
        
        if (!sessionCheck.ok) {
            throw new Error('Échec de la vérification de session');
        }
        
        const sessionData = await sessionCheck.json();
        console.log('auth-submit: session CouchDB validée');
        
        const userCtx = sessionData.userCtx || {};
        
        // 4. Stockage session dans localStorage
        localStorage.setItem('auth_username', userCtx.name || username);
        localStorage.setItem('auth_roles', JSON.stringify(userCtx.roles || []));
        localStorage.setItem('auth_db', DB_NAME);
        localStorage.setItem('auth_remember_me', rememberMe.toString());
        localStorage.setItem('auth_last_login', new Date().toISOString());
        
        if (!rememberMe) {
            // Note: auth_username sera supprimé à la déconnexion
        }
        
        // 5. Démarrage du sync PouchDB initial (one-shot)
        const { localDB } = context;
        
        if (localDB) {
            console.log('auth-submit: sync PouchDB démarré (one-shot)');
            
            const remoteDbUrl = `${COUCHDB_URL}${DB_NAME}`;
            
            // Configuration PouchDB avec credentials
            const remoteDb = new PouchDB(remoteDbUrl, {
                fetch: (url, opts) => {
                    opts.credentials = 'include';
                    return fetch(url, opts);
                }
            });
            
            // Sync initial one-shot
            const sync = localDB.sync(remoteDb, {
                live: false,
                retry: true
            });
            
            // Écouter la progression
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
                // En cas d'erreur de sync, on redirige quand même (mode hors-ligne)
                console.log('auth-submit: redirection vers /dashboard (mode hors-ligne)');
                window.location.href = '/dashboard';
            });
        } else {
            console.log('auth-submit: pas de localDB fourni, redirection directe');
            window.location.href = '/dashboard';
        }
        
        // Retourner succès avec les données utilisateur
        return {
            success: true,
            data: {
                user: {
                    id: `user_${userCtx.name || username}`,
                    username: userCtx.name || username,
                    displayName: userCtx.name || username,
                    roles: userCtx.roles || [],
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
        console.error('auth-submit: erreur technique:', err);
        return {
            success: false,
            data: null,
            error: "Erreur technique lors de la connexion. Veuillez réessayer."
        };
    }
}
