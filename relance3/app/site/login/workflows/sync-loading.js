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

// URL de CouchDB depuis la config globale ou variable d'environnement
const COUCHDB_URL = window.MARKI_CONFIG?.COUCHDB_URL || 'http://localhost:5984/';

/**
 * Categorise l'erreur de sync
 * @param {Error} err - L'erreur retournée par PouchDB
 * @returns {string} Type d'erreur: 'auth_failed' | 'connection_lost' | 'timeout' | 'unknown'
 */
function categorizeError(err) {
    if (!err) return 'unknown';
    
    const message = err.message || String(err);
    
    if (message.includes('unauthorized') || message.includes('Authentication')) {
        return 'auth_failed';
    }
    if (message.includes('timeout') || err.code === 'ETIMEDOUT') {
        return 'timeout';
    }
    if (message.includes('network') || message.includes('ECONNREFUSED') || message.includes('fetch')) {
        return 'connection_lost';
    }
    
    return 'unknown';
}

/**
 * Calcule la vitesse de transfert estimée
 * @param {number} bytes - Nombre d'octets transférés
 * @param {number} duration - Durée en ms
 * @returns {string} Vitesse formatée (ex: "245 KB/s")
 */
function calculateSpeed(bytes, duration) {
    if (!duration || duration === 0) return '0 KB/s';
    const bytesPerSecond = (bytes / duration) * 1000;
    if (bytesPerSecond < 1024) {
        return `${Math.round(bytesPerSecond)} B/s`;
    }
    if (bytesPerSecond < 1024 * 1024) {
        return `${Math.round(bytesPerSecond / 1024)} KB/s`;
    }
    return `${(bytesPerSecond / (1024 * 1024)).toFixed(1)} MB/s`;
}

/**
 * Workflow sync-loading
 * Gère la synchronisation initiale PouchDB après connexion
 * @param {Object} context - Contexte avec localDB, remoteDB
 * @param {Object} params - Paramètres du workflow (session, fromLogin)
 * @returns {Promise<Object>} Résultat { success, data, error }
 */
export async function execute(context, params = {}) {
    console.log('sync-loading: démarrage synchronisation', params);
    
    const { session, fromLogin = true } = params;
    const startTime = Date.now();
    
    // Vérifier que PouchDB est disponible globalement
    if (typeof window.PouchDB === 'undefined') {
        console.error('sync-loading: PouchDB non disponible');
        return {
            success: false,
            data: { synced: false },
            error: 'PouchDB n\'est pas chargé'
        };
    }
    
    try {
        // Initialiser les bases de données
        const localDb = new window.PouchDB('marki');
        const remoteDb = new window.PouchDB(`${COUCHDB_URL}marki`, {
            fetch: (url, opts) => {
                opts.credentials = 'include';
                return fetch(url, opts);
            }
        });
        
        console.log('sync-loading: connexion à CouchDB établie');
        
        // Variables de suivi de la sync
        let lastUpdate = Date.now();
        let documentCount = 0;
        let bytesTransferred = 0;
        let syncCompleted = false;
        let syncError = null;
        
        // Créer le handler de sync
        const syncHandler = localDb.sync(remoteDb, {
            live: true,
            retry: true,
            heartbeat: 10000,
            timeout: 30000
        });
        
        // Exposer le handler pour permettre l'annulation externe
        window.currentSyncHandler = syncHandler;
        
        // Retourner une promesse qui résout à la fin de la sync initiale
        return new Promise((resolve) => {
            // Détection timeout (pas de changement depuis 30s)
            const progressInterval = setInterval(() => {
                if (Date.now() - lastUpdate > 30000 && !syncCompleted) {
                    syncError = { message: 'timeout' };
                    handleSyncError(syncError, progressInterval, syncHandler, resolve);
                }
            }, 5000);
            
            // Gérer les événements de changement
            syncHandler.on('change', (info) => {
                lastUpdate = Date.now();
                
                if (info.change && info.change.docs) {
                    documentCount += info.change.docs.length;
                    
                    // Estimation des bytes transférés (approximation)
                    const docSize = JSON.stringify(info.change.docs).length;
                    bytesTransferred += docSize;
                    
                    console.log(`sync-loading: documents reçus: ${documentCount}`);
                    
                    // Mettre à jour la progression via le contexte si disponible
                    if (context && typeof context.updateProgress === 'function') {
                        const progress = calculateProgress(documentCount, info.direction);
                        const speed = calculateSpeed(bytesTransferred, Date.now() - startTime);
                        context.updateProgress({
                            percentage: progress,
                            documentsReceived: documentCount,
                            status: 'Téléchargement des documents...',
                            speed: speed
                        });
                    }
                }
            });
            
            // Sync initial terminé (paused sans erreur)
            syncHandler.on('paused', (err) => {
                if (!err && !syncCompleted) {
                    syncCompleted = true;
                    clearInterval(progressInterval);
                    
                    console.log('sync-loading: sync initial terminé');
                    
                    // Finaliser la progression
                    if (context && typeof context.updateProgress === 'function') {
                        context.updateProgress({
                            percentage: 100,
                            status: 'Synchronisation terminée !'
                        });
                    }
                    
                    // Attendre l'animation finale
                    setTimeout(() => {
                        syncHandler.cancel();
                        delete window.currentSyncHandler;
                        
                        const duration = Date.now() - startTime;
                        
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
                }
            });
            
            // Gérer les erreurs
            syncHandler.on('error', (err) => {
                if (!syncCompleted) {
                    syncError = err;
                    handleSyncError(err, progressInterval, syncHandler, resolve);
                }
            });
        });
        
    } catch (err) {
        console.error('sync-loading: erreur de sync:', err.message);
        return handleSyncError(err, null, null, null);
    }
}

/**
 * Calcule la progression estimée
 * @param {number} documents - Nombre de documents reçus
 * @param {string} direction - Direction de sync ('push' ou 'pull')
 * @returns {number} Pourcentage de progression (0-100)
 */
function calculateProgress(documents, direction) {
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
    
    return Math.round(progressPercent);
}

/**
 * Gère les erreurs de synchronisation
 * @param {Error} err - L'erreur survenue
 * @param {number|null} progressInterval - L'intervalle de progression à clear
 * @param {Object|null} syncHandler - Le handler de sync à annuler
 * @param {Function|null} resolve - La fonction resolve de la promesse
 * @returns {Object} Résultat d'erreur
 */
function handleSyncError(err, progressInterval, syncHandler, resolve) {
    if (progressInterval) {
        clearInterval(progressInterval);
    }
    
    if (syncHandler) {
        syncHandler.cancel();
        delete window.currentSyncHandler;
    }
    
    const errorType = categorizeError(err);
    let errorMessage = 'Erreur lors de la synchronisation';
    let data = { synced: false };
    
    switch (errorType) {
        case 'auth_failed':
            errorMessage = 'Session expirée. Veuillez vous reconnecter.';
            data.error = 'auth_failed';
            data.redirect = true;
            break;
        case 'connection_lost':
            errorMessage = 'Connexion perdue. Vous pouvez continuer en mode hors-ligne.';
            data.error = 'connection_lost';
            data.offline = true;
            break;
        case 'timeout':
            errorMessage = 'Délai d\'attente dépassé. Vous pouvez continuer en mode hors-ligne.';
            data.error = 'timeout';
            data.offline = true;
            break;
        default:
            errorMessage = `Erreur lors de la synchronisation: ${err.message || err}`;
            data.error = 'unknown';
            data.offline = true;
    }
    
    console.error(`sync-loading: erreur de sync: ${errorType}`, err);
    
    const result = {
        success: false,
        data: data,
        error: errorMessage
    };
    
    if (resolve) {
        resolve(result);
    }
    
    return result;
}

/**
 * Annule la synchronisation en cours
 * Fonction utilitaire exposée globalement
 */
export function cancelSync() {
    if (window.currentSyncHandler) {
        console.log('sync-loading: annulé par l\'utilisateur');
        window.currentSyncHandler.cancel();
        delete window.currentSyncHandler;
    }
}
