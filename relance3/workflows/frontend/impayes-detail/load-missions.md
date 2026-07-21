# Workflow Frontend : Chargement et Synchronisation des Missions

## Description
Charge les missions d'un impayé et permet leur synchronisation depuis ADTI via un bouton dédié.

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
  
  // Missions
  missions: [],              // Mission[]
  syncingMissions: false,    // État du bouton sync
  lastSyncDate: null,        // Date de dernière sync
  
  // Méthodes
  async loadMissions() { /* ... */ },
  async syncMissions() { /* ... */ },
}
```

## Workflows

### Workflow 1: Chargement Initial des Missions

```javascript
/**
 * @checkpoint LoadMissions
 * Charge les missions depuis l'API Marki
 */
loadMissions: async function() {
  const token = localStorage.getItem('marki_token');
  const response = await fetch(`/api/impayes/${this.impaye.id}/missions`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  if (response.status === 401) {
    window.location.href = '/login';
    return;
  }
  
  if (response.status === 200) {
    const data = await response.json();
    this.missions = data.data?.missions || [];
    this.lastSyncDate = data.data?.lastSyncDate;
  }
}
```

### Workflow 2: Synchronisation depuis ADTI

```javascript
/**
 * @checkpoint SyncMissionsFromADTI
 * Déclenche la synchronisation des missions depuis ADTI
 */
syncMissions: async function() {
  if (this.syncingMissions) return;
  
  this.syncingMissions = true;
  
  try {
    const token = localStorage.getItem('marki_token');
    const response = await fetch(`/api/impayes/${this.impaye.id}/sync-missions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        numero_dossier: this.impaye.numeroDossier
      })
    });
    
    if (response.status === 401) {
      window.location.href = '/login';
      return;
    }
    
    const data = await response.json();
    
    if (data.success) {
      // Mettre à jour la liste locale
      this.missions = data.data.missions;
      this.lastSyncDate = new Date().toISOString();
      
      this.showToast(
        'Synchronisation réussie', 
        `${data.data.missionsSynced} mission(s) synchronisée(s)`, 
        'success'
      );
      
      // Ajouter un événement local
      this.impaye.evenements.unshift({
        type: 'sync',
        icon: 'fa-sync-alt',
        titre: 'Missions synchronisées',
        date: new Date().toLocaleDateString('fr-FR'),
        description: `${data.data.missionsSynced} mission(s) depuis ADTI`
      });
    } else {
      this.showToast('Erreur', data.message || 'Échec de la synchronisation', 'error');
    }
  } catch (error) {
    console.error('Erreur sync missions:', error);
    this.showToast('Erreur', 'Impossible de synchroniser les missions', 'error');
  } finally {
    this.syncingMissions = false;
  }
}
```

## API Endpoints Résumé

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/impayes/:id/missions` | Liste des missions de l'impayé |
| POST | `/api/impayes/:id/sync-missions` | Synchroniser depuis ADTI |

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
          <template x-for="(mission, index) in missions" :key="index">
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

## Gestion des Erreurs

| Code | Message | Action |
|------|---------|--------|
| 401 | Token expiré | Redirection /login |
| 404 | Dossier non trouvé dans ADTI | Toast erreur |
| 403 | Accès refusé à ADTI | Toast erreur |
| 500 | Erreur serveur | Toast erreur + log |

## Notes

- Le bouton "Sync ADTI" est désactivé pendant la synchronisation
- L'icône tourne pendant la sync (`fa-spin`)
- Les missions sont triées par date d'intervention (plus récente en premier)
- Le `typeMission` est affiché comme un badge (ex: "vente", "repérage amiante")
