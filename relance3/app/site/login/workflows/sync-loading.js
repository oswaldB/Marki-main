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

/**
 * Workflow sync-loading
 * Gère la synchronisation PouchDB après connexion
 * @param {Object} context - Contexte avec localDB, remoteDB
 * @param {Object} params - Paramètres du workflow
 * @returns {Promise<Object>} Résultat { success, data, error }
 */
export async function execute(context, params = {}) {
    console.log('sync-loading workflow executing', params);
    
    const session = params.session || {};
    const fromLogin = params.fromLogin !== false;
    
    // Références pour le cleanup
    let syncHandler = null;
    let progressInterval = null;
    let lastUpdate = Date.now();
    let documentCount = 0;
    let bytesTransferred = 0;
    const startTime = Date.now();
    
    // État interne du sync
    const syncState = {
        status: 'connecting', // connecting, syncing, paused, error, complete
        progress: 0,
        documents: 0,
        direction: 'pull',
        error: null
    };
    
    try {
        // 1. UI: Masquer login, afficher sync-loading
        updateUIState('show-sync');
        console.log('sync-loading: démarrage synchronisation');
        
        // 2. Initialiser PouchDB
        const COUCHDB_URL = context.couchdbUrl || window.COUCHDB_URL || 'http://dev.marki.local/couchdb/';
        
        // PouchDB est disponible globalement (chargé via CDN)
        const localDb = new PouchDB('marki');
        const remoteDb = new PouchDB(`${COUCHDB_URL}marki`, {
            fetch: (url, opts) => {
                opts.credentials = 'include';
                return fetch(url, opts);
            }
        });
        
        // Stocker dans le contexte pour accès global
        if (context) {
            context.localDb = localDb;
            context.remoteDb = remoteDb;
        }
        
        // 3. Démarrer la synchronisation live
        syncHandler = localDb.sync(remoteDb, {
            live: true,
            retry: true,
            heartbeat: 10000,
            timeout: 30000
        });
        
        // Exposer le handler globalement pour permettre l'annulation
        window.currentSyncHandler = syncHandler;
        
        // 4. Configurer les événements de sync
        setupSyncEvents(syncHandler);
        
        // 5. Démarrer la surveillance du timeout
        startTimeoutMonitor();
        
        // Attendre la fin du sync initial
        const result = await waitForSyncComplete();
        
        return result;
        
    } catch (err) {
        console.error('sync-loading error:', err);
        cleanup();
        
        const errorMessage = categorizeError(err);
        return handleSyncFailure(errorMessage, err.message);
        
    } finally {
        cleanup();
    }
    
    // ============ FONCTIONS INTERNES ============
    
    function setupSyncEvents(handler) {
        handler.on('change', (info) => {
            lastUpdate = Date.now();
            syncState.status = 'syncing';
            
            if (info.change && info.change.docs) {
                documentCount += info.change.docs.length;
                syncState.documents = documentCount;
                
                // Estimation des bytes (approximation)
                const avgDocSize = 2000; // 2KB moyen par doc
                bytesTransferred += info.change.docs.length * avgDocSize;
                
                console.log('sync-loading: documents reçus:', documentCount);
                
                updateProgress({
                    documents: documentCount,
                    direction: info.direction || 'pull',
                    bytes: bytesTransferred
                });
            }
        });
        
        handler.on('paused', (err) => {
            console.log('sync-loading: sync paused', err ? 'avec erreur' : 'sans erreur');
            
            if (!err && syncState.status !== 'complete') {
                // Sync initial terminé
                syncState.status = 'complete';
                completeSync();
            } else if (err) {
                // Erreur de pause - souvent auth
                syncState.error = err;
            }
        });
        
        handler.on('active', () => {
            console.log('sync-loading: connexion à CouchDB établie');
            syncState.status = 'syncing';
            updateUI({
                status: 'Synchronisation en cours...',
                percentage: Math.max(syncState.progress, 20)
            });
        });
        
        handler.on('denied', (err) => {
            console.error('sync-loading: accès refusé', err);
            syncState.error = { type: 'auth_failed', error: err };
        });
        
        handler.on('error', (err) => {
            console.error('sync-loading: erreur de sync', err);
            syncState.error = err;
            handleSyncError(err);
        });
        
        handler.on('complete', (info) => {
            console.log('sync-loading: sync initial terminé', info);
            if (syncState.status !== 'complete') {
                syncState.status = 'complete';
                completeSync();
            }
        });
    }
    
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
        
        syncState.progress = progressPercent;
        syncState.direction = direction;
        
        const speed = calculateSpeed();
        const remaining = calculateETA(documents, estimatedMaxDocs, speed);
        
        updateUI({
            percentage: Math.round(progressPercent),
            documentsReceived: documents,
            bytesTransferred: bytes || documents * 2000,
            status: `Téléchargement des documents...`,
            speed: speed,
            eta: remaining
        });
        
        // Mettre à jour Alpine si disponible
        if (window.Alpine && window.Alpine.store) {
            window.Alpine.store('syncProgress', {
                percentage: Math.round(progressPercent),
                documents: documents,
                status: 'syncing'
            });
        }
    }
    
    function calculateSpeed() {
        const elapsed = (Date.now() - startTime) / 1000;
        if (elapsed < 1) return 0;
        return Math.round((bytesTransferred / 1024) / elapsed); // KB/s
    }
    
    function calculateETA(current, total, speed) {
        if (speed <= 0) return null;
        const remaining = (total - current) * 2000; // bytes estimés restants
        const seconds = Math.round(remaining / (speed * 1024));
        return seconds > 0 ? seconds : null;
    }
    
    function startTimeoutMonitor() {
        progressInterval = setInterval(() => {
            if (syncState.status === 'complete') {
                clearInterval(progressInterval);
                return;
            }
            
            // Timeout si pas d'activité depuis 30s
            if (Date.now() - lastUpdate > 30000) {
                console.log('sync-loading: timeout détecté');
                handleSyncError({ message: 'timeout' });
            }
        }, 5000);
    }
    
    function completeSync() {
        console.log('sync-loading: sync initial terminé');
        clearInterval(progressInterval);
        
        // Animation finale
        updateUI({
            percentage: 100,
            status: 'Synchronisation terminée !',
            documentsReceived: documentCount
        });
        
        // Annuler le live sync (sera redémarré dans main.js)
        if (syncHandler) {
            syncHandler.cancel();
            window.currentSyncHandler = null;
        }
        
        const duration = Date.now() - startTime;
        const stats = {
            documentsReceived: documentCount,
            bytesTransferred: bytesTransferred,
            duration: duration
        };
        
        console.log('sync-loading: redirection vers application');
        
        // Afficher l'écran de succès
        updateUIState('show-success');
        
        // Redirection automatique après 3s si pas d'interaction
        setTimeout(() => {
            if (typeof navigateToApp === 'function') {
                navigateToApp({ session: session });
            } else {
                // Fallback: rediriger vers l'app
                window.location.hash = 'session=active';
            }
        }, 3000);
        
        return {
            success: true,
            data: {
                synced: true,
                stats: stats
            },
            error: null
        };
    }
    
    function handleSyncError(err) {
        const errorType = categorizeError(err);
        console.log('sync-loading: erreur de sync:', errorType);
        
        clearInterval(progressInterval);
        
        switch(errorType) {
            case 'auth_failed':
                return handleAuthError(err);
            case 'connection_lost':
            case 'timeout':
                return showOfflineOption(err);
            default:
                return showOfflineOption(err);
        }
    }
    
    function categorizeError(err) {
        const message = (err && err.message) || String(err);
        const status = err && err.status;
        
        if (status === 401 || message.includes('unauthorized') || message.includes('auth')) {
            return 'auth_failed';
        }
        if (message.includes('timeout') || message.includes('ETIMEDOUT')) {
            return 'timeout';
        }
        if (message.includes('ECONNREFUSED') || message.includes('network') || message.includes('fetch')) {
            return 'connection_lost';
        }
        return 'unknown';
    }
    
    function handleAuthError(err) {
        console.log('sync-loading: session expirée');
        
        updateUIState('show-error');
        updateUI({
            status: 'Session expirée',
            errorMessage: 'Votre session a expiré. Veuillez vous reconnecter.'
        });
        
        // Rediriger vers login après délai
        setTimeout(() => {
            updateUIState('show-login');
        }, 3000);
        
        return {
            success: false,
            data: {
                synced: false,
                error: 'auth_failed'
            },
            error: 'Session expirée. Veuillez vous reconnecter.'
        };
    }
    
    function showOfflineOption(err) {
        console.log('sync-loading: mode hors-ligne proposé');
        
        updateUIState('show-offline-option');
        updateUI({
            status: 'Connexion perdue',
            errorMessage: 'Impossible de synchroniser. Continuer en mode hors-ligne ?'
        });
        
        // Exposer une fonction pour continuer en mode hors-ligne
        window.continueOffline = () => {
            console.log('sync-loading: mode hors-ligne activé');
            
            if (typeof navigateToApp === 'function') {
                navigateToApp({ session: session, offline: true });
            } else {
                window.location.hash = 'session=active&offline=true';
            }
        };
        
        return {
            success: true,
            data: {
                synced: false,
                offline: true,
                reason: 'connection_lost'
            },
            error: null
        };
    }
    
    function handleSyncFailure(errorType, originalMessage) {
        updateUIState('show-error');
        updateUI({
            status: 'Erreur de synchronisation',
            errorMessage: originalMessage || 'Une erreur est survenue'
        });
        
        return {
            success: false,
            data: {
                synced: false,
                error: errorType
            },
            error: `Erreur lors de la synchronisation: ${originalMessage}`
        };
    }
    
    function updateUIState(state) {
        // Met à jour la visibilité des sections de l'UI
        const loginSection = document.getElementById('login-section');
        const syncSection = document.getElementById('sync-loading-section');
        const errorSection = document.getElementById('sync-error-section');
        const successSection = document.getElementById('sync-success-section');
        
        if (loginSection) loginSection.classList.add('hidden');
        if (syncSection) syncSection.classList.add('hidden');
        if (errorSection) errorSection.classList.add('hidden');
        if (successSection) successSection.classList.add('hidden');
        
        switch(state) {
            case 'show-sync':
                if (syncSection) syncSection.classList.remove('hidden');
                break;
            case 'show-login':
                if (loginSection) loginSection.classList.remove('hidden');
                break;
            case 'show-error':
                if (errorSection) errorSection.classList.remove('hidden');
                break;
            case 'show-success':
                if (successSection) successSection.classList.remove('hidden');
                break;
            case 'show-offline-option':
                if (errorSection) errorSection.classList.remove('hidden');
                break;
        }
    }
    
    function updateUI(update) {
        // Met à jour l'UI avec les données de progression
        // Utilise Alpine.js si disponible, sinon met à jour directement le DOM
        
        if (window.Alpine && window.Alpine.store) {
            const store = window.Alpine.store('syncState');
            if (store) {
                Object.assign(store, update);
            }
        }
        
        // Mise à jour directe du DOM pour compatibilité
        const progressBar = document.getElementById('sync-progress-bar');
        const progressText = document.getElementById('sync-progress-text');
        const statusText = document.getElementById('sync-status-text');
        const documentsText = document.getElementById('sync-documents-count');
        
        if (progressBar && update.percentage !== undefined) {
            progressBar.style.width = `${update.percentage}%`;
            progressBar.setAttribute('aria-valuenow', update.percentage);
        }
        
        if (progressText && update.percentage !== undefined) {
            progressText.textContent = `${update.percentage}%`;
        }
        
        if (statusText && update.status) {
            statusText.textContent = update.status;
        }
        
        if (documentsText && update.documentsReceived !== undefined) {
            documentsText.textContent = update.documentsReceived.toLocaleString();
        }
    }
    
    function waitForSyncComplete() {
        return new Promise((resolve) => {
            const checkInterval = setInterval(() => {
                if (syncState.status === 'complete') {
                    clearInterval(checkInterval);
                    const duration = Date.now() - startTime;
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
                } else if (syncState.status === 'error' && syncState.error) {
                    clearInterval(checkInterval);
                    const errorType = categorizeError(syncState.error);
                    resolve(handleSyncFailure(errorType, syncState.error.message));
                }
            }, 100);
            
            // Timeout global de sécurité (5 minutes)
            setTimeout(() => {
                clearInterval(checkInterval);
                if (syncState.status !== 'complete') {
                    resolve(handleSyncFailure('timeout', 'Synchronisation trop longue'));
                }
            }, 300000);
        });
    }
    
    function cleanup() {
        if (progressInterval) {
            clearInterval(progressInterval);
            progressInterval = null;
        }
        // Note: syncHandler n'est pas annulé ici car on veut garder le live sync
    }
}

// Fonction pour annuler le sync depuis l'extérieur (bouton annuler)
export function cancelSync() {
    console.log('sync-loading: annulé par l\'utilisateur');
    
    if (window.currentSyncHandler) {
        window.currentSyncHandler.cancel();
        window.currentSyncHandler = null;
    }
    
    // Retourner à l'écran de login
    const loginSection = document.getElementById('login-section');
    const syncSection = document.getElementById('sync-loading-section');
    
    if (loginSection) loginSection.classList.remove('hidden');
    if (syncSection) syncSection.classList.add('hidden');
    
    return { cancelled: true };
}

// Fonction pour redémarrer le sync (bouton réessayer)
export function retrySync(context, params) {
    console.log('sync-loading: tentative de redémarrage');
    return execute(context, params);
}

// Fonction de navigation vers l'app (peut être surchargée)
export function navigateToApp(options = {}) {
    const { session, offline } = options;
    
    let hash = 'session=active';
    if (offline) {
        hash += '&offline=true';
    }
    if (session && session.name) {
        hash += `&user=${encodeURIComponent(session.name)}`;
    }
    
    window.location.hash = hash;
}
