/*
INSTRUCTIONS IA - À APPLIQUER:
=============================

PRIORITÉ ABSOLUE: LIT EN PREMIER .specs/page-specs.md

1. NOM DU WORKFLOW: sync-loading

2. SPECS: Implémenter selon:
   - .specs/wf-frontend/sync-loading.md
   - /home/ubuntu/marki/relance3/app/site/login/.specs/wf-frontend/sync-loading.md

3. FONCTION: Export nommé execute(context, params) qui:
   - Prend context (avec localDB, remoteDB, etc.)
   - Prend params (paramètres du workflow)
   - Retourne { success: true/false, data: {}, error: string }

4. CONSOLE: Logger 'sync-loading.js loaded' au chargement
*/

console.log('sync-loading.js loaded');

// Constantes de configuration
const COUCHDB_URL = window.COUCHDB_URL || 'http://localhost:5984/';
const SYNC_TIMEOUT = 30000; // 30 secondes
const HEARTBEAT = 10000; // 10 secondes
const ESTIMATED_MAX_DOCS = 2000;

/**
 * Workflow sync-loading
 * Affiche l'écran de synchronisation et gère le processus de sync initial PouchDB
 * @param {Object} context - Contexte avec localDB, remoteDB
 * @param {Object} params - Paramètres du workflow (session, fromLogin)
 * @returns {Promise<Object>} Résultat { success, data, error }
 */
export async function execute(context, params = {}) {
    console.log('sync-loading: démarrage synchronisation', params);
    
    const { session, fromLogin = true } = params;
    
    let syncHandler = null;
    let progressInterval = null;
    let lastUpdate = Date.now();
    let documentCount = 0;
    let startTime = Date.now();
    let stats = {
        documentsReceived: 0,
        bytesTransferred: 0,
        duration: 0
    };
    
    return new Promise((resolve) => {
        try {
            // Récupérer les instances PouchDB depuis le contexte ou créer les instances locales
            const localDb = context?.localDB || new PouchDB('marki');
            const remoteDb = context?.remoteDB || new PouchDB(`${COUCHDB_URL}marki`, {
                fetch: (url, opts) => {
                    opts.credentials = 'include';
                    return fetch(url, opts);
                }
            });
            
            console.log('sync-loading: connexion à CouchDB établie');
            
            // Démarrer la synchronisation live
            syncHandler = localDb.sync(remoteDb, {
                live: true,
                retry: true,
                heartbeat: HEARTBEAT,
                timeout: SYNC_TIMEOUT
            });
            
            // Exposer le handler pour permettre l'annulation externe
            window.currentSyncHandler = syncHandler;
            
            // Gestionnaire d'événements de changement
            syncHandler.on('change', (info) => {
                lastUpdate = Date.now();
                
                // Mise à jour du compteur de documents
                if (info.change && info.change.docs) {
                    documentCount += info.change.docs.length;
                    stats.documentsReceived = documentCount;
                    
                    console.log(`sync-loading: documents reçus: ${documentCount}`);
                    
                    // Mettre à jour la progression via context UI si disponible
                    if (context?.updateProgress) {
                        const progress = calculateProgress(documentCount, info.direction);
                        context.updateProgress({
                            percentage: progress,
                            documentsReceived: documentCount,
                            status: `Téléchargement des documents...`,
                            direction: info.direction
                        });
                    }
                }
            });
            
            // Sync mis en pause (sync initial terminé)
            syncHandler.on('paused', (err) => {
                if (!err) {
                    console.log('sync-loading: sync initial terminé');
                    completeSync();
                }
            });
            
            // Erreur de synchronisation
            syncHandler.on('error', (err) => {
                console.log('sync-loading: erreur de sync:', err.message || err);
                handleSyncError(err);
            });
            
            // Détection timeout (pas de changement depuis 30s)
            progressInterval = setInterval(() => {
                if (Date.now() - lastUpdate > SYNC_TIMEOUT) {
                    console.log('sync-loading: timeout détecté');
                    handleSyncError({ message: 'timeout' });
                }
            }, 5000);
            
            // Fonction pour calculer la progression
            function calculateProgress(docs, direction) {
                const baseProgress = direction === 'pull' ? 20 : 0;
                const progressPercent = Math.min(
                    baseProgress + (docs / ESTIMATED_MAX_DOCS) * 60,
                    80
                );
                return Math.round(progressPercent);
            }
            
            // Fonction de finalisation du sync
            function completeSync() {
                clearInterval(progressInterval);
                
                stats.duration = Date.now() - startTime;
                
                // Mettre à jour la progression finale
                if (context?.updateProgress) {
                    context.updateProgress({
                        percentage: 100,
                        documentsReceived: documentCount,
                        status: 'Synchronisation terminée !'
                    });
                }
                
                console.log('sync-loading: redirection vers application');
                
                // Annuler le live sync (sera redémarré dans main.js si nécessaire)
                if (syncHandler) {
                    syncHandler.cancel();
                    window.currentSyncHandler = null;
                }
                
                // Attendre l'animation puis retourner succès
                setTimeout(() => {
                    resolve({
                        success: true,
                        data: {
                            synced: true,
                            stats: {
                                documentsReceived: stats.documentsReceived,
                                bytesTransferred: stats.bytesTransferred,
                                duration: stats.duration
                            }
                        },
                        error: null
                    });
                }, 800);
            }
            
            // Fonction de gestion des erreurs
            function handleSyncError(err) {
                clearInterval(progressInterval);
                
                if (syncHandler) {
                    syncHandler.cancel();
                    window.currentSyncHandler = null;
                }
                
                const errorType = categorizeError(err);
                
                switch(errorType) {
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
                        console.log('sync-loading: mode hors-ligne activé');
                        resolve({
                            success: true,
                            data: {
                                synced: false,
                                offline: true,
                                reason: errorType === 'timeout' ? 'timeout' : 'connection_lost'
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
                            error: `Erreur lors de la synchronisation: ${err.message || errorType}`
                        });
                }
            }
            
            // Fonction de catégorisation des erreurs
            function categorizeError(err) {
                const message = (err.message || '').toLowerCase();
                const status = err.status || err.code;
                
                if (status === 401 || message.includes('unauthorized') || message.includes('auth')) {
                    return 'auth_failed';
                }
                if (message.includes('timeout') || message.includes('etimedout')) {
                    return 'timeout';
                }
                if (message.includes('network') || message.includes('connection') || status === 0) {
                    return 'connection_lost';
                }
                return 'unknown';
            }
            
        } catch (err) {
            clearInterval(progressInterval);
            console.error('sync-loading: erreur critique:', err);
            resolve({
                success: false,
                data: {
                    synced: false,
                    error: 'init_error'
                },
                error: `Erreur lors de l'initialisation: ${err.message}`
            });
        }
    });
}

/**
 * Fonction utilitaire pour annuler le sync en cours
 * Peut être appelée depuis l'UI
 */
export function cancelSync() {
    console.log('sync-loading: annulé par l\'utilisateur');
    if (window.currentSyncHandler) {
        window.currentSyncHandler.cancel();
        window.currentSyncHandler = null;
    }
}
