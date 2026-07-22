# Workflow Frontend : Chargement des Événements (Historique) - PouchDB

## Description
Charge l'historique des événements d'un impayé depuis **PouchDB local**.

## Objectifs
- Afficher tous les événements liés à l'impayé
- Utiliser PouchDB avec filtrage sur `entity_type` et `entity_id`
- Afficher le type d'événement avec une icône et une couleur appropriée

## Data Model

```javascript
// Structure d'un événement PouchDB
{
  "_id": "event:550e8400-...",
  "_rev": "1-abc123...",
  "type": "event",
  "id": "evt_uuid",
  "event_type": "relance", // "relance" | "paiement" | "suspension" | "systeme" | "sync" | "note"
  "entity_type": "impaye",
  "entity_id": "F123",
  "title": "Relance R2 envoyée",
  "description": "Email envoyé à contact@acme.fr",
  "icon": "fa-paper-plane",
  "created_at": "2024-03-15T10:30:00Z",
  "metadata": { "to": "contact@acme.fr" },
  "read": true
}
```

## Workflows

### Workflow 1: Chargement des événements depuis PouchDB

```javascript
/**
 * @checkpoint LoadEvents
 * Charge les événements depuis PouchDB avec filtrage
 */
loadEvents: async function(impayeId) {
  try {
    // Requête Mango sur PouchDB
    const result = await dbEvents.find({
      selector: {
        type: { $eq: 'event' },
        entity_type: { $eq: 'impaye' },
        entity_id: { $eq: impayeId }
      },
      sort: [{ created_at: 'desc' }]
    });
    
    // Transformer les événements pour l'affichage
    this.evenements = result.docs.map(event => ({
      id: event.id,
      _id: event._id,
      type: event.event_type,
      titre: event.title,
      description: event.description,
      icon: event.icon || this.getEventIcon(event.event_type),
      date: this.formatDate(event.created_at),
      metadata: event.metadata ? JSON.stringify(event.metadata) : null,
      read: this.isEventRead(event.id) // depuis localStorage
    }));
    
  } catch (error) {
    console.error('Erreur chargement événements:', error);
    this.error = error.message;
  }
},

/**
 * @checkpoint GetEventIcon
 * Retourne l'icône appropriée selon le type d'événement
 */
getEventIcon: function(type) {
  const icons = {
    'relance': 'fa-paper-plane',
    'paiement': 'fa-euro-sign',
    'suspension': 'fa-pause',
    'systeme': 'fa-cog',
    'sync': 'fa-sync-alt',
    'note': 'fa-sticky-note',
    'blacklist': 'fa-ban'
  };
  return icons[type] || 'fa-bell';
}
```

### Workflow 2: Live Sync des événements

```javascript
/**
 * @checkpoint SetupLiveSync
 * Écoute les nouveaux événements en temps réel
 */
setupEventsListener: function(impayeId) {
  dbEvents.changes({
    since: 'now',
    live: true,
    include_docs: true
  }).on('change', (change) => {
    if (change.doc.type === 'event' && 
        change.doc.entity_type === 'impaye' && 
        change.doc.entity_id === impayeId) {
      
      // Ajouter ou mettre à jour l'événement
      const existingIndex = this.evenements.findIndex(e => e.id === change.doc.id);
      const transformed = this.transformEvent(change.doc);
      
      if (existingIndex >= 0) {
        this.evenements[existingIndex] = transformed;
      } else {
        this.evenements.unshift(transformed);
      }
      
      // Trier par date
      this.evenements.sort((a, b) => new Date(b.date) - new Date(a.date));
    }
  });
}
```

## Template HTML

```html
<!-- Section Historique des événements -->
<div class="bg-white rounded-xl border border-slate-200 shadow-sm">
  <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
    <h3 class="font-semibold text-slate-900">
      <i class="fas fa-history text-sky-500 mr-2"></i>Historique des événements
    </h3>
    <span class="text-xs text-slate-500" x-text="(evenements?.length || 0) + ' événements'"></span>
  </div>
  
  <div class="p-6">
    <div class="space-y-6">
      <template x-for="(event, index) in evenements || []" :key="event._id">
        <div class="relative pl-8">
          <!-- Timeline line -->
          <div x-show="index < (evenements?.length || 0) - 1" 
               class="absolute left-3 top-8 bottom-0 w-0.5 bg-slate-200">
          </div>
          
          <!-- Icon avec couleur selon type -->
          <div class="absolute left-0 top-0 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs"
               :class="{
                 'bg-sky-100 text-sky-600': event.type === 'relance',
                 'bg-green-100 text-green-600': event.type === 'paiement',
                 'bg-amber-100 text-amber-600': event.type === 'suspension',
                 'bg-purple-100 text-purple-600': event.type === 'sync',
                 'bg-slate-100 text-slate-600': event.type === 'systeme'
               }">
            <i class="fas" :class="event.icon || 'fa-bell'"></i>
          </div>
          
          <!-- Content -->
          <div>
            <div class="flex items-center justify-between mb-1">
              <p class="text-sm font-medium text-slate-900" x-text="event.titre"></p>
              <span class="text-xs text-slate-400" x-text="event.date"></span>
            </div>
            <p x-show="event.description" 
               class="text-sm text-slate-600" 
               x-text="event.description"></p>
            
            <!-- Metadata si présent -->
            <div x-show="event.metadata" class="mt-2 text-xs text-slate-500">
              <span x-text="event.metadata"></span>
            </div>
          </div>
        </div>
      </template>
      
      <div x-show="!evenements?.length" class="text-center text-slate-400 text-sm py-8">
        <i class="fas fa-inbox text-3xl mb-2"></i>
        <p>Aucun événement</p>
      </div>
    </div>
  </div>
</div>
```

## PouchDB Operations

| Méthode | Description |
|---------|-------------|
| `dbEvents.find({ selector: { entity_type: 'impaye', entity_id: id } })` | Filtrer les événements liés |
| `dbEvents.changes({ live: true })` | Écouter les nouveaux événements |

## Types d'événements et couleurs

| Type | Icône | Couleur BG | Couleur Texte |
|------|-------|------------|---------------|
| relance | fa-paper-plane | bg-sky-100 | text-sky-600 |
| paiement | fa-euro-sign | bg-green-100 | text-green-600 |
| suspension | fa-pause | bg-amber-100 | text-amber-600 |
| sync | fa-sync-alt | bg-purple-100 | text-purple-600 |
| systeme | fa-cog | bg-slate-100 | text-slate-600 |
| note | fa-sticky-note | bg-blue-100 | text-blue-600 |
| blacklist | fa-ban | bg-red-100 | text-red-600 |

## Migration depuis l'ancienne API

| Aspect | Avant (API) | Après (PouchDB) |
|--------|-------------|-----------------|
| Source | `GET /api/events/by-entity?entity_type=impaye&entity_id={id}` | `dbEvents.find({ selector })` |
| Temps réel | Polling | `dbEvents.changes({ live: true })` |
| Filtrage | SQL WHERE | Mango Query selector |
| Tri | SQL ORDER BY | `sort` option dans find |
| Latence | ~200-500ms | ~10-50ms (local) |
| Offline | ❌ Impossible | ✅ Fonctionne offline |

## Notes

- Les événements sont triés par date de création décroissante
- La ligne de timeline connecte les événements entre eux
- Chaque type d'événement a sa propre couleur pour une identification rapide
- Le champ `metadata` peut contenir des infos JSON additionnelles
- Le `_id` PouchDB est utilisé comme `key` dans le template pour reactivité
