# Workflow Frontend : Chargement et Synchronisation des Missions (PouchDB)

## Description
Charge les missions d'un impayé depuis **PouchDB local** et permet leur synchronisation depuis ADTI via un bouton dédié. Les données sont synchronisées automatiquement avec CouchDB.

## UI/UX

### Affichage des Missions

```
┌─────────────────────────────────────────────────────────────────┐
│  🔧 MISSIONS ET INTERVENTIONS                     [🔄 Sync ADTI] │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ 🏷️ vente           Diagnostic amiante    10/01/2024         ││
│  │     Diagnostic réglementaire avant travaux                  ││
│  └─────────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ 🏷️ repérage amiante  DPE                   12/01/2024     ││
│  │     Diagnostic de performance énergétique                   ││
│  └─────────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────────┤
│  🛠️ INTERVENTIONS                                               │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ 👤 Pierre Martin    Maintenance          10/02/2024       ││
│  │     Bureaux étage 2 - Révision climatisation               ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

## Data Model Alpine.js

```javascript
// Dans impayesDetailPage()
return {
  // ... autres propriétés ...
  
  // Missions depuis PouchDB
  missions: [],              // Mission[]
  syncingMissions: false,    // État du bouton sync
  lastSyncDate: null,        // Date de dernière sync
  
  // PouchDB
  dbMissions: null,          // Instance PouchDB
  
  // Méthodes
  async loadMissions() { /* ... */ },
  async syncMissions() { /* ... */ },
}
```

## Workflows

### Workflow 1: Chargement Initial des Missions depuis PouchDB

```javascript
/**
 * @checkpoint LoadMissions
 * Charge les missions depuis PouchDB local
 */
loadMissions: async function() {
  try {
    // Requête Mango sur PouchDB pour les missions liées à l'impayé
    const result = await dbMissions.find({
      selector: {
        type: { $eq: 'mission' },
        impaye_id: { $eq: this.impaye.id }
      },
      sort: [{ dateIntervention: 'desc' }]
    });
    
    this.missions = result.docs;
    this.lastSyncDate = this.getLastSyncDate();
    
  } catch (error) {
    console.error('Erreur chargement missions:', error);
    this.error = error.message;
  }
}

/**
 * @checkpoint GetLastSyncDate
 * Récupère la date de dernière sync depuis localStorage ou PouchDB
 */
getLastSyncDate: function() {
  // Option 1: depuis localStorage
  return localStorage.getItem('marki_last_missions_sync');
  
  // Option 2: depuis un document de sync dans PouchDB
  // return syncDoc.lastSyncDate;
}
```

### Workflow 2: Synchronisation depuis ADTI vers PouchDB

```javascript
/**
 * @checkpoint SyncMissionsFromADTI
 * Déclenche la synchronisation des missions depuis ADTI vers PouchDB
 */
syncMissions: async function() {
  if (this.syncingMissions) return;
  
  this.syncingMissions = true;
  
  try {
    // 1. Appel API ADTI pour récupérer les missions
    const token = localStorage.getItem('marki_token');
    const response = await fetch(`/api/adti/missions?numeroDossier=${this.impaye.numeroDossier}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.status === 401) {
      window.location.href = '/login';
      return;
    }
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Échec de la récupération ADTI');
    }
    
    // 2. Transformer et insérer les missions dans PouchDB
    const missionsToInsert = data.data.missions.map(mission => ({
      _id: `mission:${mission.id || crypto.randomUUID()}`,
      type: 'mission',
      impaye_id: this.impaye.id,
      facture_id: this.impaye.facture_id,
      ...mission,
      synced_at: new Date().toISOString(),
      source: 'ADTI'
    }));
    
    // 3. Insérer en bulk dans PouchDB
    const insertResult = await dbMissions.bulkDocs(missionsToInsert);
    
    // 4. Mettre à jour la liste locale
    this.missions = missionsToInsert;
    this.lastSyncDate = new Date().toISOString();
    localStorage.setItem('marki_last_missions_sync', this.lastSyncDate);
    
    // 5. Créer un event de synchronisation dans PouchDB
    const eventDoc = {
      _id: `event:${crypto.randomUUID()}`,
      type: 'event',
      event_type: 'sync',
      title: 'Missions synchronisées',
      description: `${missionsToInsert.length} mission(s) depuis ADTI`,
      entity_type: 'impaye',
      entity_id: this.impaye.id,
      missions_synced: missionsToInsert.length,
      created_at: new Date().toISOString(),
      by_marki: false,
      user_id: this.user?.id
    };
    
    await dbEvents.put(eventDoc);
    
    // 6. Notification succès
    this.showToast(
      'Synchronisation réussie',
      `${missionsToInsert.length} mission(s) synchronisée(s)`,
      'success'
    );
    
  } catch (error) {
    console.error('Erreur sync missions:', error);
    this.showToast('Erreur', error.message || 'Impossible de synchroniser les missions', 'error');
  } finally {
    this.syncingMissions = false;
  }
}
```

### Workflow 3: Live Sync des missions

```javascript
/**
 * @checkpoint SetupMissionsListener
 * Écoute les changements sur les missions en temps réel
 */
setupMissionsListener: function() {
  dbMissions.changes({
    since: 'now',
    live: true,
    include_docs: true
  }).on('change', (change) => {
    if (change.doc.type === 'mission' && change.doc.impaye_id === this.impaye.id) {
      // Mettre à jour la liste des missions
      this.loadMissions();
    }
  });
}
```

## PouchDB Operations

| Méthode | Description |
|---------|-------------|
| `dbMissions.find({ selector: { type: 'mission', impaye_id: id } })` | Charger les missions liées |
| `dbMissions.bulkDocs(missions)` | Insérer/mettre à jour les missions depuis ADTI |
| `dbMissions.changes({ live: true })` | Écouter les changements en temps réel |
| `dbEvents.put(eventDoc)` | Créer un event de synchronisation |

## Structure du document PouchDB (mission)

```javascript
{
  "_id": "mission:550e8400-...",
  "_rev": "1-abc123...",
  "type": "mission",
  "id": "mission-123",
  "impaye_id": "F123",
  "facture_id": "facture-456",
  "typeMission": "vente",
  "type": "Diagnostic amiante",
  "description": "Diagnostic réglementaire avant travaux",
  "dateIntervention": "2024-01-10",
  "technicien": "Pierre Martin",
  "synced_at": "2024-01-15T10:30:00Z",
  "source": "ADTI"
}
```

## Template HTML (Alpine.js)

```html
<!-- Section Missions et Interventions -->
<div class="bg-white rounded-xl border border-slate-200 shadow-sm">
  <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
    <h3 class="font-semibold text-slate-900">
      <i class="fas fa-tasks text-slate-400 mr-2"></i>Missions et interventions
    </h3>
    <button @click="syncMissions()" :disabled="syncingMissions"
            class="text-xs px-3 py-1.5 bg-sky-50 text-sky-600 hover:bg-sky-100 
                   disabled:opacity-50 rounded-lg font-medium transition-colors 
                   flex items-center gap-1.5">
      <i class="fas fa-sync-alt" :class="syncingMissions ? 'fa-spin' : ''"></i>
      <span x-text="syncingMissions ? 'Sync...' : 'Sync ADTI'"></span>
    </button>
  </div>
  
  <div class="p-6">
    <!-- Missions -->
    <template x-if="missions?.length">
      <div class="mb-4">
        <p class="text-xs text-slate-500 uppercase tracking-wider font-medium mb-2">
          Missions
        </p>
        <div class="space-y-2">
          <template x-for="(mission, index) in missions" :key="mission._id">
            <div class="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <span class="px-2 py-0.5 text-xs font-medium bg-sky-100 text-sky-700 rounded"
                        x-text="mission.typeMission"></span>
                  <span class="font-medium text-slate-900" x-text="mission.type"></span>
                </div>
                <span class="text-xs text-slate-500" x-text="mission.dateIntervention"></span>
              </div>
              <p class="text-xs text-slate-500 mt-1" x-text="mission.description"></p>
            </div>
          </template>
        </div>
      </div>
    </template>
    
    <!-- Interventions (inchangé) -->
    <template x-for="(intervention, index) in interventions || []" :key="index">
      <!-- ... -->
    </template>
    
    <!-- État vide -->
    <div x-show="!missions?.length && !interventions?.length" 
         class="text-center text-slate-400 text-sm py-8">
      <i class="fas fa-clipboard-list text-3xl mb-2"></i>
      <p>Aucune mission ou intervention</p>
    </div>
  </div>
</div>
```

## Migration depuis l'ancienne API

| Aspect | Avant (API) | Après (PouchDB) |
|--------|-------------|-----------------|
| Chargement | `GET /api/impayes/:id/missions` | `dbMissions.find({ selector })` |
| Synchronisation | `POST /api/impayes/:id/sync-missions` | API ADTI puis `bulkDocs()` local |
| Stockage | Table `missions` backend | PouchDB local |
| Temps réel | Polling | `dbMissions.changes()` |
| Offline | ❌ Impossible | ✅ Affichage des missions locales |

## Gestion des Erreurs

| Code | Message | Action |
|------|---------|--------|
| 401 | Token expiré | Redirection /login |
| ADTI 404 | Dossier non trouvé dans ADTI | Toast erreur |
| ADTI 403 | Accès refusé à ADTI | Toast erreur |
| PouchDB error | "Base de données locale non disponible" | Alert |
| bulkDocs conflict | Retry avec nouvelle révision | Automatic retry |

## Notes

- Le bouton "Sync ADTI" est désactivé pendant la synchronisation
- L'icône tourne pendant la sync (`fa-spin`)
- Les missions sont triées par date d'intervention (plus récente en premier)
- Le `typeMission` est affiché comme un badge (ex: "vente", "repérage amiante")
- Les missions sont stockées localement dans PouchDB et peuvent être consultées offline
- La source ADTI est marquée dans le document pour traçabilité
