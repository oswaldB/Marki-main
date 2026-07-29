console.log('sync-loading.js loaded');

/**
 * Workflow sync-loading
 * Gère la synchronisation initiale PouchDB après connexion réussie
 * @param {Object} context - Contexte avec localDB, remoteDB
 * @param {Object} params - Paramètres du workflow (session, fromLogin)
 * @returns {Promise<Object>} Résultat { success, data, error }
 */
export async function execute(context, params = {}) {
    console.log('sync-loading: démarrage synchronisation', params);

    const { localDB, remoteDB, couchDbUrl } = context || {};
    const { session, fromLogin = true } = params;

    return new Promise((resolve) => {
        let syncHandler = null;
        let progressInterval = null;
        let lastUpdate = Date.now();
        let documentCount = 0;
        let bytesTransferred = 0;
        const startTime = Date.now();

        // Nettoyage du handler précédent si existe
        if (window.currentSyncHandler) {
            window.currentSyncHandler.cancel();
            window.currentSyncHandler = null;
        }

        // Vérifier si on est en mode hors-ligne
        if (!navigator.onLine) {
            console.log('sync-loading: mode hors-ligne détecté');
            resolve({
                success: true,
                data: {
                    synced: false,
                    offline: true,
                    reason: 'no_connection'
                },
                error: null
            });
            return;
        }

        // Initialiser PouchDB si pas fourni dans le contexte
        let localDb = localDB;
        let remoteDb = remoteDB;

        try {
            if (!localDb && typeof PouchDB !== 'undefined') {
                localDb = new PouchDB('marki');
            }
            if (!remoteDb && typeof PouchDB !== 'undefined' && couchDbUrl) {
                remoteDb = new PouchDB(`${couchDbUrl}/marki`, {
                    fetch: (url, opts) => {
                        opts.credentials = 'include';
                        return fetch(url, opts);
                    }
                });
            }
        } catch (err) {
            console.error('sync-loading: erreur initialisation PouchDB', err);
            resolve({
                success: false,
                data: { synced: false },
                error: `Erreur lors de la synchronisation: ${err.message}`
            });
            return;
        }

        // Fonction pour mettre à jour la progression UI
        function updateProgressUI({ percentage, documentsReceived, status, speed }) {
            // Émettre un événement custom que l'UI peut écouter
            window.dispatchEvent(new CustomEvent('sync-progress', {
                detail: { percentage, documentsReceived, status, speed }
            }));
        }

        // Calculer la vitesse de transfert
        function calculateSpeed() {
            const elapsed = (Date.now() - startTime) / 1000;
            if (elapsed < 1) return 0;
            return Math.round(documentCount / elapsed);
        }

        // Mettre à jour la progression
        function updateProgress({ documents, direction }) {
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

            updateProgressUI({
                percentage: Math.round(progressPercent),
                documentsReceived: documents,
                status: `Téléchargement des documents...`,
                speed: calculateSpeed()
            });
        }

        // Finalisation de la sync
        function completeSync() {
            clearInterval(progressInterval);

            console.log('sync-loading: sync initial terminé');

            // Animation finale
            updateProgressUI({
                percentage: 100,
                status: 'Synchronisation terminée !',
                documentsReceived: documentCount
            });

            // Collecter les stats
            const stats = {
                documentsReceived: documentCount,
                bytesTransferred: bytesTransferred,
                duration: Date.now() - startTime
            };

            // Attendre l'animation puis retourner succès
            setTimeout(() => {
                if (syncHandler) {
                    syncHandler.cancel();
                }
                window.currentSyncHandler = null;

                console.log('sync-loading: redirection vers application');

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

        // Gérer les erreurs
        function handleSyncError(err) {
            clearInterval(progressInterval);

            console.error('sync-loading: erreur de sync:', err.message || err);

            if (syncHandler) {
                syncHandler.cancel();
            }
            window.currentSyncHandler = null;

            const errorMessage = err.message || String(err);
            let errorType = 'unknown';

            if (errorMessage.includes('unauthorized') || errorMessage.includes('authentication')) {
                errorType = 'auth_failed';
            } else if (errorMessage.includes('timeout') || errorMessage.includes('ETIMEDOUT')) {
                errorType = 'timeout';
            } else if (errorMessage.includes('network') || errorMessage.includes('connection') || !navigator.onLine) {
                errorType = 'connection_lost';
            }

            resolve({
                success: false,
                data: {
                    synced: false,
                    error: errorType
                },
                error: `Erreur lors de la synchronisation: ${errorMessage}`
            });
        }

        // Vérifier le timeout
        function checkTimeout() {
            if (Date.now() - lastUpdate > 30000) {
                handleSyncError({ message: 'timeout' });
            }
        }

        // Démarrer la synchronisation
        try {
            if (!localDb || !remoteDb) {
                throw new Error('PouchDB non disponible');
            }

            console.log('sync-loading: connexion à CouchDB établie');

            // Initialiser la barre de progression
            updateProgressUI({
                percentage: 0,
                documentsReceived: 0,
                status: 'Connexion à la base de données...',
                speed: 0
            });

            // Démarrer le sync avec retry
            syncHandler = localDb.sync(remoteDb, {
                live: true,
                retry: true,
                heartbeat: 10000,
                timeout: 30000
            });

            // Exposer le handler pour permettre l'annulation
            window.currentSyncHandler = syncHandler;

            // Événement: changement
            syncHandler.on('change', (info) => {
                if (info.change && info.change.docs) {
                    const docs = info.change.docs.length;
                    documentCount += docs;
                    console.log(`sync-loading: documents reçus: ${documentCount}`);
                    updateProgress({
                        documents: documentCount,
                        direction: info.direction
                    });
                }
            });

            // Événement: paused (sync initial terminé)
            syncHandler.on('paused', (err) => {
                if (!err) {
                    completeSync();
                }
            });

            // Événement: erreur
            syncHandler.on('error', (err) => {
                handleSyncError(err);
            });

            // Événement: denied
            syncHandler.on('denied', (err) => {
                console.warn('sync-loading: accès refusé', err);
            });

            // Détection timeout
            progressInterval = setInterval(checkTimeout, 5000);

        } catch (err) {
            handleSyncError(err);
        }
    });
}
