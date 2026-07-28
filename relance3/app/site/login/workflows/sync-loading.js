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
 * Affiche l'écran de synchronisation et gère le processus de sync PouchDB
 * @param {Object} context - Contexte avec localDB, remoteDB, ui, etc.
 * @param {Object} params - Paramètres du workflow { session, fromLogin }
 * @returns {Promise<Object>} Résultat { success, data, error }
 */
export async function execute(context, params = {}) {
    console.log('sync-loading: démarrage synchronisation');
    
    const { localDB, remoteDB, ui } = context;
    const { session, fromLogin = true } = params;
    
    // Constantes
    const SYNC_TIMEOUT = 30000; // 30s
    const HEARTBEAT = 10000;    // 10s
    const ESTIMATED_MAX_DOCS = 2000;
    
    let documentCount = 0;
    let lastUpdate = Date.now();
    let startTime = Date.now();
    let syncHandler = null;
    let progressInterval = null;
    let isCancelled = false;
    
    try {
        // Vérifier les dépendances requises
        if (!localDB || !remoteDB) {
            throw new Error('PouchDB instances requises (localDB, remoteDB)');
        }
        
        // Afficher l'écran de loading si UI disponible
        if (ui) {
            ui.showSyncLoading?.();
            ui.updateProgress?.({
                percentage: 0,
                status: 'Connexion à CouchDB...',
                documentsReceived: 0
            });
        }
        
        console.log('sync-loading: connexion à CouchDB établie');
        
        // Créer le handler de synchronisation
        syncHandler = localDB.sync(remoteDB, {
            live: true,
            retry: true,
            heartbeat: HEARTBEAT,
            timeout: SYNC_TIMEOUT
        });
        
        // Exposer le handler pour permettre l'annulation externe
        window.currentSyncHandler = syncHandler;
        
        // Configurer la détection de timeout
        progressInterval = setInterval(() => {
            if (Date.now() - lastUpdate > SYNC_TIMEOUT) {
                console.log('sync-loading: timeout détecté');
                if (syncHandler && !isCancelled) {
                    syncHandler.cancel?.();
                    handleSyncError({ message: 'timeout' });
                }
            }
        }, 5000);
        
        // Retourner une promesse qui se résout à la fin du sync
        return new Promise((resolve) => {
            
            // Gestionnaire d'événement 'change'
            syncHandler.on('change', (info) => {
                lastUpdate = Date.now();
                
                if (info.change && info.change.docs) {
                    documentCount += info.change.docs.length;
                    console.log(`sync-loading: documents reçus: ${documentCount}`);
                    
                    const progress = calculateProgress(documentCount, info.direction);
                    const speed = calculateSpeed(startTime, documentCount);
                    
                    if (ui) {
                        ui.updateProgress?.({
                            percentage: progress.percentage,
                            status: progress.status,
                            documentsReceived: documentCount,
                            speed: speed
                        });
                    }
                }
            });
            
            // Gestionnaire d'événement 'paused' - sync initial terminé
            syncHandler.on('paused', (err) => {
                if (!err && !isCancelled) {
                    console.log('sync-loading: sync initial terminé');
                    completeSync(resolve);
                }
            });
            
            // Gestionnaire d'événement 'error'
            syncHandler.on('error', (err) => {
                console.log('sync-loading: erreur de sync:', err.message || err);
                handleSyncError(err, resolve);
            });
            
            // Gestionnaire d'annulation utilisateur
            if (ui && ui.onCancel) {
                ui.onCancel(() => {
                    isCancelled = true;
                    console.log('sync-loading: annulé par l\'utilisateur');
                    syncHandler?.cancel?.();
                    clearInterval(progressInterval);
                    
                    resolve({
                        success: true,
                        data: {
                            synced: false,
                            cancelled: true,
                            reason: 'user_cancelled'
                        },
                        error: null
                    });
                });
            }
            
            // Fonction de calcul de progression
            function calculateProgress(docs, direction) {
                // Stratégie: 0-20% connexion, 20-80% transfert, 80-100% finalisation
                const baseProgress = direction === 'pull' ? 20 : 0;
                const progressPercent = Math.min(
                    baseProgress + (docs / ESTIMATED_MAX_DOCS) * 60,
                    80
                );
                
                let status = 'Téléchargement des documents...';
                if (progressPercent < 20) {
                    status = 'Connexion et authentification...';
                } else if (progressPercent >= 80) {
                    status = 'Finalisation...';
                }
                
                return { percentage: Math.round(progressPercent), status };
            }
            
            // Fonction de calcul de vitesse
            function calculateSpeed(start, docs) {
                const elapsed = (Date.now() - start) / 1000; // secondes
                if (elapsed === 0) return 0;
                return Math.round(docs / elapsed);
            }
            
            // Fonction de finalisation
            function completeSync(resolveFn) {
                clearInterval(progressInterval);
                
                // Animation finale
                if (ui) {
                    ui.updateProgress?.({
                        percentage: 100,
                        status: 'Synchronisation terminée !'
                    });
                }
                
                console.log('sync-loading: redirection vers application');
                
                // Attendre l'animation puis résoudre
                setTimeout(() => {
                    syncHandler?.cancel?.();
                    window.currentSyncHandler = null;
                    
                    const duration = Date.now() - startTime;
                    
                    resolveFn({
                        success: true,
                        data: {
                            synced: true,
                            stats: {
                                documentsReceived: documentCount,
                                bytesTransferred: estimateBytesTransferred(documentCount),
                                duration: duration
                            }
                        },
                        error: null
                    });
                }, 800);
            }
            
            // Fonction de gestion des erreurs
            function handleSyncError(err, resolveFn = resolve) {
                clearInterval(progressInterval);
                
                const errorType = categorizeError(err);
                console.log('sync-loading: mode hors-ligne activé:', errorType);
                
                let errorMessage = 'Erreur lors de la synchronisation';
                let shouldRedirect = false;
                
                switch(errorType) {
                    case 'auth_failed':
                        errorMessage = 'Session expirée. Veuillez vous reconnecter.';
                        shouldRedirect = true;
                        break;
                    case 'connection_lost':
                        errorMessage = 'Connexion perdue. Mode hors-ligne disponible.';
                        break;
                    case 'timeout':
                        errorMessage = 'Délai d\'attente dépassé. Mode hors-ligne disponible.';
                        break;
                }
                
                // Proposer le mode hors-ligne
                if (ui && ui.showOfflineOption) {
                    ui.showOfflineOption({
                        error: errorType,
                        message: errorMessage,
                        onContinue: () => {
                            resolveFn({
                                success: true,
                                data: {
                                    synced: false,
                                    offline: true,
                                    reason: errorType
                                },
                                error: null
                            });
                        },
                        onRetry: () => {
                            // Redémarrer le workflow
                            resolveFn(execute(context, params));
                        }
                    });
                } else {
                    // Sans UI, retourner l'erreur directement
                    resolveFn({
                        success: false,
                        data: {
                            synced: false,
                            error: errorType
                        },
                        error: errorMessage
                    });
                }
            }
            
            // Fonction de catégorisation des erreurs
            function categorizeError(err) {
                const msg = (err.message || err.status || '').toLowerCase();
                
                if (msg.includes('unauthorized') || msg.includes('authentication') || err.status === 401) {
                    return 'auth_failed';
                }
                if (msg.includes('timeout') || msg.includes('time')) {
                    return 'timeout';
                }
                if (msg.includes('network') || msg.includes('connection') || msg.includes('offline') || err.status === 0) {
                    return 'connection_lost';
                }
                return 'unknown';
            }
            
            // Estimation des bytes transférés (approximatif)
            function estimateBytesTransferred(docs) {
                // Estimation moyenne: 2KB par document
                return docs * 2048;
            }
        });
        
    } catch (err) {
        console.error('sync-loading error:', err);
        clearInterval(progressInterval);
        window.currentSyncHandler = null;
        
        return {
            success: false,
            data: { synced: false, error: 'initialization_failed' },
            error: err.message || 'Erreur lors de l\'initialisation de la synchronisation'
        };
    }
}
