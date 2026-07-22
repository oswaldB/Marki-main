---
id: smart-marki-initial-load
type: frontend
folder: specs/workflows/frontend/smart-marki/
description: Charger les suggestions IA et statistiques Smart Marki depuis PouchDB
depends_on: [auth-check]
screen: smart-marki
global: false
mockup_entry: specs/mockups/smart-marki.html
---

# smart-marki-initial-load : Chargement initial Smart Marki (PouchDB)

## Description

Charger les suggestions générées par l'IA, les statistiques d'utilisation et l'état des features depuis PouchDB.

## Étapes

```javascript
/**
 * @action Initialiser PouchDB et configurer le sync
 * @checkpoint pouchdb-initialized, base smart-marki prête
 * 
 * Code:
 * this.db = new PouchDB('marki-insights');
 * this.db.sync(remoteUrl, { live: true, retry: true });
 */

/**
 * @action Initialiser l'état des features activées depuis localStorage
 * @checkpoint features-initialized, préférences utilisateur chargées
 */

/**
 * @action Afficher le spinner de chargement
 * @checkpoint loading-shown, interface en chargement
 */

/**
 * @action Récupérer les suggestions IA depuis PouchDB
 * @checkpoint suggestions-fetched, suggestions d'actions reçues
 * 
 * **Query PouchDB** :
 * const result = await db.allDocs({
 *   startkey: 'insight:',
 *   endkey: 'insight:\ufff0',
 *   include_docs: true
 * });
 */

/**
 * @action Filtrer les suggestions non appliquées/non ignorées
 * @checkpoint suggestions-filtered, uniquement actives
 */

/**
 * @action Récupérer l'historique des actions depuis PouchDB
 * @checkpoint history-fetched, actions précédemment acceptées/rejetées
 * 
 * **Query PouchDB** :
 * const historyResult = await db.allDocs({
 *   startkey: 'smart-action:',
 *   endkey: 'smart-action:\ufff0',
 *   include_docs: true
 * });
 */

/**
 * @action Configurer le listener pour les changements temps réel
 * @checkpoint changes-listener-active, mises à jour automatiques
 * 
 * Code:
 * db.changes({ 
 *   since: 'now', 
 *   live: true, 
 *   include_docs: true,
 *   filter: (doc) => doc.type === 'insight' || doc.type === 'smart-action'
 * }).on('change', (change) => { this.updateSmartData(change.doc); });
 */

/**
 * @action Stocker les données dans le store page
 * @checkpoint data-stored, suggestions, stats et historique disponibles
 */

/**
 * @action Rendre les cartes de suggestions avec niveaux de confiance
 * @checkpoint cards-rendered, suggestions affichées avec boutons accepter/refuser
 */

/**
 * @action Activer l'assistant chat si feature activée
 * @checkpoint chat-enabled, interface de chat fonctionnelle
 */
```

## PouchDB Operations

### Chargement initial

```javascript
async loadSmartMarkiData() {
  this.loading = true;
  
  try {
    // 1. Récupérer les suggestions depuis PouchDB
    const result = await db.allDocs({
      startkey: 'insight:',
      endkey: 'insight:\ufff0',
      include_docs: true
    });
    
    // 2. Filtrer les suggestions non appliquées/non ignorées
    this.suggestions = result.rows
      .map(row => row.doc)
      .filter(doc => !doc.applied && !doc.dismissed && doc.actif !== false);
    
    // 3. Récupérer l'historique des actions
    const historyResult = await db.allDocs({
      startkey: 'smart-action:',
      endkey: 'smart-action:\ufff0',
      include_docs: true
    });
    
    this.historiqueActions = historyResult.rows
      .map(row => row.doc)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    // 4. Calculer les stats
    this.stats = this.calculateStats();
    
  } catch (error) {
    console.error('Erreur chargement Smart Marki:', error);
    this.error = error.message;
  } finally {
    this.loading = false;
  }
}
```

### Live Sync (temps réel)

```javascript
db.changes({
  since: 'now',
  live: true,
  include_docs: true,
  filter: (doc) => doc.type === 'insight' || doc.type === 'smart-action'
}).on('change', (change) => {
  if (change.doc.type === 'insight') {
    this.updateSuggestions(change.doc);
  } else if (change.doc.type === 'smart-action') {
    this.updateHistory(change.doc);
  }
}).on('error', (err) => {
  console.error('Erreur sync Smart Marki:', err);
});
```

## Mockups de référence

- `specs/mockups/smart-marki.html`

---

## Migration depuis l'ancienne API

| Aspect | Avant (API) | Après (PouchDB) |
|--------|-------------|-----------------|
| Suggestions | `GET /api/smart/suggestions` | `db.allDocs({ startkey: 'insight:' })` |
| Historique | `GET /api/smart/history` | `db.allDocs({ startkey: 'smart-action:' })` |
| Filtrage | Backend | Client-side (non appliquées/non ignorées) |
| Mises à jour temps réel | Polling | `db.changes({ filter: ... })` |
| Latence | ~200-500ms | ~10-50ms (local) |
| Offline | ❌ Impossible | ✅ Fonctionne offline |
