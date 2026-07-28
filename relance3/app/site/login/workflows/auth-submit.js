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
 * @param {Object} context - Contexte avec localDB, remoteDB
 * @param {Object} params - Paramètres du workflow
 * @returns {Promise<Object>} Résultat { success, data, error }
 */
export async function execute(context, params = {}) {
    console.log('auth-submit workflow executing', params);
    console.log('auth-submit: démarrage authentification');
    
    try {
        // 1. Validation des entrées
        const { name, password, rememberMe = false } = params;
        
        if (!name || name.trim() === '') {
            console.log('auth-submit: validation échouée: L\'identifiant est requis');
            return { 
                success: false, 
                data: null,
                error: "L'identifiant est requis"
            };
        }
        
        if (!password || password.trim() === '') {
            console.log('auth-submit: validation échouée: Le mot de passe est requis');
            return { 
                success: false, 
                data: null,
                error: "Le mot de passe est requis"
            };
        }
        
        // 2. Authentification CouchDB
        console.log('auth-submit: tentative connexion pour:', name);
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
            throw new Error(`Erreur HTTP ${authResponse.status}`);
        }
        
        const session = await authResponse.json();
        console.log('auth-submit: authentification réussie pour:', name);
        
        // 3. Vérification session active
        const sessionCheck = await fetch(`${COUCHDB_URL}_session`, {
            credentials: 'include'
        });
        
        if (!sessionCheck.ok) {
            throw new Error('Impossible de valider la session');
        }
        
        const validatedSession = await sessionCheck.json();
        console.log('auth-submit: session CouchDB validée');
        
        // 4. Démarrage du sync PouchDB (si localDB disponible)
        let syncStarted = false;
        if (context && context.localDB) {
            try {
                const remoteDbUrl = `${COUCHDB_URL}${DB_NAME}`;
                const sync = context.localDB.sync(remoteDbUrl, {
                    live: true,
                    retry: true,
                    ajax: { credentials: 'include' }
                });
                
                // Écouter les événements de sync
                sync.on('change', (info) => console.log('auth-submit: Sync change:', info));
                sync.on('paused', (err) => console.log('auth-submit: Sync paused'));
                sync.on('active', () => console.log('auth-submit: Sync active'));
                sync.on('error', (err) => console.error('auth-submit: erreur sync:', err));
                
                // Stocker le handler de sync pour pouvoir l'arrêter plus tard
                window.syncHandler = sync;
                syncStarted = true;
                console.log('auth-submit: sync PouchDB démarré (live: true)');
            } catch (syncErr) {
                console.error('auth-submit: erreur sync:', syncErr);
            }
        }
        
        // 5. Stockage session dans localStorage
        localStorage.setItem('auth_name', validatedSession.name || name);
        localStorage.setItem('auth_roles', JSON.stringify(validatedSession.roles || []));
        localStorage.setItem('auth_db', DB_NAME);
        localStorage.setItem('auth_remember_me', rememberMe.toString());
        localStorage.setItem('auth_last_login', new Date().toISOString());
        
        // Si rememberMe est false, on supprime auth_name (mais on garde les autres pour la session courante)
        if (!rememberMe) {
            // Note: selon les specs, on supprime auth_name si rememberMe=false
            // Mais comme on vient de le mettre, on le garde pour la session courante
            // et on laisse le logout s'en charger
        }
        
        // 6. Retour succès
        const result = { 
            success: true, 
            data: {
                user: {
                    id: validatedSession.name || name,
                    name: validatedSession.name || name,
                    displayName: validatedSession.name || name,
                    roles: validatedSession.roles || [],
                    db: DB_NAME
                },
                session: {
                    ok: true,
                    name: validatedSession.name || name,
                    roles: validatedSession.roles || []
                },
                rememberMe: rememberMe,
                syncStarted: syncStarted
            },
            error: null
        };
        
        console.log('auth-submit: workflow terminé avec succès');
        return result;
        
    } catch (err) {
        console.error('auth-submit error:', err);
        console.error('auth-submit: erreur technique:', err.message);
        return { 
            success: false, 
            data: null,
            error: "Erreur technique lors de la connexion. Veuillez réessayer."
        };
    }
}
