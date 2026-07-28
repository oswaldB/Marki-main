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
    console.log('auth-submit workflow executing', params);
    console.log('auth-submit: démarrage authentification');
    
    const { username, password, rememberMe = false } = params;
    
    try {
        // 1. Validation des entrées
        if (!username || username.trim() === '') {
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
        
        const trimmedUsername = username.trim();
        console.log('auth-submit: tentative connexion pour:', trimmedUsername);
        
        // 2. Authentification CouchDB (Cookie Authentication)
        const authResponse = await fetch(`${COUCHDB_URL}_session`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ name: trimmedUsername, password })
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
        
        const authData = await authResponse.json();
        console.log('auth-submit: authentification réussie pour:', trimmedUsername);
        
        // 3. Vérification de la session
        const sessionCheck = await fetch(`${COUCHDB_URL}_session`, {
            credentials: 'include'
        });
        
        if (!sessionCheck.ok) {
            throw new Error('Erreur lors de la vérification de session');
        }
        
        const sessionData = await sessionCheck.json();
        console.log('auth-submit: session CouchDB validée');
        
        const userCtx = sessionData.userCtx || {};
        const userRoles = userCtx.roles || [];
        
        // 4. Stockage session dans localStorage
        localStorage.setItem('auth_username', userCtx.name || trimmedUsername);
        localStorage.setItem('auth_roles', JSON.stringify(userRoles));
        localStorage.setItem('auth_db', DB_NAME);
        localStorage.setItem('auth_remember_me', rememberMe.toString());
        localStorage.setItem('auth_last_login', new Date().toISOString());
        
        if (!rememberMe) {
            // Supprimer le username si rememberMe est false
            // Note: on le garde temporairement pour cette session
        }
        
        // 5. Démarrage du sync PouchDB initial (one-shot)
        console.log('auth-submit: sync PouchDB démarré (one-shot)');
        
        const localDb = context.localDB || new PouchDB(DB_NAME);
        const remoteDb = new PouchDB(`${COUCHDB_URL}${DB_NAME}`, {
            fetch: (url, opts) => {
                opts.credentials = 'include';
                return fetch(url, opts);
            }
        });
        
        // Sync initial one-shot
        const sync = localDb.sync(remoteDb, {
            live: false,
            retry: true
        });
        
        // Gérer la progression du sync
        return new Promise((resolve, reject) => {
            let totalDocs = 0;
            
            sync.on('change', (info) => {
                console.log('auth-submit: documents reçus:', info.change?.docs_read || 0);
                if (info.change?.docs_read) {
                    totalDocs += info.change.docs_read;
                }
                
                // Mettre à jour l'UI de chargement si disponible
                if (context.updateLoadingUI) {
                    context.updateLoadingUI({ totalDocs, ...info });
                }
            });
            
            sync.on('complete', (info) => {
                console.log('auth-submit: sync initial terminé');
                console.log('auth-submit: redirection vers /dashboard');
                
                // Redirection vers /dashboard
                window.location.href = '/dashboard';
                
                resolve({
                    success: true,
                    data: {
                        user: {
                            id: `user_${userCtx.name || trimmedUsername}`,
                            username: userCtx.name || trimmedUsername,
                            displayName: userCtx.name || trimmedUsername,
                            roles: userRoles,
                            db: DB_NAME
                        },
                        session: {
                            ok: true,
                            name: userCtx.name || trimmedUsername,
                            roles: userRoles
                        },
                        rememberMe: rememberMe
                    },
                    error: null
                });
            });
            
            sync.on('error', (err) => {
                console.error('auth-submit: erreur sync:', err);
                
                // En cas d'erreur de sync, on propose le mode hors-ligne
                // ou de réessayer selon le contexte
                if (context.allowOfflineMode) {
                    console.log('auth-submit: mode hors-ligne activé');
                    window.location.href = '/dashboard';
                    
                    resolve({
                        success: true,
                        data: {
                            user: {
                                id: `user_${userCtx.name || trimmedUsername}`,
                                username: userCtx.name || trimmedUsername,
                                displayName: userCtx.name || trimmedUsername,
                                roles: userRoles,
                                db: DB_NAME
                            },
                            session: {
                                ok: true,
                                name: userCtx.name || trimmedUsername,
                                roles: userRoles
                            },
                            rememberMe: rememberMe,
                            offline: true
                        },
                        error: null
                    });
                } else {
                    reject({
                        success: false,
                        data: null,
                        error: "Erreur de synchronisation. Veuillez réessayer."
                    });
                }
            });
        });
        
    } catch (err) {
        console.error('auth-submit error:', err);
        console.log('auth-submit: erreur technique lors de la connexion');
        return { 
            success: false, 
            data: null,
            error: "Erreur technique lors de la connexion. Veuillez réessayer."
        };
    }
}
