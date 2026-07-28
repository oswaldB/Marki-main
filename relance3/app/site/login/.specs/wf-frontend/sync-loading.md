# Workflow: sync-loading

## Objectif
Afficher l'écran de synchronisation des données PouchDB après une connexion réussie et gérer le processus de sync initial.

## Déclencheur
Appelé automatiquement après succès de `auth-submit` lorsque `pouchDbStatus.needsSync` est `true`.

## Entrées
```javascript
{
    session: {
        name: "john_doe",
        roles: ["user"]
    },
    fromLogin: true  // true si vient du login, false si reconnexion
}
```

## Sorties

### Succès - Sync complète
```javascript
{
    success: true,
    data: {
        synced: true,
        stats: {
            documentsReceived: 1247,
            bytesTransferred: 2458000,
            duration: 12500  // ms
        }
    },
    error: null
}
```

### Succès - Mode hors-ligne
```javascript
{
    success: true,
    data: {
        synced: false,
        offline: true,
        reason: "user_choice"
    },
    error: null
}
```

### Échec - Erreur de sync
```javascript
{
    success: false,
    data: {
        synced: false,
        error: "connection_lost" | "auth_failed" | "timeout"
    },
    error: "Erreur lors de la synchronisation: ..."
}
```

## Logique métier

### 1. Afficher l'écran de loading
- Masquer le formulaire de login
- Afficher le composant `sync-loading` (voir mockup `/mockups/sync-loading.html`)
- Initialiser la barre de progression à 0%

### 2. Démarrer la synchronisation PouchDB

**IMPORTANT**: PouchDB est chargé globalement via CDN. Utiliser `PouchDB` sans import.

```javascript
// PouchDB est disponible globalement (window.PouchDB)
const localDb = new PouchDB('marki');
const remoteDb = new PouchDB(`${COUCHDB_URL}marki`, {
  fetch: (url, opts) => {
    opts.credentials = 'include';
    return fetch(url, opts);
  }
});

const syncHandler = localDb.sync(remoteDb, {
  live: true,
  retry: true,
  heartbeat: 10000,
  timeout: 30000
});

// Exposer le handler pour permettre l'annulation
window.currentSyncHandler = syncHandler;
```

### 3. Gérer les événements de sync

```javascript
let lastUpdate = Date.now();
let documentCount = 0;

syncHandler.on('change', (info) => {
  // Mise à jour de la progression
  if (info.change && info.change.docs) {
    documentCount += info.change.docs.length;
    updateProgress({
      documents: documentCount,
      direction: info.direction  // 'push' ou 'pull'
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

// Détection timeout (pas de changement depuis 30s)
const progressInterval = setInterval(() => {
  if (Date.now() - lastUpdate > 30000) {
    handleSyncError({ message: 'timeout' });
  }
}, 5000);
```

### 4. Calcul de la progression

La progression est estimée car PouchDB ne fournit pas de total exact:

```javascript
function updateProgress({ documents, direction }) {
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
    speed: calculateSpeed()
  });
}
```

### 5. Finalisation

```javascript
function completeSync() {
  clearInterval(progressInterval);
  
  // Animation finale
  updateUI({
    percentage: 100,
    status: 'Synchronisation terminée !'
  });
  
  // Attendre l'animation puis retourner succès
  setTimeout(() => {
    syncHandler.cancel();  // Annule le live sync (sera redémarré dans main.js)
    returnSuccess({
      synced: true,
      stats: collectStats()
    });
  }, 800);
}
```

### 6. Gestion des erreurs

```javascript
function handleSyncError(err) {
  clearInterval(progressInterval);
  
  const errorType = categorizeError(err);
  
  switch(errorType) {
    case 'auth_failed':
      // Cookie expiré, rediriger vers login
      returnError('Session expirée. Veuillez vous reconnecter.', { redirect: true });
      break;
    case 'connection_lost':
      showOfflineOption();
      break;
    case 'timeout':
      showOfflineOption();
      break;
    default:
      showOfflineOption();
  }
}
```

## UI States

### État: Sync en cours
- Animation du logo de sync
- Barre de progression animée (stripes)
- Liste des étapes avec statut
- Stats: documents, vitesse, temps restant estimé

### État: Succès
- Icône de validation verte
- Message de confirmation
- Bouton "Continuer vers l'application"
- Redirection automatique après 3s si pas d'interaction

### État: Erreur
- Icône d'erreur rouge
- Message d'erreur détaillé
- Bouton "Réessayer" (redémarre le sync)
- Bouton "Mode hors-ligne" (continue sans sync)

### État: Annulation
- Bouton "Annuler la synchronisation" visible pendant le sync
- Au clic: `syncHandler.cancel()`
- Retour à l'écran de login

## Side Effects
- Démarrage du live sync PouchDB
- Mise à jour du DOM (masquer login, afficher loading)
- Possibilité d'annuler le sync
- Nettoyage du handler de sync à la fin

## Dépendances
- PouchDB (sync API) - variable globale, chargée via CDN
- Fetch API avec `credentials: 'include'`
- Alpine.js pour le binding de l'UI
- Mockup: `/mockups/sync-loading.html`

## Console Logs
```
sync-loading.js loaded
sync-loading: démarrage synchronisation
sync-loading: connexion à CouchDB établie
sync-loading: documents reçus: 50
sync-loading: documents reçus: 150
sync-loading: sync initial terminé
sync-loading: redirection vers application
sync-loading: erreur de sync: connection_lost
sync-loading: mode hors-ligne activé
sync-loading: annulé par l'utilisateur
```

## Navigation post-sync

Après succès du sync:
1. Masquer l'écran de loading
2. Rediriger vers l'application principale: `/#session=active`
3. Ou afficher le dashboard si déjà dans l'app

## Référence Mockup
- **Fichier**: `/mockups/sync-loading.html`
- **Classes Tailwind**: voir le fichier pour les styles exacts
- **Composants**:
  - Animation de sync (icône rotative)
  - Barre de progression avec stripes animées
  - Liste d'étapes (authentification ✓, documents ⟳, paramètres ○, historique ○)
  - Stats grid (3 colonnes)
  - Boutons d'action (annuler, réessayer, continuer)