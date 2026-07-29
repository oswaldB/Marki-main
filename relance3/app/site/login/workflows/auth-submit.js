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
    
    try {
        const { username, password, rememberMe = false } = params;
        
        // 1. Validation des entrées
        if (!username) {
            console.log('auth-submit: validation échouée: identifiant requis');
            return { 
                success: false, 
                data: null,
                error: "L'identifiant est requis" 
            };
        }
        
        if (!password) {
            console.log('auth-submit: validation échouée: mot de passe requis');
            return { 
                success: false, 
                data: null,
                error: "Le mot de passe est requis" 
            };
        }
        
        // 2. Authentification CouchDB (Cookie Authentication)
        console.log('auth-submit: tentative connexion pour:', username);
        
        const authResponse = await fetch(`${COUCHDB_URL}_session`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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
        
        const sessionResult = await authResponse.json();
        console.log('auth-submit: authentification réussie pour:', username);
        
        // 3. Vérification de session
        const sessionCheck = await fetch(`${COUCHDB_URL}_session`, {
            credentials: 'include'
        });
        
        if (!sessionCheck.ok) {
            throw new Error('Session verification failed');
        }
        
        const sessionData = await sessionCheck.json();
        console.log('auth-submit: session CouchDB validée');
        
        // 4. Stockage session (localStorage)
        localStorage.setItem('auth_username', sessionData.userCtx.name);
        localStorage.setItem('auth_roles', JSON.stringify(sessionData.userCtx.roles));
        localStorage.setItem('auth_db', DB_NAME);
        localStorage.setItem('auth_remember_me', rememberMe.toString());
        localStorage.setItem('auth_last_login', new Date().toISOString());
        
        // Supprimer auth_username si rememberMe=false
        if (!rememberMe) {
            // Note: selon les specs, on supprime auth_username si rememberMe=false
            // Mais on vient de le stocker... On garde la logique selon les specs
            localStorage.removeItem('auth_username');
        }
        
        console.log('auth-submit: succès - prêt pour sync-loading');
        
        // Retourner succès avec données
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
                rememberMe: rememberMe,
                needsSync: true
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
