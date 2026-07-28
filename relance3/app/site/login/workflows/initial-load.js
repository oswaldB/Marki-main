console.log('initial-load.js loaded');

const COUCHDB_URL = window.COUCHDB_URL || 'http://localhost:5984/';

/**
 * Workflow initial-load
 * Vérifie la session active et l'état de PouchDB au chargement de la page login
 * @param {Object} context - Contexte avec localDB, remoteDB
 * @param {Object} params - Paramètres du workflow
 * @returns {Promise<Object>} Résultat { success, data, error }
 */
export async function execute(context, params = {}) {
    console.log('initial-load: démarrage vérification session');

    try {
        // 1. Vérifier le cookie de session CouchDB (AuthSession)
        console.log('initial-load: vérification cookie AuthSession');
        let sessionData = null;

        try {
            const response = await fetch(`${COUCHDB_URL}_session`, {
                credentials: 'include'
            });

            // Vérifier Content-Type avant parsing JSON
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error(`Réponse non-JSON: ${contentType}`);
            }

            sessionData = await response.json();
        } catch (error) {
            console.log('initial-load: erreur réseau → mode hors-ligne (pas de session)', error.message);
            sessionData = { ok: true, userCtx: { name: null, roles: [] } };
        }

        const hasSession = sessionData?.userCtx?.name !== null;
        const session = hasSession ? {
            name: sessionData.userCtx.name,
            roles: sessionData.userCtx.roles
        } : null;

        // 2. Vérifier PouchDB local
        const localDb = context?.localDB || new PouchDB('marki');
        const pouchInfo = await localDb.info();
        const docCount = pouchInfo.doc_count || 0;

        console.log(`initial-load: PouchDB local: ${docCount} documents`);

        // 3. Lire rememberMe
        const rememberMe = localStorage.getItem('auth_remember_me') === 'true';

        // 4. Déterminer la réponse selon les cas
        if (!hasSession) {
            console.log('initial-load: cookie AuthSession absent ou invalide');
            return {
                success: true,
                data: {
                    hasSession: false,
                    reason: 'no_session_cookie'
                },
                error: null
            };
        }

        // Session active détectée
        console.log(`initial-load: session CouchDB active pour: ${sessionData.userCtx.name}`);

        const needsSync = docCount === 0;

        if (!needsSync) {
            // Session + PouchDB à jour → redirection immédiate
            console.log('initial-load: PouchDB à jour → redirection vers /dashboard');
            return {
                success: true,
                data: {
                    hasSession: true,
                    session,
                    pouchDbStatus: {
                        docCount,
                        lastSync: new Date().toISOString(),
                        needsSync: false
                    },
                    rememberMe,
                    redirectTo: '/dashboard'
                },
                error: null
            };
        }

        // Session active mais PouchDB vide → sync requis
        console.log('initial-load: sync initial requis → affichage loading screen');
        return {
            success: true,
            data: {
                hasSession: true,
                session,
                pouchDbStatus: {
                    docCount: 0,
                    needsSync: true,
                    syncing: true
                },
                rememberMe
            },
            error: null
        };

    } catch (err) {
        console.error('initial-load error:', err);
        return {
            success: false,
            data: null,
            error: `Erreur lors de la vérification de session: ${err.message}`
        };
    }
}
