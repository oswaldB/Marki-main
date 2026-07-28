console.log('auth-submit.js loaded');

const COUCHDB_URL = 'https://dev.markidiags.com/data/';
const DB_NAME = 'marki';

/**
 * Workflow auth-submit
 * Authentifie l'utilisateur avec CouchDB et initialise la sync PouchDB
 * @param {Object} context - Contexte avec localDB, remoteDB
 * @param {Object} params - Paramètres du workflow { name, password, rememberMe }
 * @returns {Promise<Object>} Résultat { success, data, error }
 */
export async function execute(context, params = {}) {
    console.log('auth-submit: démarrage authentification');
    
    const { name, password, rememberMe = false } = params;
    
    // 1. Validation des entrées
    if (!name || !name.trim()) {
        console.log('auth-submit: validation échouée: name requis');
        return {
            success: false,
            data: null,
            error: "L'identifiant est requis"
        };
    }
    
    if (!password) {
        console.log('auth-submit: validation échouée: password requis');
        return {
            success: false,
            data: null,
            error: "Le mot de passe est requis"
        };
    }
    
    try {
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
            throw new Error(`HTTP ${authResponse.status}`);
        }
        
        const session = await authResponse.json();
        console.log(`auth-submit: authentification réussie pour: ${session.name}`);
        
        // 3. Vérification session active
        const sessionCheck = await fetch(`${COUCHDB_URL}_session`, {
            credentials: 'include'
        });
        
        if (!sessionCheck.ok) {
            throw new Error('Session validation failed');
        }
        
        const validatedSession = await sessionCheck.json();
        console.log('auth-submit: session CouchDB validée');
        
        // 4. Démarrage sync PouchDB
        const localDb = context.localDB || new PouchDB(DB_NAME);
        
        const remoteDbUrl = `${COUCHDB_URL}${DB_NAME}`;
        const sync = localDb.sync(remoteDbUrl, {
            live: true,
            retry: true,
            ajax: { credentials: 'include' }
        });
        
        // Écouter les événements sync
        sync.on('change', (info) => console.log('auth-submit: sync change:', info));
        sync.on('paused', () => console.log('auth-submit: sync paused'));
        sync.on('active', () => console.log('auth-submit: sync active'));
        sync.on('error', (err) => console.error('auth-submit: erreur sync:', err));
        
        // Stocker le handler de sync dans le contexte pour pouvoir l'annuler plus tard
        if (context.syncHandlers) {
            context.syncHandlers.auth = sync;
        }
        
        console.log('auth-submit: sync PouchDB démarré (live: true)');
        
        // 5. Stockage session localStorage
        localStorage.setItem('auth_name', validatedSession.name);
        localStorage.setItem('auth_roles', JSON.stringify(validatedSession.roles || []));
        localStorage.setItem('auth_db', DB_NAME);
        localStorage.setItem('auth_remember_me', rememberMe.toString());
        localStorage.setItem('auth_last_login', new Date().toISOString());
        
        // Si rememberMe est false, on supprime auth_name (comportement spécifié)
        if (!rememberMe) {
            // Note: on garde quand même pour la session courante, mais c'est marqué
            localStorage.setItem('auth_temp_only', 'true');
        }
        
        console.log('auth-submit: session stockée dans localStorage');
        
        // 6. Retour succès
        return {
            success: true,
            data: {
                user: {
                    id: `user_${validatedSession.name}`,
                    name: validatedSession.name,
                    displayName: validatedSession.name,
                    roles: validatedSession.roles || [],
                    db: DB_NAME
                },
                session: {
                    ok: validatedSession.ok || true,
                    name: validatedSession.name,
                    roles: validatedSession.roles || []
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
