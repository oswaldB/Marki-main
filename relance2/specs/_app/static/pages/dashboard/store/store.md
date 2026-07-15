# dashboard/store/store.js - Store Dashboard

**Fichier** : `app/static/pages/dashboard/store/store.js`

## Description

Store Alpine.js pour le dashboard. Calcule les KPIs côté frontend en agrégeant les données des API.

**Pas de route `/api/dashboard/`** - Tout est calculé en frontend.

## Code

```javascript
function dashboardStore() {
  return {
    // Données brutes
    impayes: [],
    relances: [],
    contacts: [],
    events: [],
    
    // KPIs calculés
    stats: {
      total_impayes: 0,
      montant_total: 0,
      relances_en_cours: 0,
      a_envoyer: 0,
      contacts_actifs: 0
    },
    
    loading: false,
    
    async init() {
      this.loading = true;
      
      // Appels parallèles aux API existantes
      await Promise.all([
        this.loadImpayes(),
        this.loadRelances(),
        this.loadContacts()
      ]);
      
      // Calcul des KPIs côté frontend
      this.calculateStats();
      
      this.loading = false;
    },
    
    async loadImpayes() {
      const res = await fetch('/api/impayes');
      this.impayes = await res.json();
    },
    
    async loadRelances() {
      const res = await fetch('/api/relances');
      this.relances = await res.json();
    },
    
    async loadContacts() {
      const res = await fetch('/api/contacts');
      this.contacts = await res.json();
    },
    
    calculateStats() {
      // Calculs côté client
      this.stats.total_impayes = this.impayes.length;
      this.stats.montant_total = this.impayes
        .reduce((sum, i) => sum + i.montant, 0);
      this.stats.relances_en_cours = this.relances
        .filter(r => r.statut === 'en_cours').length;
      this.stats.contacts_actifs = this.contacts.length;
    }
  }
}
```

## API utilisées

| Endpoint | Usage |
|----------|-------|
| `GET /api/impayes` | Calculer stats impayés |
| `GET /api/relances` | Calculer relances en cours |
| `GET /api/contacts` | Calculer contacts actifs |
| `GET /api/events` | Données graphiques |

## Note

**Pas de endpoint `/api/dashboard/*`** - Le dashboard agrège et calcule lui-même ses statistiques à partir des API existantes.
