/*
 * WORKFLOW: sync-loading
 * Description: Affiche l'écran de synchronisation et gère le processus de sync initial PouchDB
 * 
 * PRIORITÉ ABSOLUE: Implémenté selon .specs/wf-frontend/sync-loading.md
 */

console.log('sync-loading.js loaded');

/**
 * Workflow sync-loading
 * @param {Object} context - Contexte avec localDB, remoteDB
 * @param {Object} params - Paramètres du workflow { session, fromLogin }
 * @returns {Promise<Object>} Résultat { success, data, error }
 */
export async function execute(context, params = {}) {
    console.log('sync-loading: démarrage synchronisation', params);

    const { localDB, remoteDB } = context;
    const { session, fromLogin = true } = params;

    // Validation des entrées
    if (!localDB) {
        console.error('sync-loading: localDB non disponible');
        return {
            success: false,
            data: { synced: false },
            error: 'Base de données locale non initialisée'
        };
    }

    // URL CouchDB - peut être passée dans params ou dans window.COUCHDB_URL
    const couchDbUrl = params.couchDbUrl || window.COUCHDB_URL || 'http://localhost:5984/';
    const dbName = params.dbName || 'marki';

    try {
        // Créer la connexion à la base distante si non fournie
        let remote = remoteDB;
        if (!remote) {
            console.log('sync-loading: connexion à CouchDB établie');
            remote = new PouchDB(`${couchDbUrl}${dbName}`, {
                fetch: (url, opts) => {
                    opts.credentials = 'include';
                    return fetch(url, opts);
                }
            });
        }

        // Variables pour le tracking de progression
        let documentCount = 0;
        let lastUpdate = Date.now();
        let syncCompleted = false;
        let syncError = null;
        let startTime = Date.now();
        let bytesTransferred = 0;

        // Exposer l'état pour Alpine.js (si disponible)
        window.syncLoadingState = {
            percentage: 0,
            documentsReceived: 0,
            status: 'Connexion à la base de données...',
            speed: 0,
            isActive: true
        };

        // Démarrer la synchronisation
        const syncHandler = localDB.sync(remote, {
            live: true,
            retry: true,
            heartbeat: 10000,
            timeout: 30000
        });

        // Exposer le handler pour permettre l'annulation
        window.currentSyncHandler = syncHandler;

        // Créer une promesse qui résout quand le sync est terminé ou échoue
        const syncPromise = new Promise((resolve, reject) => {
            // Détection timeout (pas de changement depuis 30s)
            const progressInterval = setInterval(() => {
                if (Date.now() - lastUpdate > 30000 && !syncCompleted && !syncError) {
                    console.log('sync-loading: timeout détecté');
                    clearInterval(progressInterval);
                    syncHandler.cancel();
                    reject({ type: 'timeout', message: 'Délai d\'attente dépassé' });
                }
            }, 5000);

            // Gérer les changements
            syncHandler.on('change', (info) => {
                lastUpdate = Date.now();

                // Mise à jour du compteur de documents
                if (info.change && info.change.docs) {
                    documentCount += info.change.docs.length;

                    // Estimation des bytes transférés
                    info.change.docs.forEach(doc => {
                        bytesTransferred += JSON.stringify(doc).length;
                    });

                    console.log(`sync-loading: documents reçus: ${documentCount}`);

                    // Calcul de la progression
                    const progress = calculateProgress(documentCount, info.direction);
                    window.syncLoadingState.percentage = progress.percentage;
                    window.syncLoadingState.documentsReceived = documentCount;
                    window.syncLoadingState.status = progress.status;
                    window.syncLoadingState.speed = calculateSpeed(startTime, bytesTransferred);

                    // Dispatcher un événement personnalisé pour Alpine
                    window.dispatchEvent(new CustomEvent('sync-progress', {
                        detail: window.syncLoadingState
                    }));
                }
            });

            // Sync mis en pause (terminé ou en attente)
            syncHandler.on('paused', (err) => {
                if (!err && !syncCompleted && !syncError) {
                    // Sync initial terminé (pas d'erreur)
                    console.log('sync-loading: sync initial terminé');
                    clearInterval(progressInterval);
                    syncCompleted = true;

                    // Animation finale
                    window.syncLoadingState.percentage = 100;
                    window.syncLoadingState.status = 'Synchronisation terminée !';
                    window.dispatchEvent(new CustomEvent('sync-progress', {
                        detail: window.syncLoadingState
                    }));

                    // Attendre l'animation puis résoudre
                    setTimeout(() => {
                        syncHandler.cancel();
                        resolve({
                            synced: true,
                            stats: {
                                documentsReceived: documentCount,
                                bytesTransferred: bytesTransferred,
                                duration: Date.now() - startTime
                            }
                        });
                    }, 800);
                }
            });

            // Erreur de sync
            syncHandler.on('error', (err) => {
                console.log('sync-loading: erreur de sync:', err);
                lastUpdate = Date.now();
                clearInterval(progressInterval);
                syncError = err;
                syncHandler.cancel();
                reject(err);
            });
        });

        // Attendre la fin du sync ou une erreur
        const result = await syncPromise;

        console.log('sync-loading: redirection vers application');

        return {
            success: true,
            data: result,
            error: null
        };

    } catch (err) {
        console.log('sync-loading: gestion erreur:', err.message || err);

        const errorType = categorizeError(err);

        switch (errorType) {
            case 'auth_failed':
                return {
                    success: false,
                    data: {
                        synced: false,
                        error: 'auth_failed',
                        redirect: true
                    },
                    error: 'Session expirée. Veuillez vous reconnecter.'
                };

            case 'connection_lost':
            case 'timeout':
                console.log('sync-loading: mode hors-ligne activé');
                return {
                    success: true,
                    data: {
                        synced: false,
                        offline: true,
                        reason: 'connection_lost'
                    },
                    error: null
                };

            default:
                console.log('sync-loading: mode hors-ligne activé (erreur inconnue)');
                return {
                    success: true,
                    data: {
                        synced: false,
                        offline: true,
                        reason: 'unknown_error'
                    },
                    error: null
                };
        }
    } finally {
        // Nettoyage
        if (window.syncLoadingState) {
            window.syncLoadingState.isActive = false;
        }
        window.currentSyncHandler = null;
    }
}

/**
 * Calcule la progression de la synchronisation
 * Stratégie: 0-20% connexion, 20-80% transfert, 80-100% finalisation
 * @param {number} documents - Nombre de documents reçus
 * @param {string} direction - 'push' ou 'pull'
 * @returns {Object} { percentage, status }
 */
function calculateProgress(documents, direction) {
    const estimatedMaxDocs = 2000; // Estimation pour la progression
    let percentage;
    let status;

    if (direction === 'pull') {
        // Téléchargement des documents
        const progressPercent = Math.min(
            20 + (documents / estimatedMaxDocs) * 60,
            80
        );
        percentage = Math.round(progressPercent);
        status = `Téléchargement des documents... (${documents} reçus)`;
    } else if (direction === 'push') {
        // Envoi des documents
        const progressPercent = Math.min(
            20 + (documents / estimatedMaxDocs) * 60,
            80
        );
        percentage = Math.round(progressPercent);
        status = `Envoi des documents... (${documents} envoyés)`;
    } else {
        // Sans direction connue, on est encore en connexion
        percentage = Math.min(20, documents / 10);
        status = 'Connexion et authentification...';
    }

    return { percentage, status };
}

/**
 * Calcule la vitesse de transfert
 * @param {number} startTime - Timestamp de début
 * @param {number} bytes - Bytes transférés
 * @returns {string} Vitesse formatée (ex: "125 KB/s")
 */
function calculateSpeed(startTime, bytes) {
    const duration = (Date.now() - startTime) / 1000; // en secondes
    if (duration === 0) return '0 KB/s';

    const bytesPerSecond = bytes / duration;

    if (bytesPerSecond > 1024 * 1024) {
        return `${(bytesPerSecond / (1024 * 1024)).toFixed(1)} MB/s`;
    } else if (bytesPerSecond > 1024) {
        return `${(bytesPerSecond / 1024).toFixed(1)} KB/s`;
    } else {
        return `${Math.round(bytesPerSecond)} B/s`;
    }
}

/**
 * Catégorise une erreur PouchDB
 * @param {Error} err - L'erreur à catégoriser
 * @returns {string} Type d'erreur: 'auth_failed', 'connection_lost', 'timeout', 'unknown'
 */
function categorizeError(err) {
    const message = (err.message || err.status || '').toString().toLowerCase();

    if (message.includes('unauthorized') ||
        message.includes('forbidden') ||
        message.includes('auth') ||
        err.status === 401 ||
        err.status === 403) {
        return 'auth_failed';
    }

    if (message.includes('timeout') ||
        message.includes('etimedout') ||
        message.includes('econnaborted')) {
        return 'timeout';
    }

    if (message.includes('network') ||
        message.includes('connection') ||
        message.includes('econnrefused') ||
        message.includes('offline') ||
        err.status === 0) {
        return 'connection_lost';
    }

    return 'unknown';
}

/**
 * Annule la synchronisation en cours
 * Peut être appelé depuis l'UI pour annuler le sync
 */
export function cancelSync() {
    console.log('sync-loading: annulé par l\'utilisateur');
    if (window.currentSyncHandler) {
        window.currentSyncHandler.cancel();
        window.currentSyncHandler = null;
    }
    if (window.syncLoadingState) {
        window.syncLoadingState.isActive = false;
    }
}

// Exposer la fonction d'annulation globalement
window.cancelSyncLoading = cancelSync;
