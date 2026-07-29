/**
 * Workflow sync-loading
 * @param {Object} context - Contexte avec localDB, remoteDB
 * @param {Object} params - Paramètres du workflow
 * @returns {Promise<Object>} Résultat { success, data, error }
 */
export async function execute(context, params = {}) {
    console.log('sync-loading workflow executing', params);
    
    const COUCHDB_URL = 'https://dev.markidiags.com/data/';
    
    return new Promise((resolve) => {
        try {
            // PouchDB est disponible globalement (window.PouchDB)
            const localDb = new PouchDB('marki');
            const remoteDb = new PouchDB(`${COUCHDB_URL}marki`, {
                fetch: (url, opts) => {
                    opts.credentials = 'include';
                    return fetch(url, opts);
                }
            });

            console.log('sync-loading: démarrage synchronisation');
            
            const startTime = Date.now();
            let lastUpdate = Date.now();
            let documentCount = 0;
            let progressInterval = null;
            
            // Notifier le début du sync via context ou callback
            if (context?.onProgress) {
                context.onProgress({
                    percentage: 0,
                    status: 'Connexion au serveur...',
                    documentsReceived: 0
                });
            }
            
            const syncHandler = localDb.sync(remoteDb, {
                live: true,
                retry: true,
                heartbeat: 10000,
                timeout: 30000
            });
            
            // Exposer le handler pour permettre l'annulation
            window.currentSyncHandler = syncHandler;
            
            // Détection timeout (pas de changement depuis 30s)
            progressInterval = setInterval(() => {
                if (Date.now() - lastUpdate > 30000) {
                    handleSyncError({ message: 'timeout' });
                }
            }, 5000);
            
            function updateProgress({ documents, direction }) {
                lastUpdate = Date.now();
                
                // Stratégie de progression:
                // - 0-20%: Connexion et authentification
                // - 20-80%: Transfert des documents (estimation)
                // - 80-100%: Finalisation
                
                const baseProgress = direction === 'pull' ? 20 : 0;
                const estimatedMaxDocs = 2000;  // Estimation pour la progression
                const progressPercent = Math.min(
                    baseProgress + (documents / estimatedMaxDocs) * 60,
                    80
                );
                
                const speed = calculateSpeed();
                
                if (context?.onProgress) {
                    context.onProgress({
                        percentage: Math.round(progressPercent),
                        documentsReceived: documents,
                        status: `Téléchargement des documents...`,
                        speed: speed
                    });
                }
            }
            
            function calculateSpeed() {
                const duration = (Date.now() - startTime) / 1000;
                if (duration === 0) return '0 o/s';
                const bytesPerSec = Math.round((documentCount * 2000) / duration); // Estimation ~2KB/doc
                if (bytesPerSec > 1024 * 1024) {
                    return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} Mo/s`;
                } else if (bytesPerSec > 1024) {
                    return `${(bytesPerSec / 1024).toFixed(1)} Ko/s`;
                }
                return `${bytesPerSec} o/s`;
            }
            
            function completeSync() {
                clearInterval(progressInterval);
                
                console.log('sync-loading: sync initial terminé');
                
                if (context?.onProgress) {
                    context.onProgress({
                        percentage: 100,
                        status: 'Synchronisation terminée !'
                    });
                }
                
                // Attendre l'animation puis retourner succès
                setTimeout(() => {
                    syncHandler.cancel();  // Annule le live sync
                    delete window.currentSyncHandler;
                    
                    const duration = Date.now() - startTime;
                    const stats = {
                        documentsReceived: documentCount,
                        bytesTransferred: documentCount * 2000, // Estimation
                        duration: duration
                    };
                    
                    console.log('sync-loading: redirection vers application');
                    
                    // Redirection vers /dashboard
                    window.location.href = '/dashboard';
                    
                    resolve({
                        success: true,
                        data: {
                            synced: true,
                            stats: stats
                        },
                        error: null
                    });
                }, 800);
            }
            
            function handleSyncError(err) {
                clearInterval(progressInterval);
                syncHandler.cancel();
                delete window.currentSyncHandler;
                
                const errorType = categorizeError(err);
                console.log('sync-loading: erreur de sync:', errorType);
                
                let errorMessage = 'Erreur lors de la synchronisation';
                
                switch(errorType) {
                    case 'auth_failed':
                        errorMessage = 'Session expirée. Veuillez vous reconnecter.';
                        if (context?.onError) {
                            context.onError(errorMessage, { redirect: true });
                        }
                        resolve({
                            success: false,
                            data: {
                                synced: false,
                                error: 'auth_failed'
                            },
                            error: errorMessage
                        });
                        return;
                        
                    case 'connection_lost':
                    case 'timeout':
                    default:
                        errorMessage = err.message === 'timeout' 
                            ? 'Délai dépassé. Vérifier votre connexion.' 
                            : 'Connexion perdue.';
                        
                        // Mode hors-ligne disponible
                        if (context?.onOffline) {
                            context.onOffline(errorMessage);
                        }
                        
                        console.log('sync-loading: mode hors-ligne activé');
                        
                        resolve({
                            success: true,
                            data: {
                                synced: false,
                                offline: true,
                                reason: errorType
                            },
                            error: null
                        });
                        return;
                }
            }
            
            function categorizeError(err) {
                if (!err) return 'unknown';
                const msg = (err.message || err.status || '').toString().toLowerCase();
                
                if (msg.includes('unauthorized') || msg.includes('forbidden') || msg.includes('401') || msg.includes('403')) {
                    return 'auth_failed';
                }
                if (msg.includes('timeout') || msg.includes('etimedout')) {
                    return 'timeout';
                }
                if (msg.includes('network') || msg.includes('connection') || msg.includes('econnrefused') || msg.includes('0,')) {
                    return 'connection_lost';
                }
                return 'unknown';
            }
            
            syncHandler.on('change', (info) => {
                console.log('sync-loading: documents reçus:', documentCount + (info.change?.docs?.length || 0));
                
                if (info.change && info.change.docs) {
                    documentCount += info.change.docs.length;
                    updateProgress({
                        documents: documentCount,
                        direction: info.direction  // 'push' ou 'pull'
                    });
                }
            });
            
            syncHandler.on('paused', (err) => {
                console.log('sync-loading: connexion à CouchDB établie');
                if (!err) {
                    // Sync initial terminé (pas d'erreur)
                    completeSync();
                }
            });
            
            syncHandler.on('error', (err) => {
                console.error('sync-loading error:', err);
                handleSyncError(err);
            });
            
        } catch (err) {
            console.error('sync-loading error:', err);
            resolve({
                success: false,
                data: {
                    synced: false,
                    error: 'init_failed'
                },
                error: err.message || 'Erreur lors de la synchronisation'
            });
        }
    });
}

console.log('sync-loading.js loaded');
