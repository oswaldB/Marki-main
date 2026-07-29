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
 * Gère la synchronisation PouchDB après connexion réussie
 * @param {Object} context - Contexte avec localDB, remoteDB
 * @param {Object} params - Paramètres du workflow { session, fromLogin }
 * @returns {Promise<Object>} Résultat { success, data, error }
 */
export async function execute(context, params = {}) {
    console.log('sync-loading: démarrage synchronisation', params);
    
    const startTime = Date.now();
    let documentCount = 0;
    let lastUpdate = Date.now();
    let progressInterval = null;
    let bytesTransferred = 0;
    
    // Référence au handler de sync pour pouvoir l'annuler
    let syncHandler = null;
    
    // Afficher l'écran de loading via Alpine.js ou DOM
    showLoadingScreen();
    
    try {
        // PouchDB est disponible globalement (chargé via CDN)
        if (typeof PouchDB === 'undefined') {
            throw new Error('PouchDB not available');
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
        
        // Démarrer la synchronisation
        syncHandler = localDb.sync(remoteDb, {
            live: true,
            retry: true,
            heartbeat: 10000,
            timeout: 30000
        });
        
        // Exposer le handler pour permettre l'annulation externe
        window.currentSyncHandler = syncHandler;
        
        // Créer une promesse qui résout lorsque la sync initiale est terminée
        const syncPromise = new Promise((resolve, reject) => {
            // Détection timeout (pas de changement depuis 30s)
            progressInterval = setInterval(() => {
                if (Date.now() - lastUpdate > 30000) {
                    reject({ message: 'timeout', type: 'timeout' });
                }
            }, 5000);
            
            syncHandler.on('change', (info) => {
                lastUpdate = Date.now();
                
                // Mise à jour du compteur de documents
                if (info.change && info.change.docs) {
                    documentCount += info.change.docs.length;
                    bytesTransferred += estimateBytes(info.change.docs);
                    
                    console.log(`sync-loading: documents reçus: ${documentCount}`);
                    
                    updateProgress({
                        documents: documentCount,
                        direction: info.direction,
                        bytes: bytesTransferred
                    });
                }
            });
            
            syncHandler.on('paused', (err) => {
                if (!err) {
                    // Sync initial terminé (pas d'erreur)
                    console.log('sync-loading: sync initial terminé');
                    clearInterval(progressInterval);
                    resolve();
                }
            });
            
            syncHandler.on('error', (err) => {
                clearInterval(progressInterval);
                reject(err);
            });
            
            // Handler pour annulation manuelle
            syncHandler.on('cancel', () => {
                clearInterval(progressInterval);
                reject({ message: 'cancelled', type: 'cancelled' });
            });
        });
        
        // Attendre la fin de la sync initiale
        await syncPromise;
        
        // Animation finale
        updateUI({
            percentage: 100,
            status: 'Synchronisation terminée !',
            documentsReceived: documentCount
        });
        
        const duration = Date.now() - startTime;
        
        // Attendre l'animation puis finaliser
        await delay(800);
        
        // Annuler le live sync (sera redémarré dans main.js)
        if (syncHandler) {
            syncHandler.cancel();
        }
        
        console.log('sync-loading: redirection vers application');
        
        // Masquer l'écran de loading
        hideLoadingScreen();
        
        return {
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
        };
        
    } catch (err) {
        clearInterval(progressInterval);
        
        if (syncHandler) {
            syncHandler.cancel();
        }
        
        const errorResult = handleSyncError(err);
        
        if (errorResult.offline) {
            console.log('sync-loading: mode hors-ligne activé');
            
            return {
                success: true,
                data: {
                    synced: false,
                    offline: true,
                    reason: errorResult.reason || 'user_choice'
                },
                error: null
            };
        }
        
        console.error('sync-loading: erreur de sync:', err.message || err);
        
        return {
            success: false,
            data: {
                synced: false,
                error: errorResult.type || 'unknown'
            },
            error: errorResult.message || 'Erreur lors de la synchronisation'
        };
    } finally {
        window.currentSyncHandler = null;
    }
}

/**
 * Met à jour la progression de la synchronisation
 */
function updateProgress({ documents, direction, bytes }) {
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
    
    updateUI({
        percentage: Math.round(progressPercent),
        documentsReceived: documents,
        status: `Téléchargement des documents...`,
        speed: calculateSpeed(bytes)
    });
}

/**
 * Calcule la vitesse de transfert
 */
function calculateSpeed(bytes) {
    // Simplification: retourne une estimation
    return 'calculating...';
}

/**
 * Estime la taille en bytes des documents
 */
function estimateBytes(docs) {
    if (!Array.isArray(docs)) return 0;
    return docs.reduce((total, doc) => {
        return total + JSON.stringify(doc).length * 2; // UTF-16 estimation
    }, 0);
}

/**
 * Met à jour l'interface utilisateur
 */
function updateUI({ percentage, status, documentsReceived, speed }) {
    // Mettre à jour le DOM si les éléments existent
    const progressBar = document.getElementById('sync-progress-bar');
    const statusText = document.getElementById('sync-status');
    const docCount = document.getElementById('sync-doc-count');
    const speedText = document.getElementById('sync-speed');
    
    if (progressBar) {
        progressBar.style.width = `${percentage}%`;
        progressBar.setAttribute('aria-valuenow', percentage);
    }
    
    if (statusText && status) {
        statusText.textContent = status;
    }
    
    if (docCount && documentsReceived !== undefined) {
        docCount.textContent = documentsReceived.toLocaleString();
    }
    
    if (speedText && speed) {
        speedText.textContent = speed;
    }
    
    // Émettre un événement personnalisé pour Alpine.js
    window.dispatchEvent(new CustomEvent('sync-progress', {
        detail: { percentage, status, documentsReceived, speed }
    }));
}

/**
 * Affiche l'écran de loading
 */
function showLoadingScreen() {
    const loginForm = document.getElementById('login-form');
    const loadingScreen = document.getElementById('sync-loading-screen');
    
    if (loginForm) {
        loginForm.classList.add('hidden');
    }
    
    if (loadingScreen) {
        loadingScreen.classList.remove('hidden');
    }
    
    // Initialiser la progression à 0
    updateUI({
        percentage: 0,
        status: 'Connexion à la base de données...'
    });
}

/**
 * Masque l'écran de loading
 */
function hideLoadingScreen() {
    const loadingScreen = document.getElementById('sync-loading-screen');
    
    if (loadingScreen) {
        loadingScreen.classList.add('hidden');
    }
}

/**
 * Gère les erreurs de synchronisation
 */
function handleSyncError(err) {
    const errorType = categorizeError(err);
    
    switch (errorType) {
        case 'auth_failed':
            console.log('sync-loading: erreur auth_failed');
            return {
                type: 'auth_failed',
                message: 'Session expirée. Veuillez vous reconnecter.',
                redirect: true
            };
            
        case 'connection_lost':
        case 'timeout':
            console.log(`sync-loading: erreur ${errorType}`);
            return {
                type: errorType,
                message: `Erreur de connexion: ${errorType}`,
                offline: true,
                reason: errorType
            };
            
        case 'cancelled':
            console.log('sync-loading: annulé par l\'utilisateur');
            return {
                type: 'cancelled',
                message: 'Synchronisation annulée',
                offline: true,
                reason: 'user_cancelled'
            };
            
        default:
            console.log('sync-loading: erreur inconnue', err);
            return {
                type: 'unknown',
                message: err.message || 'Erreur de synchronisation',
                offline: true,
                reason: 'unknown_error'
            };
    }
}

/**
 * Catégorise une erreur de sync
 */
function categorizeError(err) {
    if (!err) return 'unknown';
    
    const message = (err.message || err.toString()).toLowerCase();
    
    if (message.includes('unauthorized') || message.includes('auth') || message.includes('session')) {
        return 'auth_failed';
    }
    
    if (message.includes('timeout')) {
        return 'timeout';
    }
    
    if (message.includes('network') || message.includes('connection') || message.includes('offline')) {
        return 'connection_lost';
    }
    
    if (message.includes('cancelled')) {
        return 'cancelled';
    }
    
    return 'unknown';
}

/**
 * Crée une promesse de délai
 */
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Fonction utilitaire pour annuler la synchronisation depuis l'extérieur
export function cancelSync() {
    if (window.currentSyncHandler) {
        console.log('sync-loading: annulation demandée');
        window.currentSyncHandler.cancel();
        window.currentSyncHandler = null;
        return true;
    }
    return false;
}
