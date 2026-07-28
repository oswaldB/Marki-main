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

// Configuration CouchDB
const COUCHDB_URL = 'https://dev.markidiags.com/data/';
const DB_NAME = 'marki';

// Handler de synchronisation global (pour pouvoir l'annuler au logout)
let syncHandler = null;

/**
 * Workflow auth-submit
 * Authentifie l'utilisateur avec CouchDB et démarre la synchro PouchDB
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
        
        console.log('auth-submit: tentative connexion pour:', username);
        
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
        console.log('auth-submit: authentification réussie pour:', username);
        
        // 3. Vérifier la session CouchDB
        const sessionCheck = await fetch(`${COUCHDB_URL}_session`, {
            credentials: 'include'
        });
        
        if (!sessionCheck.ok) {
            throw new Error('Échec vérification session');
        }
        
        const sessionData = await sessionCheck.json();
        console.log('auth-submit: session CouchDB validée');
        
        // 4. Récupérer le document utilisateur pour le displayName
        let displayName = sessionData.name;
        try {
            const userDocResponse = await fetch(`${COUCHDB_URL}_users/org.couchdb.user:${encodeURIComponent(sessionData.name)}`, {
                credentials: 'include'
            });
            if (userDocResponse.ok) {
                const userDoc = await userDocResponse.json();
                displayName = userDoc.displayName || userDoc.name || sessionData.name;
            }
        } catch (docErr) {
            console.log('auth-submit: impossible de récupérer le document utilisateur:', docErr.message);
            // On continue avec le username comme displayName
        }
        
        // 5. Démarrer le sync PouchDB si context.localDB existe
        if (context.localDB) {
            try {
                // Annuler le sync précédent s'il existe
                if (syncHandler) {
                    syncHandler.cancel();
                }
                
                const remoteDbUrl = `${COUCHDB_URL}${DB_NAME}`;
                syncHandler = context.localDB.sync(remoteDbUrl, {
                    live: true,
                    retry: true,
                    ajax: { credentials: 'include' }
                });
                
                syncHandler.on('change', (info) => console.log('auth-submit: sync change:', info));
                syncHandler.on('paused', () => console.log('auth-submit: sync paused'));
                syncHandler.on('active', () => console.log('auth-submit: sync active'));
                syncHandler.on('error', (err) => console.error('auth-submit: erreur sync:', err));
                
                console.log('auth-submit: sync PouchDB démarré (live: true)');
            } catch (syncErr) {
                console.error('auth-submit: erreur démarrage sync:', syncErr);
                // On continue même si le sync échoue
            }
        }
        
        // 6. Stockage session dans localStorage
        const user = {
            id: `org.couchdb.user:${sessionData.name}`,
            username: sessionData.name,
            displayName: displayName,
            roles: sessionData.roles || [],
            db: DB_NAME
        };
        
        localStorage.setItem('auth_username', sessionData.name);
        localStorage.setItem('auth_roles', JSON.stringify(sessionData.roles || []));
        localStorage.setItem('auth_db', DB_NAME);
        localStorage.setItem('auth_remember_me', rememberMe.toString());
        localStorage.setItem('auth_last_login', new Date().toISOString());
        
        // Stocker l'email si rememberMe
        if (rememberMe) {
            localStorage.setItem('saved_email', username);
        } else {
            localStorage.removeItem('saved_email');
        }
        
        return {
            success: true,
            data: {
                user,
                session: sessionData,
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

/**
 * Déconnecte l'utilisateur et arrête la synchronisation
 * @returns {Promise<Object>} Résultat { success, error }
 */
export async function logout() {
    try {
        // Arrêter le sync PouchDB
        if (syncHandler) {
            syncHandler.cancel();
            syncHandler = null;
            console.log('auth-submit: sync arrêté');
        }
        
        // Déconnexion CouchDB
        await fetch(`${COUCHDB_URL}_session`, {
            method: 'DELETE',
            credentials: 'include'
        });
        
        // Cleanup localStorage
        localStorage.removeItem('auth_username');
        localStorage.removeItem('auth_roles');
        localStorage.removeItem('auth_db');
        localStorage.removeItem('auth_remember_me');
        localStorage.removeItem('auth_last_login');
        localStorage.removeItem('saved_email');
        
        console.log('auth-submit: déconnexion réussie');
        return { success: true, error: null };
    } catch (err) {
        console.error('auth-submit: erreur déconnexion:', err);
        return { success: false, error: err.message };
    }
}
