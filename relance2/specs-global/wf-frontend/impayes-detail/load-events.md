# Workflow Frontend : Chargement des Événements (Historique)

## Description
Charge l'historique des événements d'un impayé depuis la table `events`.

## Objectifs
- Afficher tous les événements liés à l'impayé
- Utiliser la table `events` au lieu de l'ancien système `historique`
- Afficher le type d'événement avec une icône et une couleur appropriée

## Data Model

```javascript
// Structure d'un événement
{
  id: "evt_uuid",
  type: "relance" | "paiement" | "suspension" | "systeme" | "sync" | "note",
  titre: "Relance R2 envoyée",
  description: "Email envoyé à contact@acme.fr",
  icon: "fa-paper-plane",
  date: "15/03/2024",
  metadata: "À: contact@acme.fr",  // Info supplémentaire
  read: true
}
```

## Workflows

### Workflow 1: Chargement des événements

```javascript
/**
 * @checkpoint LoadEvents
 * Charge les événements depuis la table events
 */
loadEvents: async function(impayeId) {
  const token = localStorage.getItem('marki_token');
  const response = await fetch(`/api/events/by-entity?entity_type=impaye&entity_id=${impayeId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  if (response.status === 401) {
    window.location.href = '/login';
    return;
  }
  
  const data = await response.json();
  
  if (data.success) {
    // Transformer les événements pour l'affichage
    this.evenements = data.data.events.map(event => ({
      id: event.id,
      type: event.type,
      titre: event.titre,
      description: event.description,
      icon: event.icon || this.getEventIcon(event.type),
      date: this.formatDate(event.created_at),
      metadata: event.metadata ? JSON.parse(event.metadata) : null,
      read: event.read
    }));
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
      <template x-for="(event, index) in evenements || []" :key="event.id">
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

## API Endpoints

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/events/by-entity?entity_type=impaye&entity_id={id}` | Événements de l'impayé |

## Requête SQL Backend

```sql
SELECT 
    e.id,
    e.type,
    e.titre,
    e.description,
    COALESCE(e.icon, 'fa-bell') as icon,
    e.created_at,
    e.metadata,
    e.read
FROM events e
WHERE e.entity_type = 'impaye' 
  AND e.entity_id = ?
ORDER BY e.created_at DESC;
```

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

## Notes

- Les événements sont triés par date de création décroissante
- La ligne de timeline connecte les événements entre eux
- Chaque type d'événement a sa propre couleur pour une identification rapide
- Le champ `metadata` peut contenir des infos JSON additionnelles
