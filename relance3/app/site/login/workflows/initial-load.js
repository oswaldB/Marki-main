/*
INSTRUCTIONS IA - À APPLIQUER:
=============================

PRIORITÉ ABSOLUE: LIT EN PREMIER .specs/page-specs.md

1. NOM DU WORKFLOW: initial-load

2. SPECS: Implémenter selon:
   - .specs/wf-frontend/initial-load.md
   - /home/ubuntu/marki/relance3/app/site/login/.specs/wf-frontend/initial-load.md

3. FONCTION: Export nommé execute(context, params) qui:
   - Prend context (avec localDB, remoteDB, etc.)
   - Prend params (paramètres du workflow)
   - Retourne { success: true/false, data: {}, error: string }

4. CONSOLE: Logger 'initial-load.js loaded' au chargement
*/

console.log('initial-load.js loaded');

// Configuration CouchDB
const COUCHDB_URL = 'https://dev.markidiags.com/data/';
const DB_NAME = 'marki';

/**
 * Workflow initial-load
 * Vérifie si l'utilisateur possède une session active au chargement de la page
 * @param {Object} context - Contexte avec localDB, remoteDB
 * @param {Object} params - Paramètres du workflow
 * @returns {Promise<Object>} Résultat { success, data, error }
 */
export async function execute(context, params = {}) {
    console.log('initial-load workflow executing', params);
    console.log('initial-load: démarrage vérification session');
    
    try {
        // 1. Vérifier le cookie de session CouchDB (AuthSession)
        console.log('initial-load: vérification cookie AuthSession');
        
        let sessionData = null;
        try {
            const response = await fetch(`${COUCHDB_URL}_session`, {
                credentials: 'include'  // Envoie le cookie AuthSession
            });
            
            // Vérifier Content-Type avant parsing JSON
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error(`Réponse non-JSON: ${contentType}`);
            }
            
            sessionData = await response.json();
        } catch (error) {
            console.error('initial-load: erreur récupération session:', error.message);
            console.log('initial-load: erreur réseau → mode hors-ligne (pas de session)');
            // Fallback: considérer qu'il n'y a pas de session
            sessionData = { ok: true, userCtx: { name: null, roles: [] } };
        }
        
        // Vérifier si une session est active
        const hasActiveSession = sessionData?.userCtx?.name !== null && sessionData?.userCtx?.name !== undefined;
        
        if (!hasActiveSession) {
            console.log('initial-load: cookie AuthSession absent ou invalide');
            
            // Restaurer rememberMe même sans session (pour pré-remplir le formulaire)
            const rememberMe = localStorage.getItem('auth_remember_me') === 'true';
            const savedUsername = localStorage.getItem('auth_username') || '';
            
            return { 
                success: true, 
                data: {
                    hasSession: false,
                    reason: "no_session_cookie",
                    rememberMe: rememberMe,
                    savedUsername: rememberMe ? savedUsername : ''
                }
            };
        }
        
        // Session active détectée
        const username = sessionData.userCtx.name;
        const roles = sessionData.userCtx.roles || [];
        console.log('initial-load: session CouchDB active pour:', username);
        
        // 2. Vérifier PouchDB local (fallback)
        let pouchDbStatus = {
            docCount: 0,
            lastSync: null,
            needsSync: true
        };
        
        try {
            // Utiliser PouchDB globale
            const localDb = new PouchDB(DB_NAME);
            const info = await localDb.info();
            pouchDbStatus.docCount = info.doc_count || 0;
            console.log('initial-load: PouchDB local:', pouchDbStatus.docCount, 'documents');
            
            // Vérifier si une sync est nécessaire (plus de 0 documents = probablement à jour)
            // Note: une logique plus sophistiquée pourrait vérifier la date de dernière sync
            pouchDbStatus.needsSync = pouchDbStatus.docCount === 0;
            
            // Récupérer la date de dernière sync si disponible
            const lastSyncStr = localStorage.getItem('auth_last_login');
            if (lastSyncStr) {
                pouchDbStatus.lastSync = lastSyncStr;
            }
        } catch (dbError) {
            console.error('initial-load: erreur accès PouchDB:', dbError.message);
            // Continuer avec needsSync: true
        }
        
        // 3. Récupérer rememberMe
        const rememberMe = localStorage.getItem('auth_remember_me') === 'true';
        
        // 4. Décider de l'action selon l'état de PouchDB
        if (!pouchDbStatus.needsSync && pouchDbStatus.docCount > 0) {
            // PouchDB est à jour → redirection immédiate
            console.log('initial-load: PouchDB à jour → redirection vers /dashboard');
            
            // Redirection après un court délai pour permettre le retour de la fonction
            setTimeout(() => {
                window.location.href = '/dashboard';
            }, 100);
            
            return { 
                success: true, 
                data: {
                    hasSession: true,
                    session: {
                        name: username,
                        roles: roles
                    },
                    pouchDbStatus: {
                        docCount: pouchDbStatus.docCount,
                        lastSync: pouchDbStatus.lastSync,
                        needsSync: false
                    },
                    rememberMe: rememberMe,
                    redirectTo: "/dashboard"
                }
            };
        }
        
        // Session active mais PouchDB vide ou désynchronisé
        console.log('initial-load: sync initial requis → affichage loading screen');
        
        // Démarrer le sync initial (sans attendre la fin pour le retour)
        // Le sync se poursuivra et la redirection sera gérée par le composant de sync
        startInitialSync(username);
        
        return { 
            success: true, 
            data: {
                hasSession: true,
                session: {
                    name: username,
                    roles: roles
                },
                pouchDbStatus: {
                    docCount: pouchDbStatus.docCount,
                    needsSync: true,
                    syncing: true
                },
                rememberMe: rememberMe
            }
        };
        
    } catch (err) {
        console.error('initial-load error:', err);
        console.error('initial-load: erreur récupération session (réponse non-JSON ou réseau)');
        return { 
            success: false, 
            error: err.message || 'Erreur lors de la vérification de session'
        };
    }
}

/**
 * Démarre le sync initial PouchDB
 * @param {string} username - Nom de l'utilisateur pour les logs
 */
function startInitialSync(username) {
    try {
        const localDb = new PouchDB(DB_NAME);
        const remoteDb = new PouchDB(`${COUCHDB_URL}${DB_NAME}`, {
            fetch: (url, opts) => {
                opts.credentials = 'include';
                return fetch(url, opts);
            }
        });
        
        const sync = localDb.sync(remoteDb, {
            live: false,    // Sync initial one-shot
            retry: true
        });
        
        // Écouter les changements
        sync.on('change', (info) => {
            console.log('initial-load: documents reçus:', info.change?.docs?.length || 0);
        });
        
        sync.on('complete', () => {
            console.log('initial-load: sync terminé → redirection vers /dashboard');
            localStorage.setItem('auth_last_login', new Date().toISOString());
            window.location.href = '/dashboard';
        });
        
        sync.on('error', (err) => {
            console.error('initial-load: erreur sync:', err);
            // En cas d'erreur, on pourrait rediriger quand même en mode hors-ligne
            // ou afficher une erreur
        });
        
    } catch (error) {
        console.error('initial-load: erreur démarrage sync:', error);
    }
}
