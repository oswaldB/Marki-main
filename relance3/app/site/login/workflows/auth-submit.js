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
    if (!name || typeof name !== 'string' || name.trim() === '') {
        console.log('auth-submit: validation échouée: identifiant requis');
        return {
            success: false,
            data: null,
            error: "L'identifiant est requis"
        };
    }
    
    if (!password || typeof password !== 'string' || password === '') {
        console.log('auth-submit: validation échouée: mot de passe requis');
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
        
        // 3. Vérification de la session
        const sessionCheck = await fetch(`${COUCHDB_URL}_session`, {
            credentials: 'include'
        });
        
        if (!sessionCheck.ok) {
            throw new Error('Session validation failed');
        }
        
        const session = await sessionCheck.json();
        console.log('auth-submit: session CouchDB validée');
        
        // 4. Stockage dans localStorage
        localStorage.setItem('auth_name', session.name);
        localStorage.setItem('auth_roles', JSON.stringify(session.roles || []));
        localStorage.setItem('auth_db', DB_NAME);
        localStorage.setItem('auth_remember_me', rememberMe.toString());
        localStorage.setItem('auth_last_login', new Date().toISOString());
        
        // Supprimer auth_name si rememberMe est false
        if (!rememberMe) {
            localStorage.removeItem('auth_name');
        }
        
        console.log('auth-submit: authentification réussie pour:', session.name);
        
        // 5. Démarrage du sync PouchDB si context.localDB existe
        if (context && context.localDB) {
            try {
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
                
                // Stocker le handler dans le contexte pour pouvoir l'annuler plus tard
                if (context.syncHandlers) {
                    context.syncHandlers.push(sync);
                } else {
                    context.syncHandlers = [sync];
                }
                
                console.log('auth-submit: sync PouchDB démarré (live: true)');
            } catch (syncErr) {
                console.error('auth-submit: erreur démarrage sync:', syncErr);
                // Ne pas bloquer le login si le sync échoue
            }
        }
        
        // Construction de la réponse
        const userData = {
            user: {
                id: `org.couchdb.user:${session.name}`,
                name: session.name,
                displayName: session.name, // Pas d'autre info disponible via _session
                roles: session.roles || [],
                db: DB_NAME
            },
            session: {
                ok: true,
                name: session.name,
                roles: session.roles || []
            },
            rememberMe: rememberMe
        };
        
        return {
            success: true,
            data: userData,
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
