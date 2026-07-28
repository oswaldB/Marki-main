console.log('auth-submit.js loaded');

const COUCHDB_URL = 'https://dev.markidiags.com/data/';
const DB_NAME = 'marki';

/**
 * Workflow auth-submit
 * Authentifie l'utilisateur avec CouchDB et initialise la synchronisation PouchDB
 * @param {Object} context - Contexte avec localDB, remoteDB
 * @param {Object} params - Paramètres du workflow { name, password, rememberMe }
 * @returns {Promise<Object>} Résultat { success, data, error }
 */
export async function execute(context, params = {}) {
    console.log('auth-submit: démarrage authentification');
    
    const { name, password, rememberMe = false } = params;
    
    try {
        // 1. Validation des entrées
        if (!name || name.trim() === '') {
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
        
        // 2. Authentification CouchDB
        console.log(`auth-submit: tentative connexion pour: ${name}`);
        
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
            throw new Error(`HTTP ${authResponse.status}: ${authResponse.statusText}`);
        }
        
        const session = await authResponse.json();
        console.log(`auth-submit: authentification réussie pour: ${name}`);
        
        // 3. Vérification session active
        const sessionCheck = await fetch(`${COUCHDB_URL}_session`, {
            credentials: 'include'
        });
        
        if (!sessionCheck.ok) {
            throw new Error('Session validation failed');
        }
        
        const validatedSession = await sessionCheck.json();
        console.log('auth-submit: session CouchDB validée');
        
        // 4. Stockage session dans localStorage
        localStorage.setItem('auth_name', validatedSession.userCtx.name);
        localStorage.setItem('auth_roles', JSON.stringify(validatedSession.userCtx.roles));
        localStorage.setItem('auth_db', DB_NAME);
        localStorage.setItem('auth_remember_me', rememberMe.toString());
        localStorage.setItem('auth_last_login', new Date().toISOString());
        
        // 5. Démarrage sync PouchDB si localDB disponible dans le contexte
        if (context?.localDB) {
            const remoteDbUrl = `${COUCHDB_URL}${DB_NAME}`;
            
            const sync = context.localDB.sync(remoteDbUrl, {
                live: true,
                retry: true,
                ajax: { credentials: 'include' }
            });
            
            sync.on('change', (info) => console.log('auth-submit: sync change:', info));
            sync.on('paused', () => console.log('auth-submit: sync paused'));
            sync.on('active', () => console.log('auth-submit: sync active'));
            sync.on('error', (err) => console.error('auth-submit: erreur sync:', err));
            
            console.log('auth-submit: sync PouchDB démarré (live: true)');
            
            // Stocker le handler de sync dans le contexte pour pouvoir l'arrêter plus tard
            context.syncHandler = sync;
        }
        
        // 6. Construction de la réponse
        const user = {
            id: `user_${validatedSession.userCtx.name}`,
            name: validatedSession.userCtx.name,
            displayName: validatedSession.userCtx.name,
            roles: validatedSession.userCtx.roles,
            db: DB_NAME
        };
        
        return {
            success: true,
            data: {
                user,
                session: {
                    ok: session.ok,
                    name: session.name,
                    roles: session.roles
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
