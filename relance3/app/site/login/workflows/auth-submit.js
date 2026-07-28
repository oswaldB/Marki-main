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
    console.log('auth-submit workflow executing', params);
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
            throw new Error(`HTTP ${authResponse.status}: ${authResponse.statusText}`);
        }
        
        const session = await authResponse.json();
        console.log('auth-submit: authentification réussie pour:', username);
        
        // 3. Vérification session active
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
            // Pour une session temporaire, on peut supprimer auth_username
            // mais on le garde pour le moment, sera géré à la fermeture
        }
        
        // 5. Démarrer sync PouchDB initial (one-shot)
        const { localDB } = context;
        if (localDB) {
            console.log('auth-submit: sync PouchDB démarré (one-shot)');
            
            const PouchDB = (await import('pouchdb')).default;
            const remoteDb = new PouchDB(`${COUCHDB_URL}${DB_NAME}`, {
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
                const total = (info.pull?.docs_read || 0) + (info.push?.docs_read || 0);
                console.log('auth-submit: documents reçus:', total);
            });
            
            sync.on('complete', (info) => {
                console.log('auth-submit: sync initial terminé');
                console.log('auth-submit: redirection vers /dashboard');
                window.location.href = '/dashboard';
            });
            
            sync.on('error', (err) => {
                console.error('auth-submit: erreur sync:', err);
                // En cas d'erreur de sync, on redirige quand même (mode hors-ligne possible)
                window.location.href = '/dashboard';
            });
        }
        
        return { 
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
                rememberMe
            },
            error: null
        };
        
    } catch (err) {
        console.error('auth-submit error:', err);
        console.error('auth-submit: erreur technique lors de la connexion');
        return { 
            success: false, 
            data: null,
            error: "Erreur technique lors de la connexion. Veuillez réessayer."
        };
    }
}
