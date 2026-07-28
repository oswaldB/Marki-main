console.log('sync-loading.js loaded');

/**
 * Workflow sync-loading
 * Gère la synchronisation PouchDB après connexion réussie
 * @param {Object} context - Contexte avec localDB, remoteDB, ui
 * @param {Object} params - Paramètres du workflow: session, fromLogin
 * @returns {Promise<Object>} Résultat { success, data, error }
 */
export async function execute(context, params = {}) {
    const { session, fromLogin = true } = params;
    
    console.log('sync-loading workflow executing', { session, fromLogin });
    console.log('sync-loading: démarrage synchronisation');

    const { localDB, remoteDB, ui } = context;
    
    // Vérifications
    if (!localDB) {
        console.error('sync-loading: localDB non disponible');
        return {
            success: false,
            data: { synced: false, error: 'local_db_unavailable' },
            error: 'Base de données locale non disponible'
        };
    }

    return new Promise((resolve) => {
        let syncHandler = null;
        let progressInterval = null;
        let lastUpdate = Date.now();
        let documentCount = 0;
        let startTime = Date.now();
        let isCompleted = false;
        let bytesTransferred = 0;

        // Fonction pour mettre à jour l'UI
        const updateUI = (state) => {
            if (ui && ui.updateSyncProgress) {
                ui.updateSyncProgress(state);
            }
            // Également émettre un événement global pour Alpine.js
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('sync-progress', { detail: state }));
            }
        };

        // Fonction pour calculer la vitesse
        const calculateSpeed = () => {
            const elapsed = (Date.now() - startTime) / 1000;
            if (elapsed === 0) return 0;
            return Math.round(documentCount / elapsed);
        };

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
                baseProgress + (documentCount / estimatedMaxDocs) * 60,
                80
            );
            
            updateUI({
                percentage: Math.round(progressPercent),
                documentsReceived: documentCount,
                status: `Téléchargement des documents...`,
                speed: calculateSpeed()
            });
            
            console.log('sync-loading: documents reçus:', documentCount);
        };

        // Fonction pour finaliser la sync
        const completeSync = () => {
            if (isCompleted) return;
            isCompleted = true;
            
            clearInterval(progressInterval);
            
            const duration = Date.now() - startTime;
            
            // Animation finale
            updateUI({
                percentage: 100,
                status: 'Synchronisation terminée !'
            });
            
            console.log('sync-loading: sync initial terminé');
            
            // Attendre l'animation puis retourner succès
            setTimeout(() => {
                if (syncHandler && syncHandler.cancel) {
                    syncHandler.cancel();
                }
                
                console.log('sync-loading: redirection vers application');
                
                resolve({
                    success: true,
                    data: {
                        synced: true,
                        stats: {
                            documentsReceived: documentCount,
                            bytesTransferred: bytesTransferred,
                            duration: duration
                        }
                    },
                    error: null
                });
            }, 800);
        };

        // Fonction pour catégoriser les erreurs
        const categorizeError = (err) => {
            const msg = (err.message || err.error || '').toLowerCase();
            
            if (msg.includes('unauthorized') || msg.includes('authentication') || msg.includes('auth')) {
                return 'auth_failed';
            }
            if (msg.includes('timeout') || msg.includes('etimedout')) {
                return 'timeout';
            }
            if (msg.includes('network') || msg.includes('connection') || msg.includes('econnrefused')) {
                return 'connection_lost';
            }
            return 'unknown';
        };

        // Fonction pour afficher l'option hors-ligne
        const showOfflineOption = () => {
            updateUI({
                percentage: 0,
                status: 'Mode hors-ligne disponible',
                showOffline: true
            });
        };

        // Fonction pour gérer les erreurs
        const handleSyncError = (err) => {
            if (isCompleted) return;
            isCompleted = true;
            
            clearInterval(progressInterval);
            
            const errorType = categorizeError(err);
            console.log('sync-loading: erreur de sync:', errorType, err);
            
            switch(errorType) {
                case 'auth_failed':
                    resolve({
                        success: false,
                        data: { 
                            synced: false, 
                            error: 'auth_failed',
                            redirect: true 
                        },
                        error: 'Session expirée. Veuillez vous reconnecter.'
                    });
                    break;
                    
                case 'connection_lost':
                case 'timeout':
                    console.log('sync-loading: mode hors-ligne activé');
                    showOfflineOption();
                    resolve({
                        success: true,
                        data: {
                            synced: false,
                            offline: true,
                            reason: 'connection_lost'
                        },
                        error: null
                    });
                    break;
                    
                default:
                    showOfflineOption();
                    resolve({
                        success: false,
                        data: {
                            synced: false,
                            error: errorType
                        },
                        error: `Erreur lors de la synchronisation: ${err.message || err.error || 'erreur inconnue'}`
                    });
            }
        };

        try {
            // Initialiser l'UI
            updateUI({
                percentage: 0,
                status: 'Connexion à CouchDB...',
                documentsReceived: 0,
                speed: 0
            });

            // Configuration du sync
            let syncOptions = {
                live: true,
                retry: true
            };

            // Si on a remoteDB dans le contexte, l'utiliser
            // Sinon créer la connexion
            let remoteDbInstance = remoteDB;
            if (!remoteDbInstance && typeof window !== 'undefined' && window.PouchDB) {
                const COUCHDB_URL = window.MARKI_COUCHDB_URL || 'http://localhost:5984/';
                remoteDbInstance = new window.PouchDB(`${COUCHDB_URL}marki`, {
                    fetch: (url, opts) => {
                        opts.credentials = 'include';
                        return fetch(url, opts);
                    }
                });
            }

            if (!remoteDbInstance) {
                throw new Error('RemoteDB non disponible');
            }

            console.log('sync-loading: connexion à CouchDB établie');

            // Démarrer la synchronisation
            syncHandler = localDB.sync(remoteDbInstance, syncOptions);
            
            // Exposer le handler pour permettre l'annulation
            if (typeof window !== 'undefined') {
                window.currentSyncHandler = syncHandler;
            }

            // Gérer les événements de sync
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
                if (!err && !isCompleted) {
                    // Sync initial terminé (pas d'erreur)
                    completeSync();
                }
            });

            syncHandler.on('error', (err) => {
                handleSyncError(err);
            });

            // Détection timeout (pas de changement depuis 30s)
            progressInterval = setInterval(() => {
                if (isCompleted) {
                    clearInterval(progressInterval);
                    return;
                }
                
                if (Date.now() - lastUpdate > 30000) {
                    handleSyncError({ message: 'timeout' });
                }
            }, 5000);

            // Gestion de l'annulation par l'utilisateur
            const handleCancel = () => {
                console.log('sync-loading: annulé par l\'utilisateur');
                if (syncHandler && syncHandler.cancel) {
                    syncHandler.cancel();
                }
                clearInterval(progressInterval);
                isCompleted = true;
                
                resolve({
                    success: false,
                    data: {
                        synced: false,
                        cancelled: true
                    },
                    error: 'Synchronisation annulée par l\'utilisateur'
                });
            };

            // Écouter l'événement d'annulation
            if (typeof window !== 'undefined') {
                window.addEventListener('sync-cancel', handleCancel, { once: true });
            }

        } catch (err) {
            console.error('sync-loading error:', err);
            handleSyncError(err);
        }
    });
}
