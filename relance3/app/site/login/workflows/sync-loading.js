/**
 * Workflow sync-loading
 * Affiche l'écran de synchronisation des données PouchDB après une connexion réussie
 * 
 * PRIORITÉ ABSOLUE: LIT EN PREMIER .specs/page-specs.md
 * SPECS: .specs/wf-frontend/sync-loading.md
 * 
 * @param {Object} context - Contexte avec localDB, remoteDB, etc.
 * @param {Object} params - Paramètres du workflow (session, fromLogin)
 * @returns {Promise<Object>} Résultat { success, data, error }
 */

console.log('sync-loading.js loaded');

// Configuration CouchDB
const COUCHDB_URL = window.COUCHDB_URL || 'http://localhost:5984/';

// Handler global pour permettre l'annulation externe
let activeSyncHandler = null;
let progressInterval = null;
let syncStats = {
    documentsReceived: 0,
    bytesTransferred: 0,
    startTime: null,
    lastUpdate: null
};

/**
 * Met à jour la progression de la sync
 */
function updateProgress({ documents, direction }) {
    const estimatedMaxDocs = 2000;
    const baseProgress = direction === 'pull' ? 20 : 0;
    const progressPercent = Math.min(
        baseProgress + (documents / estimatedMaxDocs) * 60,
        80
    );
    
    console.log(`sync-loading: documents reçus: ${documents}`);
    
    return {
        percentage: Math.round(progressPercent),
        documentsReceived: documents,
        status: `Téléchargement des documents...`,
        direction
    };
}

/**
 * Calcule la vitesse de transfert estimée
 */
function calculateSpeed() {
    if (!syncStats.startTime || syncStats.documentsReceived === 0) return 0;
    const elapsed = (Date.now() - syncStats.startTime) / 1000;
    return Math.round(syncStats.documentsReceived / elapsed);
}

/**
 * Catégorise une erreur de sync
 */
function categorizeError(err) {
    if (!err) return 'unknown';
    
    const message = err.message || err.toString();
    
    if (message.includes('timeout') || message.includes('ETIMEDOUT')) {
        return 'timeout';
    }
    if (message.includes('unauthorized') || message.includes('auth') || err.status === 401) {
        return 'auth_failed';
    }
    if (message.includes('network') || message.includes('connection') || err.status === 0) {
        return 'connection_lost';
    }
    return 'unknown';
}

/**
 * Annule la synchronisation en cours
 */
export function cancelSync() {
    console.log('sync-loading: annulé par l\'utilisateur');
    
    if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
    }
    
    if (activeSyncHandler) {
        activeSyncHandler.cancel();
        activeSyncHandler = null;
    }
    
    return {
        success: true,
        data: {
            synced: false,
            cancelled: true
        },
        error: null
    };
}

/**
 * Fonction principale du workflow
 */
export async function execute(context = {}, params = {}) {
    console.log('sync-loading workflow executing', params);
    console.log('sync-loading: démarrage synchronisation');
    
    // Réinitialiser les stats
    syncStats = {
        documentsReceived: 0,
        bytesTransferred: 0,
        startTime: Date.now(),
        lastUpdate: Date.now()
    };
    
    const { session, fromLogin = false } = params;
    const { localDB, remoteDB } = context;
    
    return new Promise((resolve) => {
        try {
            // Utiliser les DB du contexte ou en créer de nouvelles
            const localDb = localDB || new PouchDB('marki');
            const remoteDb = remoteDB || new PouchDB(`${COUCHDB_URL}marki`, {
                fetch: (url, opts) => {
                    opts.credentials = 'include';
                    return fetch(url, opts);
                }
            });
            
            // Démarrer la synchronisation
            console.log('sync-loading: connexion à CouchDB établie');
            
            const syncHandler = localDb.sync(remoteDb, {
                live: true,
                retry: true,
                heartbeat: 10000,
                timeout: 30000
            });
            
            // Stocker le handler globalement pour annulation
            activeSyncHandler = syncHandler;
            window.currentSyncHandler = syncHandler;
            
            let isCompleted = false;
            
            // Gérer les événements de changement
            syncHandler.on('change', (info) => {
                syncStats.lastUpdate = Date.now();
                
                if (info.change && info.change.docs) {
                    syncStats.documentsReceived += info.change.docs.length;
                    const progress = updateProgress({
                        documents: syncStats.documentsReceived,
                        direction: info.direction
                    });
                    
                    // Émettre un événement pour la UI
                    window.dispatchEvent(new CustomEvent('sync-progress', {
                        detail: progress
                    }));
                }
            });
            
            // Gérer la pause (sync initial terminé)
            syncHandler.on('paused', (err) => {
                if (!err && !isCompleted) {
                    isCompleted = true;
                    completeSync(syncHandler, resolve);
                }
            });
            
            // Gérer les erreurs
            syncHandler.on('error', (err) => {
                if (!isCompleted) {
                    isCompleted = true;
                    handleSyncError(err, syncHandler, resolve);
                }
            });
            
            // Détection timeout (pas de changement depuis 30s)
            progressInterval = setInterval(() => {
                if (Date.now() - syncStats.lastUpdate > 30000 && !isCompleted) {
                    isCompleted = true;
                    handleSyncError({ message: 'timeout' }, syncHandler, resolve);
                }
            }, 5000);
            
        } catch (err) {
            console.error('sync-loading error:', err);
            resolve({
                success: false,
                data: {
                    synced: false,
                    error: categorizeError(err)
                },
                error: err.message || 'Erreur lors de la synchronisation'
            });
        }
    });
}

/**
 * Complète la synchronisation avec succès
 */
function completeSync(syncHandler, resolve) {
    console.log('sync-loading: sync initial terminé');
    
    if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
    }
    
    // Calculer les stats finales
    const duration = Date.now() - (syncStats.startTime || Date.now());
    const stats = {
        documentsReceived: syncStats.documentsReceived,
        bytesTransferred: syncStats.bytesTransferred,
        duration
    };
    
    console.log('sync-loading: redirection vers application');
    
    // Notifier la UI
    window.dispatchEvent(new CustomEvent('sync-complete', {
        detail: { percentage: 100, status: 'Synchronisation terminée !' }
    }));
    
    // Attendre l'animation puis résoudre
    setTimeout(() => {
        if (syncHandler) {
            syncHandler.cancel();
        }
        activeSyncHandler = null;
        window.currentSyncHandler = null;
        
        resolve({
            success: true,
            data: {
                synced: true,
                stats
            },
            error: null
        });
    }, 800);
}

/**
 * Gère les erreurs de synchronisation
 */
function handleSyncError(err, syncHandler, resolve) {
    const errorType = categorizeError(err);
    console.log(`sync-loading: erreur de sync: ${errorType}`);
    
    if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
    }
    
    if (syncHandler) {
        syncHandler.cancel();
    }
    activeSyncHandler = null;
    window.currentSyncHandler = null;
    
    const errorMessages = {
        auth_failed: 'Session expirée. Veuillez vous reconnecter.',
        connection_lost: 'Connexion perdue. Vérifiez votre réseau.',
        timeout: 'Délai d\'attente dépassé. Réessayez.',
        unknown: 'Erreur lors de la synchronisation.'
    };
    
    const errorMessage = errorMessages[errorType] || errorMessages.unknown;
    
    // Notifier la UI
    window.dispatchEvent(new CustomEvent('sync-error', {
        detail: { error: errorType, message: errorMessage }
    }));
    
    // Pour auth_failed, indiquer qu'il faut rediriger
    const data = {
        synced: false,
        error: errorType
    };
    
    if (errorType === 'auth_failed') {
        data.redirect = true;
    }
    
    resolve({
        success: false,
        data,
        error: errorMessage
    });
}