console.log('auth-submit.js loaded');

const COUCHDB_URL = 'https://dev.markidiags.com/data/';
const DB_NAME = 'marki';

/**
 * Workflow auth-submit
 * Authentifie l'utilisateur avec CouchDB et démarre le sync PouchDB
 * @param {Object} context - Contexte avec localDB
 * @param {Object} params - Paramètres du workflow { username, password, rememberMe }
 * @returns {Promise<Object>} Résultat { success, data, error }
 */
export async function execute(context, params = {}) {
    console.log('auth-submit: démarrage authentification', params);
    
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
        
        const sessionResult = await authResponse.json();
        console.log('auth-submit: authentification réussie pour:', username);
        
        // 3. Vérification de session
        const sessionCheck = await fetch(`${COUCHDB_URL}_session`, {
            credentials: 'include'
        });
        
        if (!sessionCheck.ok) {
            throw new Error('Impossible de vérifier la session');
        }
        
        const sessionData = await sessionCheck.json();
        console.log('auth-submit: session CouchDB validée');
        
        // 4. Stockage dans localStorage
        localStorage.setItem('auth_username', sessionData.userCtx.name);
        localStorage.setItem('auth_roles', JSON.stringify(sessionData.userCtx.roles));
        localStorage.setItem('auth_db', DB_NAME);
        localStorage.setItem('auth_remember_me', rememberMe.toString());
        localStorage.setItem('auth_last_login', new Date().toISOString());
        
        if (!rememberMe) {
            localStorage.removeItem('auth_username');
        }
        
        // 5. Démarrage du sync PouchDB initial (one-shot)
        const localDb = context.localDB || new PouchDB(DB_NAME);
        
        const remoteDb = new PouchDB(`${COUCHDB_URL}${DB_NAME}`, {
            fetch: (url, opts) => {
                opts.credentials = 'include';
                return fetch(url, opts);
            }
        });
        
        console.log('auth-submit: sync PouchDB démarré (one-shot)');
        
        // Sync initial one-shot
        const sync = localDb.sync(remoteDb, {
            live: false,
            retry: true
        });
        
        // Écouter la progression
        sync.on('change', (info) => {
            const total = info.push?.docs_written || 0 + info.pull?.docs_written || 0;
            console.log('auth-submit: documents reçus:', total);
        });
        
        sync.on('complete', (info) => {
            console.log('auth-submit: sync initial terminé', info);
            console.log('auth-submit: redirection vers /dashboard');
            window.location.href = '/dashboard';
        });
        
        sync.on('error', (err) => {
            console.error('auth-submit: erreur sync:', err);
        });
        
        // Retourner succès avec les données utilisateur
        return {
            success: true,
            data: {
                user: {
                    id: sessionData.userCtx.name,
                    username: sessionData.userCtx.name,
                    displayName: sessionData.userCtx.name,
                    roles: sessionData.userCtx.roles,
                    db: DB_NAME
                },
                session: {
                    ok: sessionResult.ok,
                    name: sessionResult.name,
                    roles: sessionResult.roles
                },
                rememberMe
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
