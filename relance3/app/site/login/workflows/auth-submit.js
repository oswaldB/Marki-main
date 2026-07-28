console.log('auth-submit.js loaded');

const COUCHDB_URL = 'https://dev.markidiags.com/data/';
const DB_NAME = 'marki';

/**
 * Workflow auth-submit
 * Authentifie l'utilisateur avec CouchDB et démarre la synchro PouchDB
 * @param {Object} context - Contexte avec localDB, remoteDB
 * @param {Object} params - Paramètres du workflow { name, password, rememberMe }
 * @returns {Promise<Object>} Résultat { success, data, error }
 */
export async function execute(context, params = {}) {
    console.log('auth-submit: démarrage authentification');
    
    try {
        // Extraction des paramètres (supporte name ou username)
        const name = params.name || params.username;
        const { password, rememberMe = false } = params;
        
        // 1. Validation des entrées
        if (!name || name.trim() === '') {
            console.log('auth-submit: validation échouée: identifiant manquant');
            return {
                success: false,
                data: null,
                error: "L'identifiant est requis"
            };
        }
        
        if (!password || password.trim() === '') {
            console.log('auth-submit: validation échouée: mot de passe manquant');
            return {
                success: false,
                data: null,
                error: "Le mot de passe est requis"
            };
        }
        
        const trimmedName = name.trim();
        console.log('auth-submit: tentative connexion pour:', trimmedName);
        
        // 2. Authentification CouchDB
        const authResponse = await fetch(`${COUCHDB_URL}_session`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ name: trimmedName, password })
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
        
        const authData = await authResponse.json();
        console.log('auth-submit: authentification réussie pour:', authData.name);
        
        // 3. Vérification session CouchDB
        const sessionCheck = await fetch(`${COUCHDB_URL}_session`, {
            credentials: 'include'
        });
        
        if (!sessionCheck.ok) {
            throw new Error('Échec vérification session');
        }
        
        const session = await sessionCheck.json();
        console.log('auth-submit: session CouchDB validée');
        
        // 4. Démarrage sync PouchDB si localDB disponible dans context
        if (context?.localDB) {
            try {
                const remoteDbUrl = `${COUCHDB_URL}${DB_NAME}`;
                const sync = context.localDB.sync(remoteDbUrl, {
                    live: true,
                    retry: true,
                    ajax: { credentials: 'include' }
                });
                
                // Stockage du handler dans context pour pouvoir l'arrêter plus tard
                context.syncHandler = sync;
                
                sync.on('change', (info) => console.log('Sync change:', info));
                sync.on('paused', () => console.log('Sync paused'));
                sync.on('active', () => console.log('Sync active'));
                sync.on('error', (err) => console.error('auth-submit: erreur sync:', err));
                
                console.log('auth-submit: sync PouchDB démarré (live: true)');
            } catch (syncErr) {
                console.error('auth-submit: erreur sync:', syncErr);
                // On continue même si le sync échoue
            }
        }
        
        // 5. Stockage session localStorage
        localStorage.setItem('auth_name', session.name || trimmedName);
        localStorage.setItem('auth_roles', JSON.stringify(session.roles || authData.roles || []));
        localStorage.setItem('auth_db', DB_NAME);
        localStorage.setItem('auth_remember_me', rememberMe.toString());
        localStorage.setItem('auth_last_login', new Date().toISOString());
        
        if (!rememberMe) {
            // Suppression au prochain démarrage
            localStorage.removeItem('auth_name');
        }
        
        // Construction réponse succès
        const userData = {
            id: `user_${trimmedName}`,
            name: session.name || trimmedName,
            displayName: session.name || trimmedName,
            roles: session.roles || authData.roles || [],
            db: DB_NAME
        };
        
        console.log('auth-submit: authentification terminée avec succès');
        
        return {
            success: true,
            data: {
                user: userData,
                session: {
                    ok: true,
                    name: session.name || trimmedName,
                    roles: session.roles || authData.roles || []
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
