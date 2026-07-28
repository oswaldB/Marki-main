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
    
    try {
        const { name, password, rememberMe = false } = params;
        
        // 1. Validation des entrées
        if (!name) {
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
        
        // 2. Authentification CouchDB
        console.log(`auth-submit: tentative connexion pour: ${name}`);
        
        const response = await fetch(`${COUCHDB_URL}_session`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ name, password })
        });
        
        if (response.status === 401) {
            console.log('auth-submit: identifiants invalides (401)');
            return {
                success: false,
                data: null,
                error: "Identifiant ou mot de passe incorrect"
            };
        }
        
        if (!response.ok) {
            throw new Error(`Erreur HTTP ${response.status}`);
        }
        
        // 3. Vérifier la session active
        const sessionCheck = await fetch(`${COUCHDB_URL}_session`, {
            credentials: 'include'
        });
        
        if (!sessionCheck.ok) {
            throw new Error('Échec de vérification de session');
        }
        
        const session = await sessionCheck.json();
        console.log(`auth-submit: authentification réussie pour: ${session.name}`);
        console.log('auth-submit: session CouchDB validée');
        
        // 4. Démarrer le sync PouchDB
        const localDb = context.localDB || new context.PouchDB(DB_NAME);
        
        try {
            const sync = localDb.sync(`${COUCHDB_URL}${DB_NAME}`, {
                live: true,
                retry: true,
                ajax: { credentials: 'include' }
            });
            
            sync.on('change', (info) => console.log('Sync change:', info));
            sync.on('paused', (err) => console.log('Sync paused'));
            sync.on('active', () => console.log('Sync active'));
            sync.on('error', (err) => console.error('auth-submit: erreur sync:', err));
            
            console.log('auth-submit: sync PouchDB démarré (live: true)');
            
            // Stocker le handler dans le contexte pour pouvoir l'arrêter plus tard
            if (context.syncHandlers) {
                context.syncHandlers.set(DB_NAME, sync);
            }
        } catch (syncErr) {
            console.error('auth-submit: erreur sync:', syncErr);
        }
        
        // 5. Stockage session localStorage
        localStorage.setItem('auth_name', session.name);
        localStorage.setItem('auth_roles', JSON.stringify(session.roles || []));
        localStorage.setItem('auth_db', DB_NAME);
        localStorage.setItem('auth_remember_me', rememberMe.toString());
        localStorage.setItem('auth_last_login', new Date().toISOString());
        
        if (!rememberMe) {
            localStorage.removeItem('auth_name');
        }
        
        // 6. Retourner le résultat
        return { 
            success: true, 
            data: {
                user: {
                    id: `user_${session.name}`,
                    name: session.name,
                    displayName: session.name,
                    roles: session.roles || [],
                    db: DB_NAME
                },
                session: {
                    ok: true,
                    name: session.name,
                    roles: session.roles || []
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
