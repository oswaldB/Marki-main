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

const COUCHDB_URL = 'https://dev.markidiags.com/data/';

/**
 * Workflow sync-loading
 * Affiche l'écran de synchronisation et gère le processus de sync PouchDB
 * @param {Object} context - Contexte avec localDB, remoteDB, etc.
 * @param {Object} params - Paramètres du workflow (session, fromLogin)
 * @returns {Promise<Object>} Résultat { success, data, error }
 */
export async function execute(context = {}, params = {}) {
    console.log('sync-loading: démarrage synchronisation', params);
    
    const { session = {}, fromLogin = false } = params;
    const startTime = Date.now();
    
    // Stats de synchronisation
    let documentCount = 0;
    let lastUpdate = Date.now();
    let syncCompleted = false;
    let syncError = null;
    
    try {
        // Vérifier que PouchDB est disponible globalement
        if (typeof PouchDB === 'undefined') {
            throw new Error('PouchDB non disponible');
        }
        
        // Initialiser les bases de données
        const localDb = new PouchDB('marki');
        const remoteDb = new PouchDB(`${COUCHDB_URL}marki`, {
            fetch: (url, opts) => {
                opts.credentials = 'include';
                return fetch(url, opts);
            }
        });
        
        console.log('sync-loading: connexion à CouchDB établie');
        
        // Créer la promesse de synchronisation
        const syncPromise = new Promise((resolve, reject) => {
            const syncHandler = localDb.sync(remoteDb, {
                live: true,
                retry: true,
                heartbeat: 10000,
                timeout: 30000
            });
            
            // Exposer le handler pour annulation externe
            window.currentSyncHandler = syncHandler;
            
            // Détection timeout (pas de changement depuis 30s)
            const progressInterval = setInterval(() => {
                if (!syncCompleted && Date.now() - lastUpdate > 30000) {
                    clearInterval(progressInterval);
                    syncHandler.cancel();
                    reject(new Error('timeout'));
                }
            }, 5000);
            
            // Événement: changement (réception/envoi de documents)
            syncHandler.on('change', (info) => {
                lastUpdate = Date.now();
                
                if (info.change && info.change.docs) {
                    documentCount += info.change.docs.length;
                    console.log(`sync-loading: documents reçus: ${documentCount}`);
                    
                    // Calculer la progression estimée
                    const progress = calculateProgress(documentCount, info.direction);
                    
                    // Notifier la progression via context si disponible
                    if (context.onProgress) {
                        context.onProgress({
                            percentage: progress,
                            documentsReceived: documentCount,
                            direction: info.direction,
                            status: `Téléchargement des documents...`
                        });
                    }
                }
            });
            
            // Événement: paused (sync initial terminé)
            syncHandler.on('paused', (err) => {
                if (!err && !syncCompleted) {
                    syncCompleted = true;
                    clearInterval(progressInterval);
                    console.log('sync-loading: sync initial terminé');
                    
                    // Courte attente pour l'animation finale
                    setTimeout(() => {
                        syncHandler.cancel();
                        resolve();
                    }, 800);
                }
            });
            
            // Événement: erreur
            syncHandler.on('error', (err) => {
                clearInterval(progressInterval);
                reject(err);
            });
            
            // Événement: annulation
            syncHandler.on('cancel', () => {
                if (!syncCompleted) {
                    clearInterval(progressInterval);
                    console.log('sync-loading: annulé par l\'utilisateur');
                    reject(new Error('cancelled'));
                }
            });
        });
        
        // Attendre la fin de la synchronisation
        await syncPromise;
        
        // Calculer les statistiques finales
        const duration = Date.now() - startTime;
        const stats = {
            documentsReceived: documentCount,
            bytesTransferred: estimateBytesTransferred(documentCount),
            duration: duration
        };
        
        console.log('sync-loading: redirection vers application');
        
        return {
            success: true,
            data: {
                synced: true,
                stats: stats
            },
            error: null
        };
        
    } catch (err) {
        console.error('sync-loading error:', err);
        
        // Catégoriser l'erreur
        const errorType = categorizeError(err);
        
        switch (errorType) {
            case 'auth_failed':
                console.log('sync-loading: erreur de sync: auth_failed');
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
                console.log('sync-loading: erreur de sync: connection_lost');
                return {
                    success: false,
                    data: {
                        synced: false,
                        error: 'connection_lost'
                    },
                    error: 'Connexion perdue. Vérifiez votre connexion internet.'
                };
                
            case 'timeout':
                console.log('sync-loading: erreur de sync: timeout');
                return {
                    success: false,
                    data: {
                        synced: false,
                        error: 'timeout'
                    },
                    error: 'La synchronisation a pris trop de temps.'
                };
                
            case 'cancelled':
                return {
                    success: false,
                    data: {
                        synced: false,
                        error: 'cancelled'
                    },
                    error: 'Synchronisation annulée par l\'utilisateur.'
                };
                
            default:
                console.log('sync-loading: erreur de sync:', errorType);
                return {
                    success: false,
                    data: {
                        synced: false,
                        error: errorType
                    },
                    error: `Erreur lors de la synchronisation: ${err.message}`
                };
        }
    } finally {
        // Nettoyer le handler global
        if (window.currentSyncHandler) {
            delete window.currentSyncHandler;
        }
    }
}

/**
 * Calcule la progression estimée de la synchronisation
 * @param {number} documents - Nombre de documents reçus
 * @param {string} direction - Direction du sync ('pull' ou 'push')
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
 * Estime le nombre de bytes transférés
 * @param {number} documentCount - Nombre de documents
 * @returns {number} Estimation en bytes
 */
function estimateBytesTransferred(documentCount) {
    // Estimation moyenne: ~2KB par document
    return documentCount * 2048;
}

/**
 * Catégorise une erreur de synchronisation
 * @param {Error} err - L'erreur à catégoriser
 * @returns {string} Type d'erreur
 */
function categorizeError(err) {
    if (!err) return 'unknown';
    
    const message = err.message?.toLowerCase() || '';
    const status = err.status;
    
    // Erreur d'authentification
    if (status === 401 || message.includes('unauthorized') || message.includes('auth')) {
        return 'auth_failed';
    }
    
    // Timeout
    if (message.includes('timeout') || message === 'timeout') {
        return 'timeout';
    }
    
    // Connexion perdue
    if (message.includes('network') || 
        message.includes('connection') || 
        message.includes('offline') ||
        message.includes('failed to fetch') ||
        message.includes('fetch')) {
        return 'connection_lost';
    }
    
    // Annulation
    if (message.includes('cancel')) {
        return 'cancelled';
    }
    
    return 'unknown';
}

/**
 * Annule la synchronisation en cours
 * Fonction utilitaire exposée pour permettre l'annulation externe
 */
export function cancelSync() {
    if (window.currentSyncHandler) {
        window.currentSyncHandler.cancel();
        console.log('sync-loading: synchronisation annulée');
        return true;
    }
    return false;
}
