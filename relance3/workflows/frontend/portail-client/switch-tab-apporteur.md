# Workflow : Onglet Apporteur

## Écran
`portail-client.html`

## Élément déclencheur
Onglet avec `@click="activeTab = 'apporteur'"`

## Action
Afficher les apporteurs

## Description
- Change l'onglet actif vers "apporteur"
- Affiche la liste des apporteurs affiliés et missions liées
- Les données sont chargées depuis PouchDB (si pas déjà en mémoire)

## Data Model
**Page Function:** `portailClientPage()`

**Données (depuis PouchDB):**
- `client` - données du client depuis PouchDB
- `apporteurs` - liste des apporteurs affiliés (depuis PouchDB)
- `missions` - missions liées (depuis PouchDB)
- `activeTab` - onglet actuellement sélectionné
- `db` - instance PouchDB

**États UI:**
- `loading`
- `error`
- `showPaiementModal`

## State Changes

**Modifications:**
- `currentView` modifié
- `activeTab` ← `'apporteur'`
- `viewMode` modifié

## PouchDB Operations (optionnel)

**Action:** Charger les apporteurs depuis PouchDB si pas déjà en mémoire.

**Méthodes utilisées (si données non chargées):**
- `db.allDocs({ startkey: 'apporteur:', endkey: 'apporteur:\ufff0' })` - Récupérer les apporteurs
- Filtrage côté client par `client_id`

**Note** : Ce workflow est principalement une action UI. Le chargement des données se fait généralement dans `initial-load`.

## API Calls

**Pas d'appel API** - Action côté client uniquement avec données PouchDB

## Organisation des fichiers

```
frontend/
└── app/
    └── portail-client/
        ├── index.html
        ├── components/
        │   └── (composants partagés)
        └── js/
            └── switch-tab-apporteur.js
```

### Fichier principal
- **HTML** : `frontend/app/portail-client/index.html`
- **Point d'entrée** : Initialise la page Alpine.js avec PouchDB

### Fichier workflow
- **JS** : `frontend/app/portail-client/js/switch-tab-apporteur.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/portail-client/js/switch-tab-apporteur.js
export function switchTabApporteur() {
  // Implementation avec données PouchDB
}
```

## Implementation

```javascript
switchTab(tab) {
  this.activeTab = tab;
  
  // Si onglet apporteur et données non chargées
  if (tab === 'apporteur' && !this.apporteurs?.length) {
    this.loadApporteurs();
  }
}

// Option: Charger les apporteurs depuis PouchDB
async loadApporteurs() {
  if (this.loadingApporteurs) return;
  
  this.loadingApporteurs = true;
  
  try {
    const result = await db.allDocs({
      startkey: 'apporteur:',
      endkey: 'apporteur:\ufff0',
      include_docs: true
    });
    
    // Filtrer par client_id
    this.apporteurs = result.rows
      .map(row => row.doc)
      .filter(a => a.client_id === this.client.id);
      
  } catch (error) {
    console.error('Erreur chargement apporteurs:', error);
  } finally {
    this.loadingApporteurs = false;
  }
}
```

## Notes

- **UI uniquement** : Ce workflow est principalement un changement d'état UI
- **Données PouchDB** : Les apporteurs sont stockés dans PouchDB et chargés une fois
- **Lazy loading** : Optionnel - charger les apporteurs seulement quand l'onglet est sélectionné
- **Pas d'écriture** : Ce workflow ne modifie pas PouchDB

---

## Migration depuis l'ancienne architecture

| Aspect | Avant | Après (PouchDB) |
|--------|-------|-----------------|
| Changement onglet | Côté client | **Conservé** - Côté client |
| Données apporteurs | API si besoin | PouchDB local |
| Latence | Instantanée | Instantanée |
| Offline | ✅ Oui (UI) | ✅ Oui (UI + données) |
