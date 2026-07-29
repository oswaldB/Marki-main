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
    console.log('auth-submit: démarrage authentification', params);

    const { username, password, rememberMe = false } = params;

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

    try {
        // 2. Authentification CouchDB
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

        // 3. Vérification de la session
        const sessionCheck = await fetch(`${COUCHDB_URL}_session`, {
            credentials: 'include'
        });
        const sessionData = await sessionCheck.json();
        console.log('auth-submit: session CouchDB validée');

        // 4. Stockage dans localStorage
        localStorage.setItem('auth_username', sessionData.userCtx.name);
        localStorage.setItem('auth_roles', JSON.stringify(sessionData.userCtx.roles));
        localStorage.setItem('auth_db', DB_NAME);
        localStorage.setItem('auth_remember_me', rememberMe.toString());
        localStorage.setItem('auth_last_login', new Date().toISOString());

        // Si rememberMe est false, on supprime auth_username du localStorage
        if (!rememberMe) {
            localStorage.removeItem('auth_username');
        }

        // 5. Démarrage du sync PouchDB initial (one-shot)
        console.log('auth-submit: sync PouchDB démarré (one-shot)');

        const localDb = new PouchDB(DB_NAME);
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

        // Écouter la progression
        sync.on('change', (info) => {
            const total = (info.pull?.docs_written || 0) + (info.push?.docs_written || 0);
            console.log('auth-submit: documents reçus:', total);
        });

        // Attendre la fin du sync
        await new Promise((resolve, reject) => {
            sync.on('complete', (info) => {
                console.log('auth-submit: sync initial terminé', info);
                resolve(info);
            });

            sync.on('error', (err) => {
                console.error('auth-submit: erreur sync:', err);
                reject(err);
            });
        });

        // Redirection vers /dashboard
        console.log('auth-submit: redirection vers /dashboard');
        window.location.href = '/dashboard';

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
                session: sessionResult,
                rememberMe: rememberMe
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
