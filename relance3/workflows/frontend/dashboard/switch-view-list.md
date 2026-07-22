# Workflow : Basculer en vue liste

## Écran
`dashboard.html`

## Élément déclencheur
Bouton avec `@click="viewMode = 'list'"`

## Action
Basculer l'affichage en mode liste

## Description
- Change le mode d'affichage des éléments
- Affiche les données sous forme de liste détaillée
- Persiste le choix en localStorage
- **Les données affichées proviennent de PouchDB** (pas d'API)

## Data Model
**Page Function:** `dashboardPage()`

**Stores Alpine.js:**
- $store.ui
- $store.sync

**Données (depuis PouchDB):**
- `kpis` - calculés depuis les collections PouchDB locales
- `chartData` - agrégés depuis PouchDB
- `activiteRecente` - événements depuis PouchDB
- `periode` - période sélectionnée
- `lastSyncTime` - heure du dernier sync PouchDB

**États UI:**
- `loading` - chargement initial depuis PouchDB
- `error` - erreur PouchDB
- `syncing` - synchronisation avec CouchDB en cours

## State Changes

**Modifications:**
- `currentView` modifié
- `activeTab` modifié
- `viewMode` modifié
- Les données affichées restent identiques (depuis PouchDB)

## PouchDB Calls

**Aucun** - Ce workflow ne fait que changer l'affichage UI.
Les données sont déjà chargées depuis PouchDB par les workflows parents.



## Organisation des fichiers

```
frontend/
└── app/
    └── dashboard/
        ├── index.html
        ├── components/
        │   └── (composants partagés)
        └── js/
            └── switch-view-list.js
```

### Fichier principal
- **HTML** : `frontend/app/dashboard/index.html`
- **Point d'entrée** : Initialise la page Alpine.js avec PouchDB

### Fichier workflow
- **JS** : `frontend/app/dashboard/js/switch-view-list.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/dashboard/js/switch-view-list.js
export function switchViewList() {
  // Implementation du workflow - change uniquement l'affichage
}
```

## Implementation

```javascript
switchView(mode) {
  this.currentView = mode;
  // Persist preference
  localStorage.setItem('dashboard_view', mode);
  
  // Note: les données (kpis, chartData, etc.)
  // proviennent déjà de PouchDB via les workflows parents
}

switchTab(tab) {
  this.activeTab = tab;
  // Load tab data if needed - depuis PouchDB
  if (tab === 'details' && !this.detailData) {
    this.loadDetailDataFromPouchDB();
  }
}

// Charger des données supplémentaires depuis PouchDB si nécessaire
async loadDetailDataFromPouchDB() {
  const result = await db.allDocs({
    startkey: 'facture:',
    endkey: 'facture:\ufff0',
    include_docs: true,
    limit: 100
  });
  this.detailData = result.rows.map(row => row.doc);
}
```

---

## Migration PouchDB

Ce workflow **ne nécessite pas de migration** car il n'utilise pas d'appel API.
C'est une action purement UI qui change l'affichage des données déjà chargées.

| Aspect | Implémentation |
|--------|----------------|
| Données affichées | PouchDB (via workflows parents) |
| Persistence préférence | localStorage (inchangé) |
| Appels réseau | Aucun |
| Offline | ✅ Fonctionne offline |
