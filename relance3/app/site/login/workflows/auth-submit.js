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
    
    const { name, password, rememberMe = false } = params;
    
    // 1. Validation des entrées
    if (!name || name.trim() === '') {
        console.log('auth-submit: validation échouée: L\'identifiant est requis');
        return {
            success: false,
            data: null,
            error: "L'identifiant est requis"
        };
    }
    
    if (!password) {
        console.log('auth-submit: validation échouée: Le mot de passe est requis');
        return {
            success: false,
            data: null,
            error: "Le mot de passe est requis"
        };
    }
    
    try {
        console.log('auth-submit: tentative connexion pour:', name);
        
        // 2. Authentification CouchDB
        const authResponse = await fetch(`${COUCHDB_URL}_session`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ name, password })
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
            throw new Error(`HTTP ${authResponse.status}`);
        }
        
        const session = await authResponse.json();
        console.log('auth-submit: authentification réussie pour:', name);
        
        // 3. Vérification session active
        const sessionCheck = await fetch(`${COUCHDB_URL}_session`, {
            credentials: 'include'
        });
        const sessionData = await sessionCheck.json();
        console.log('auth-submit: session CouchDB validée');
        
        // 4. Démarrage du sync PouchDB
        const localDb = context.localDB || new PouchDB(DB_NAME);
        const remoteDb = new PouchDB(`${COUCHDB_URL}${DB_NAME}`, {
            fetch: (url, opts) => {
                opts.credentials = 'include';
                return fetch(url, opts);
            }
        });
        
        const sync = localDb.sync(remoteDb, {
            live: true,
            retry: true
        });
        
        // Écouter les événements de sync
        sync.on('change', (info) => console.log('auth-submit: sync change:', info));
        sync.on('paused', () => console.log('auth-submit: sync paused'));
        sync.on('active', () => console.log('auth-submit: sync active'));
        sync.on('error', (err) => console.error('auth-submit: erreur sync:', err));
        
        console.log('auth-submit: sync PouchDB démarré (live: true)');
        
        // 5. Stockage session
        localStorage.setItem('auth_name', sessionData.name || name);
        localStorage.setItem('auth_roles', JSON.stringify(sessionData.roles || []));
        localStorage.setItem('auth_db', DB_NAME);
        localStorage.setItem('auth_remember_me', rememberMe.toString());
        localStorage.setItem('auth_last_login', new Date().toISOString());
        
        // Supprimer auth_name si rememberMe = false
        if (!rememberMe) {
            localStorage.removeItem('auth_name');
        }
        
        // 6. Retour succès
        return {
            success: true,
            data: {
                user: {
                    id: `user_${sessionData.name || name}`,
                    name: sessionData.name || name,
                    displayName: sessionData.name || name,
                    roles: sessionData.roles || [],
                    db: DB_NAME
                },
                session: {
                    ok: true,
                    name: sessionData.name || name,
                    roles: sessionData.roles || []
                },
                rememberMe
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
