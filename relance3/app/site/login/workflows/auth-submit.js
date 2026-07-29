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

/**
 * Workflow auth-submit
 * Authentifie l'utilisateur avec CouchDB et démarre la synchronisation PouchDB
 * @param {Object} context - Contexte avec localDB, remoteDB
 * @param {Object} params - Paramètres du workflow { email, password, rememberMe }
 * @returns {Promise<Object>} Résultat { success, data, error }
 */
export async function execute(context, params = {}) {
    console.log('auth-submit workflow executing', params);
    console.log('auth-submit: démarrage authentification');
    
    try {
        // ───────────────────────────────────────────────────────
        // 1. VALIDATION DES ENTRÉES
        // ───────────────────────────────────────────────────────
        const username = params.email || params.username;
        const password = params.password;
        const rememberMe = params.rememberMe || false;
        
        if (!username) {
            console.log('auth-submit: validation échouée: identifiant manquant');
            return { 
                success: false, 
                data: null,
                error: "L'identifiant est requis" 
            };
        }
        
        if (!password) {
            console.log('auth-submit: validation échouée: mot de passe manquant');
            return { 
                success: false, 
                data: null,
                error: "Le mot de passe est requis" 
            };
        }
        
        // ───────────────────────────────────────────────────────
        // 2. AUTHENTIFICATION COUCHDB (Cookie Authentication)
        // ───────────────────────────────────────────────────────
        console.log('auth-submit: tentative connexion pour:', username);
        
        const authResponse = await fetch(`${COUCHDB_URL}_session`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ name: username, password })
        });
        
        // Gestion erreur 401 - identifiants invalides
        if (authResponse.status === 401) {
            console.log('auth-submit: identifiants invalides (401)');
            return { 
                success: false, 
                data: null,
                error: "Identifiant ou mot de passe incorrect" 
            };
        }
        
        // Gestion autres erreurs HTTP
        if (!authResponse.ok) {
            console.error('auth-submit: erreur HTTP', authResponse.status);
            return { 
                success: false, 
                data: null,
                error: "Erreur technique lors de la connexion. Veuillez réessayer." 
            };
        }
        
        const sessionData = await authResponse.json();
        console.log('auth-submit: authentification réussie pour:', username);
        
        // ───────────────────────────────────────────────────────
        // 3. VÉRIFICATION SESSION ET RÉCUPÉRATION INFOS UTILISATEUR
        // ───────────────────────────────────────────────────────
        console.log('auth-submit: session CouchDB validée');
        
        const sessionCheck = await fetch(`${COUCHDB_URL}_session`, {
            credentials: 'include'
        });
        
        if (!sessionCheck.ok) {
            throw new Error('Session validation failed');
        }
        
        const sessionInfo = await sessionCheck.json();
        const userCtx = sessionInfo.userCtx || {};
        
        // ───────────────────────────────────────────────────────
        // 4. STOCKAGE SESSION DANS LOCALSTORAGE
        // ───────────────────────────────────────────────────────
        localStorage.setItem('auth_username', userCtx.name || username);
        localStorage.setItem('auth_roles', JSON.stringify(userCtx.roles || []));
        localStorage.setItem('auth_db', DB_NAME);
        localStorage.setItem('auth_remember_me', rememberMe.toString());
        localStorage.setItem('auth_last_login', new Date().toISOString());
        
        if (!rememberMe) {
            // Si rememberMe=false, on supprime l'username du localStorage pour
            // ne pas préremplir le formulaire au prochain chargement
            // mais on garde les autres infos de session pendant la navigation
            // Note: le cookie AuthSession reste valide pour la session navigateur
            localStorage.removeItem('auth_username');
        }
        
        // ───────────────────────────────────────────────────────
        // 5. DÉMARRAGE SYNC POUCHDB (one-shot initial)
        // ───────────────────────────────────────────────────────
        const { localDB } = context;
        
        if (localDB && typeof PouchDB !== 'undefined') {
            console.log('auth-submit: sync PouchDB démarré (one-shot)');
            
            const remoteDb = new PouchDB(`${COUCHDB_URL}${DB_NAME}`, {
                fetch: (url, opts) => {
                    opts.credentials = 'include';
                    return fetch(url, opts);
                }
            });
            
            // Sync initial one-shot (pas live)
            const sync = localDB.sync(remoteDb, {
                live: false,
                retry: true
            });
            
            // Écouter les événements de sync pour les logs
            sync.on('change', (info) => {
                const totalDocs = (info.pull?.docs_written || 0) + (info.push?.docs_written || 0);
                console.log('auth-submit: documents reçus:', totalDocs);
            });
            
            sync.on('complete', (info) => {
                console.log('auth-submit: sync initial terminé', info);
                console.log('auth-submit: redirection vers /dashboard');
            });
            
            sync.on('error', (err) => {
                console.error('auth-submit: erreur sync:', err);
            });
        } else {
            console.log('auth-submit: PouchDB non disponible, sync ignoré');
        }
        
        // ───────────────────────────────────────────────────────
        // 6. RETOUR SUCCÈS
        // ───────────────────────────────────────────────────────
        return { 
            success: true, 
            data: {
                user: {
                    id: `user_${userCtx.name || username}`,
                    username: userCtx.name || username,
                    displayName: userCtx.name || username,
                    roles: userCtx.roles || [],
                    db: DB_NAME
                },
                session: {
                    ok: true,
                    name: userCtx.name || username,
                    roles: userCtx.roles || []
                },
                rememberMe: rememberMe
            },
            error: null
        };
        
    } catch (err) {
        console.error('auth-submit error:', err);
        return { 
            success: false, 
            data: null,
            error: err.message || "Erreur technique lors de la connexion. Veuillez réessayer." 
        };
    }
}
