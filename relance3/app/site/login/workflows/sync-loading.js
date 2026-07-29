console.log('sync-loading.js loaded');

const COUCHDB_URL = 'https://dev.markidiags.com/data/';

/**
 * Met à jour l'interface de progression
 * @param {Object} state - État de la progression
 */
function updateUI(state) {
  // Dispatch un événement pour Alpine.js ou autre framework UI
  window.dispatchEvent(new CustomEvent('sync-loading:update', { detail: state }));
  
  if (state.percentage !== undefined) {
    console.log(`sync-loading: progression ${state.percentage}%`);
  }
  if (state.status) {
    console.log(`sync-loading: ${state.status}`);
  }
}

/**
 * Calcule la vitesse de transfert
 * @returns {string} Vitesse formatée
 */
function calculateSpeed() {
  // Simplifié - retourne une valeur estimée
  return 'calcul...';
}

/**
 * Collecte les statistiques finales
 * @param {number} documentCount - Nombre de documents
 * @param {number} startTime - Timestamp de début
 * @returns {Object} Stats
 */
function collectStats(documentCount, startTime) {
  const duration = Date.now() - startTime;
  const bytesTransferred = documentCount * 2000; // Estimation moyenne
  
  return {
    documentsReceived: documentCount,
    bytesTransferred,
    duration
  };
}

/**
 * Catégorise l'erreur de sync
 * @param {Error} err - Erreur PouchDB
 * @returns {string} Type d'erreur
 */
function categorizeError(err) {
  if (!err) return 'unknown';
  
  const message = err.message || err.toString();
  
  if (message.includes('unauthorized') || message.includes('auth')) {
    return 'auth_failed';
  }
  if (message.includes('timeout')) {
    return 'timeout';
  }
  if (message.includes('network') || message.includes('connection') || err.status === 0) {
    return 'connection_lost';
  }
  
  return 'unknown';
}

/**
 * Workflow sync-loading
 * Gère la synchronisation PouchDB après connexion
 * @param {Object} context - Contexte avec localDB, remoteDB
 * @param {Object} params - Paramètres du workflow
 * @returns {Promise<Object>} Résultat { success, data, error }
 */
export async function execute(context, params = {}) {
  console.log('sync-loading workflow executing', params);
  console.log('sync-loading: démarrage synchronisation');
  
  const startTime = Date.now();
  let documentCount = 0;
  let lastUpdate = Date.now();
  let progressInterval = null;
  let syncHandler = null;
  
  // Exposer la fonction d'annulation globalement
  window.cancelSyncLoading = () => {
    if (syncHandler) {
      syncHandler.cancel();
      console.log('sync-loading: annulé par l\'utilisateur');
    }
    if (progressInterval) {
      clearInterval(progressInterval);
    }
  };
  
  return new Promise((resolve) => {
    try {
      // Afficher l'écran de loading
      updateUI({ 
        percentage: 0, 
        status: 'Connexion à la base de données...',
        documentsReceived: 0
      });
      
      // Initialiser PouchDB (disponible globalement)
      const localDb = new PouchDB('marki');
      const remoteDb = new PouchDB(`${COUCHDB_URL}marki`, {
        fetch: (url, opts) => {
          opts.credentials = 'include';
          return fetch(url, opts);
        }
      });
      
      // Démarrer la synchronisation
      syncHandler = localDb.sync(remoteDb, {
        live: true,
        retry: true,
        heartbeat: 10000,
        timeout: 30000
      });
      
      // Exposer le handler pour annulation externe
      window.currentSyncHandler = syncHandler;
      
      console.log('sync-loading: connexion à CouchDB établie');
      
      // Détection timeout (pas de changement depuis 30s)
      progressInterval = setInterval(() => {
        if (Date.now() - lastUpdate > 30000) {
          handleSyncError({ message: 'timeout' });
        }
      }, 5000);
      
      // Gestionnaire d'événements de sync
      syncHandler.on('change', (info) => {
        lastUpdate = Date.now();
        
        // Mise à jour de la progression
        if (info.change && info.change.docs) {
          documentCount += info.change.docs.length;
          console.log(`sync-loading: documents reçus: ${documentCount}`);
          
          // Stratégie de progression: 0-20% connexion, 20-80% transfert, 80-100% finalisation
          const baseProgress = info.direction === 'pull' ? 20 : 0;
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
        }
      });
      
      syncHandler.on('paused', (err) => {
        if (!err) {
          // Sync initial terminé (pas d'erreur)
          completeSync();
        }
      });
      
      syncHandler.on('error', (err) => {
        handleSyncError(err);
      });
      
      // Fonction de finalisation
      function completeSync() {
        if (progressInterval) {
          clearInterval(progressInterval);
          progressInterval = null;
        }
        
        console.log('sync-loading: sync initial terminé');
        
        // Animation finale
        updateUI({
          percentage: 100,
          status: 'Synchronisation terminée !'
        });
        
        // Nettoyer
        if (syncHandler) {
          syncHandler.cancel();
        }
        delete window.currentSyncHandler;
        delete window.cancelSyncLoading;
        
        // Attendre l'animation puis retourner succès
        setTimeout(() => {
          console.log('sync-loading: redirection vers application');
          
          resolve({
            success: true,
            data: {
              synced: true,
              stats: collectStats(documentCount, startTime)
            },
            error: null
          });
        }, 800);
      }
      
      // Fonction de gestion des erreurs
      function handleSyncError(err) {
        if (progressInterval) {
          clearInterval(progressInterval);
          progressInterval = null;
        }
        
        const errorType = categorizeError(err);
        console.error(`sync-loading: erreur de sync: ${errorType}`, err);
        
        // Nettoyer
        if (syncHandler) {
          syncHandler.cancel();
        }
        delete window.currentSyncHandler;
        delete window.cancelSyncLoading;
        
        let errorMessage;
        let data = { synced: false, error: errorType };
        
        switch(errorType) {
          case 'auth_failed':
            errorMessage = 'Session expirée. Veuillez vous reconnecter.';
            data.redirect = true;
            break;
          case 'connection_lost':
            errorMessage = 'Connexion perdue. Vérifiez votre connexion internet.';
            break;
          case 'timeout':
            errorMessage = 'Délai d\'attente dépassé. La synchronisation a pris trop de temps.';
            break;
          default:
            errorMessage = `Erreur lors de la synchronisation: ${err.message || 'Erreur inconnue'}`;
        }
        
        resolve({
          success: false,
          data,
          error: errorMessage
        });
      }
      
    } catch (err) {
      console.error('sync-loading: erreur initiale', err);
      
      if (progressInterval) {
        clearInterval(progressInterval);
      }
      
      resolve({
        success: false,
        data: { synced: false, error: 'init_failed' },
        error: `Erreur lors de la synchronisation: ${err.message}`
      });
    }
  });
}
