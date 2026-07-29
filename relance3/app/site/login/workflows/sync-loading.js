/**
 * Workflow sync-loading
 * Affiche l'écran de synchronisation et gère le sync PouchDB initial
 * 
 * @param {Object} context - Contexte avec localDB, remoteDB, COUCHDB_URL
 * @param {Object} params - Paramètres du workflow (session, fromLogin)
 * @returns {Promise<Object>} Résultat { success, data, error }
 */

console.log('sync-loading.js loaded');

export async function execute(context, params = {}) {
    console.log('sync-loading workflow executing', params);
    
    const { COUCHDB_URL } = context;
    const { session, fromLogin = true } = params;
    
    // Handler de sync exposé globalement pour annulation
    window.currentSyncHandler = null;
    
    return new Promise((resolve) => {
        try {
            console.log('sync-loading: démarrage synchronisation');
            
            // PouchDB est disponible globalement (CDN)
            const localDb = new PouchDB('marki');
            const remoteDb = new PouchDB(`${COUCHDB_URL}marki`, {
                fetch: (url, opts) => {
                    opts.credentials = 'include';
                    return fetch(url, opts);
                }
            });
            
            const startTime = Date.now();
            let lastUpdate = Date.now();
            let documentCount = 0;
            let syncCompleted = false;
            let progressInterval = null;
            
            // Démarrer le sync live
            const syncHandler = localDb.sync(remoteDb, {
                live: true,
                retry: true,
                heartbeat: 10000,
                timeout: 30000
            });
            
            window.currentSyncHandler = syncHandler;
            
            // Fonction pour mettre à jour la progression
            const updateProgress = ({ documents, direction }) => {
                lastUpdate = Date.now();
                documentCount = documents;
                
                // Stratégie de progression:
                // - 0-20%: Connexion et authentification
                // - 20-80%: Transfert des documents (estimation)
                // - 80-100%: Finalisation
                const baseProgress = direction === 'pull' ? 20 : 0;
                const estimatedMaxDocs = 2000;
                const progressPercent = Math.min(
                    baseProgress + (documents / estimatedMaxDocs) * 60,
                    80
                );
                
                const elapsed = Date.now() - startTime;
                const speed = elapsed > 0 ? Math.round((documents / elapsed) * 1000) : 0;
                
                console.log(`sync-loading: documents reçus: ${documents}`);
                
                // Notifier l'UI via événement personnalisé
                window.dispatchEvent(new CustomEvent('sync-progress', {
                    detail: {
                        percentage: Math.round(progressPercent),
                        documentsReceived: documents,
                        status: 'Téléchargement des documents...',
                        speed: speed
                    }
                }));
            };
            
            // Collecter les stats finales
            const collectStats = () => {
                const duration = Date.now() - startTime;
                const bytesTransferred = documentCount * 2000; // Estimation moyenne
                
                return {
                    documentsReceived: documentCount,
                    bytesTransferred: bytesTransferred,
                    duration: duration
                };
            };
            
            // Finalisation du sync
            const completeSync = () => {
                if (syncCompleted) return;
                syncCompleted = true;
                
                clearInterval(progressInterval);
                
                console.log('sync-loading: sync initial terminé');
                console.log('sync-loading: redirection vers application');
                
                // Notifier l'UI
                window.dispatchEvent(new CustomEvent('sync-progress', {
                    detail: {
                        percentage: 100,
                        status: 'Synchronisation terminée !'
                    }
                }));
                
                // Attendre l'animation puis résoudre
                setTimeout(() => {
                    if (window.currentSyncHandler) {
                        window.currentSyncHandler.cancel();
                        window.currentSyncHandler = null;
                    }
                    
                    resolve({
                        success: true,
                        data: {
                            synced: true,
                            stats: collectStats()
                        },
                        error: null
                    });
                }, 800);
            };
            
            // Gestion des erreurs
            const categorizeError = (err) => {
                const msg = err.message || err.toString();
                if (msg.includes('unauthorized') || msg.includes('authentication')) {
                    return 'auth_failed';
                } else if (msg.includes('timeout')) {
                    return 'timeout';
                } else if (msg.includes('network') || msg.includes('connection')) {
                    return 'connection_lost';
                }
                return 'unknown';
            };
            
            const handleSyncError = (err) => {
                if (syncCompleted) return;
                syncCompleted = true;
                
                clearInterval(progressInterval);
                
                const errorType = categorizeError(err);
                console.log(`sync-loading: erreur de sync: ${errorType}`);
                
                if (window.currentSyncHandler) {
                    window.currentSyncHandler.cancel();
                    window.currentSyncHandler = null;
                }
                
                switch (errorType) {
                    case 'auth_failed':
                        resolve({
                            success: false,
                            data: {
                                synced: false,
                                error: 'auth_failed'
                            },
                            error: 'Session expirée. Veuillez vous reconnecter.'
                        });
                        break;
                    case 'connection_lost':
                    case 'timeout':
                        resolve({
                            success: true,
                            data: {
                                synced: false,
                                offline: true,
                                reason: errorType
                            },
                            error: null
                        });
                        break;
                    default:
                        resolve({
                            success: false,
                            data: {
                                synced: false,
                                error: errorType
                            },
                            error: `Erreur lors de la synchronisation: ${err.message || err}`
                        });
                }
            };
            
            // Événements de sync
            syncHandler.on('change', (info) => {
                if (info.change && info.change.docs) {
                    documentCount += info.change.docs.length;
                    updateProgress({
                        documents: documentCount,
                        direction: info.direction
                    });
                }
            });
            
            syncHandler.on('paused', (err) => {
                if (!err && !syncCompleted) {
                    // Sync initial terminé (pas d'erreur)
                    completeSync();
                }
            });
            
            syncHandler.on('error', (err) => {
                handleSyncError(err);
            });
            
            // Détection timeout (pas de changement depuis 30s)
            progressInterval = setInterval(() => {
                if (Date.now() - lastUpdate > 30000 && !syncCompleted) {
                    console.log('sync-loading: timeout détecté');
                    handleSyncError({ message: 'timeout' });
                }
            }, 5000);
            
            // Gestion de l'annulation par l'utilisateur
            window.addEventListener('sync-cancel', () => {
                console.log('sync-loading: annulé par l\'utilisateur');
                if (window.currentSyncHandler) {
                    window.currentSyncHandler.cancel();
                    window.currentSyncHandler = null;
                }
                clearInterval(progressInterval);
                
                resolve({
                    success: false,
                    data: {
                        synced: false,
                        cancelled: true
                    },
                    error: 'Synchronisation annulée par l\'utilisateur'
                });
            }, { once: true });
            
        } catch (err) {
            console.error('sync-loading error:', err);
            resolve({
                success: false,
                data: {
                    synced: false,
                    error: 'init_failed'
                },
                error: err.message
            });
        }
    });
}
