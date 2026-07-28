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

const COUCHDB_URL = 'https://dev.markidiags.com/data/';
const DB_NAME = 'marki';

// Handler pour le sync PouchDB (global au module)
let syncHandler = null;

/**
 * Démarre la synchronisation PouchDB avec CouchDB
 * @param {Object} localDB - Instance PouchDB locale
 */
function startSync(localDB) {
    if (!localDB) {
        console.warn('auth-submit: localDB non disponible pour le sync');
        return null;
    }
    
    // Arrêter le sync existant s'il y en a un
    if (syncHandler) {
        syncHandler.cancel();
    }
    
    const remoteDbUrl = `${COUCHDB_URL}${DB_NAME}`;
    
    syncHandler = localDB.sync(remoteDbUrl, {
        live: true,
        retry: true,
        ajax: { credentials: 'include' }
    });
    
    // Écouter les événements
    syncHandler.on('change', (info) => console.log('auth-submit: sync change:', info));
    syncHandler.on('paused', (err) => console.log('auth-submit: sync paused'));
    syncHandler.on('active', () => console.log('auth-submit: sync active'));
    syncHandler.on('error', (err) => console.error('auth-submit: erreur sync:', err));
    
    console.log('auth-submit: sync PouchDB démarré (live: true)');
    return syncHandler;
}

/**
 * Workflow auth-submit
 * Authentifie l'utilisateur avec CouchDB et démarre le sync PouchDB
 * @param {Object} context - Contexte avec localDB, remoteDB
 * @param {Object} params - Paramètres du workflow { username, password, rememberMe }
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
        
        console.log(`auth-submit: tentative connexion pour: ${username}`);
        
        // 2. Authentification CouchDB avec Basic Auth
        const encodedCredentials = btoa(`${username}:${password}`);
        
        const authResponse = await fetch(`${COUCHDB_URL}_session`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${encodedCredentials}`
            },
            credentials: 'include',
            body: JSON.stringify({ name: username, password })
        });
        
        // 3. Gestion des erreurs d'authentification
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
        
        const authResult = await authResponse.json();
        console.log(`auth-submit: authentification réussie pour: ${username}`);
        
        // 4. Vérifier la session CouchDB
        const sessionCheck = await fetch(`${COUCHDB_URL}_session`, {
            credentials: 'include'
        });
        
        if (!sessionCheck.ok) {
            throw new Error('Échec de la validation de session');
        }
        
        const session = await sessionCheck.json();
        console.log('auth-submit: session CouchDB validée');
        
        // 5. Démarrer le sync PouchDB
        if (context.localDB) {
            startSync(context.localDB);
        }
        
        // 6. Stocker la session dans localStorage
        localStorage.setItem('auth_username', session.name || username);
        localStorage.setItem('auth_roles', JSON.stringify(session.roles || []));
        localStorage.setItem('auth_db', DB_NAME);
        localStorage.setItem('auth_remember_me', rememberMe.toString());
        localStorage.setItem('auth_last_login', new Date().toISOString());
        
        // Sauvegarder l'email si rememberMe
        if (rememberMe) {
            localStorage.setItem('saved_email', username);
        } else {
            localStorage.removeItem('saved_email');
        }
        
        // 7. Retourner les données utilisateur
        return {
            success: true,
            data: {
                user: {
                    id: `org.couchdb.user:${session.name || username}`,
                    username: session.name || username,
                    displayName: session.name || username,
                    roles: session.roles || [],
                    db: DB_NAME
                },
                session: {
                    ok: authResult.ok,
                    name: authResult.name,
                    roles: authResult.roles
                },
                rememberMe: rememberMe
            }
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
