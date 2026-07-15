# Workflow : Synchronisation des données

## Écran
`dashboard.html`

## Élément déclencheur
Bouton avec `@click="syncData()"`

## Action
Lancer la synchronisation complète des données

## Description
- Déclenche une synchronisation manuelle
- Appelle une séquence de backend workflows
- Affiche un indicateur de progression
- Crée un event de synchronisation terminée
- Rafraîchit les KPIs et graphiques après synchronisation

## Séquence des backend workflows

La synchronisation appelle les backend workflows dans l'ordre suivant :

```
1. import-invoices
   ↓
2. verify-paid-invoices
   ↓
3. regels-attribution
   ↓
4. CREATE event { type: 'sync', title: 'Synchronisation terminée', ... }
```

### 1. import-invoices
**Description :** Importe les nouvelles factures depuis la source externe

### 2. verify-paid-invoices
**Description :** Vérifie quelles factures ont été payées et met à jour leur statut

### 3. regels-attribution
**Description :** Attribue les règlements aux factures correspondantes

### 4. Création de l'event
**Description :** Crée un event en base de données pour marquer la fin de la synchronisation

**Payload event :**
```json
{
  "type": "sync",
  "title": "Synchronisation terminée",
  "description": "Synchronisation effectuée avec succès",
  "metadata": {
    "user_id": string,        // ID de l'utilisateur qui a lancé la synchro
    "timestamp": string,      // ISO 8601
    "imported_count": number, // Nombre de factures importées
    "verified_count": number, // Nombre de factures vérifiées
    "regels_count": number    // Nombre de règlements attribués
  },
  "icon": "fa-sync-alt"
}
```

## Data Model

**Page Function:** `dashboardPage()`

**Stores Alpine.js:**
- $store.ui
- $store.sync

**Données:**
- `kpis`
- `chartData`
- `events`
- `lastSyncTime`

**États UI:**
- `loading`
- `error`
- `syncing`
- `syncProgress` - pourcentage de progression (0-100)

## State Changes

**Modifications:**
- `syncing` → `true` → `false`
- `syncProgress` → 0 → 25 → 50 → 75 → 100
- `lastSyncTime` ← heure de fin de synchronisation
- `events` ← ajout du nouvel event de sync

## API Calls

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `POST /api/import/invoices` | POST | Étape 1: Import des factures |
| `POST /api/workflows/verify-paid-invoices` | POST | Étape 2: Vérification des paiements |
| `POST /api/workflows/regels-attribution` | POST | Étape 3: Attribution des règlements |
| `POST /api/events` | POST | Étape 4: Création de l'event de fin |

**Endpoint détaillé :** `POST /api/workflows/sync-orchestrator`

Alternative : Un seul endpoint backend qui orchestre les 3 workflows.

## Réponse attendue

```json
{
  "success": true,
  "data": {
    "steps": [
      { "name": "import-invoices", "status": "completed", "count": 15 },
      { "name": "verify-paid-invoices", "status": "completed", "count": 8 },
      { "name": "regels-attribution", "status": "completed", "count": 8 },
      { "name": "create-event", "status": "completed" }
    ],
    "event": {
      "id": "...",
      "type": "sync",
      "title": "Synchronisation terminée",
      "created_at": "2024-01-15T09:45:00Z"
    }
  }
}
```

## Organisation des fichiers

```
frontend/
└── app/
    └── dashboard/
        ├── index.html
        └── js/
            └── sync-data.js
```

### Fichier workflow
- **JS** : `frontend/app/dashboard/js/sync-data.js`

```javascript
// frontend/app/dashboard/js/sync-data.js
export function syncData() {
  // Implementation du workflow
}
```

## Implementation

```javascript
async syncData() {
  // 1. Check if already syncing
  if (this.syncing) return;
  
  // 2. Set states
  this.syncing = true;
  this.syncProgress = 0;
  this.error = null;
  Alpine.store('sync').syncing = true;
  
  try {
    // 3. Call orchestrator API (qui gère les 3 workflows backend)
    const response = await fetch('/api/workflows/sync-orchestrator', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error?.message);
    }
    
    // 4. Update progress based on steps
    this.syncProgress = 100;
    
    // 5. Update sync store
    Alpine.store('sync').lastSyncTime = new Date().toISOString();
    Alpine.store('sync').syncStatus = 'success';
    
    // 6. Add event to local events array
    if (data.data.event) {
      this.events.unshift({
        ...data.data.event,
        time: 'À l\'instant'
      });
    }
    
    // 7. Reload page data
    await this.loadData();
    
    // 8. Notify success
    Alpine.store('ui').addToast('Synchronisation réussie', 'success');
    
  } catch (error) {
    this.error = error.message;
    Alpine.store('sync').syncStatus = 'error';
    Alpine.store('ui').addToast(error.message, 'error');
  } finally {
    // 9. Reset states
    this.syncing = false;
    Alpine.store('sync').syncing = false;
    setTimeout(() => { this.syncProgress = 0; }, 500);
  }
}
```

## Dépendances backend

Les workflows backend suivants doivent exister :
- `specs/workflows/backend/import-invoices/`
- `specs/workflows/backend/verify-paid-invoices/`
- `specs/workflows/backend/regels-attribution/`

## Logs (console.log) - OBLIGATOIRE

Chaque étape du workflow de synchronisation manuelle doit être loguée avec `console.log()` :

| Checkpoint | Instruction console.log |
|------------|------------------------|
| `start` | `console.log('[WORKFLOW.dashboard-sync-data] START: Clic bouton synchronisation')` |
| `button-disabled` | `console.log('[WORKFLOW.dashboard-sync-data] STATE: Bouton désactivé, syncing=true, progress=0')` |
| `api-call-start` | `console.log('[WORKFLOW.dashboard-sync-data] STEP: Appel API POST /api/workflows/sync-orchestrator')` |
| `api-call-success` | `console.log('[WORKFLOW.dashboard-sync-data] DATA: Réponse orchestrateur reçue:', {steps: data.data.steps})` |
| `import-invoices-complete` | `console.log('[WORKFLOW.dashboard-sync-data] STEP: import-invoices terminé:', {count: steps[0].count})` |
| `verify-paid-invoices-complete` | `console.log('[WORKFLOW.dashboard-sync-data] STEP: verify-paid-invoices terminé:', {count: steps[1].count})` |
| `regels-attribution-complete` | `console.log('[WORKFLOW.dashboard-sync-data] STEP: regels-attribution terminé:', {count: steps[2].count})` |
| `event-created` | `console.log('[WORKFLOW.dashboard-sync-data] DATA: Event sync créé:', data.data.event)` |
| `data-updated` | `console.log('[WORKFLOW.dashboard-sync-data] SUCCESS: lastSyncTime et syncStatus mis à jour')` |
| `events-refreshed` | `console.log('[WORKFLOW.dashboard-sync-data] STEP: Rechargement données dashboard (loadData)')` |
| `end` | `console.log('[WORKFLOW.dashboard-sync-data] END: Synchronisation terminée en', duree, 'ms')` |
| `error` | `console.error('[WORKFLOW.dashboard-sync-data] ERROR:', error.message)` |
