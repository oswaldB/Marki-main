---
id: relances-initial-load
type: frontend
folder: specs/workflows/frontend/relances/
description: Charger la liste des relances programmées et envoyées depuis PouchDB
depends_on: [auth-check]
screen: relances
global: false
mockup_entry: specs/mockups/relances.html
---

# relances-initial-load : Chargement initial Liste Relances (PouchDB)

## Description

Charger la liste des relances avec leur statut, payeur associé, et options de filtrage depuis PouchDB local.

## Étapes

```javascript
/**
 * @action Initialiser PouchDB et configurer le sync
 * @checkpoint pouchdb-initialized, bases locales prêtes
 * 
 * Code:
 * this.db = new PouchDB('marki-relances');
 * this.dbContacts = new PouchDB('marki-contacts');
 * this.db.sync(remoteUrl, { live: true, retry: true });
 */

/**
 * @action Initialiser les filtres par défaut (statut='')
 * @checkpoint state-initialized, filtres et pagination initialisés
 */

/**
 * @action Afficher le skeleton loader du tableau
 * @checkpoint skeleton-shown, lignes de chargement visibles
 */

/**
 * @action Récupérer les relances depuis PouchDB
 * @checkpoint relances-fetched, relances reçues
 * 
 * **Query PouchDB** :
 * const result = await db.allDocs({
 *   startkey: 'relance:',
 *   endkey: 'relance:\ufff0',
 *   include_docs: true
 * });
 * const relances = result.rows.map(r => r.doc);
 */

/**
 * @action Récupérer les contacts depuis PouchDB
 * @checkpoint contacts-fetched, contacts reçus
 * 
 * **Query PouchDB** :
 * const result = await dbContacts.allDocs({
 *   startkey: 'contact:',
 *   endkey: 'contact:\ufff0',
 *   include_docs: true
 * });
 * const contacts = result.rows.map(r => r.doc);
 */

/**
 * @action Configurer le listener pour les changements temps réel
 * @checkpoint changes-listener-active, mises à jour automatiques
 * 
 * Code:
 * db.changes({ since: 'now', live: true, include_docs: true })
 *   .on('change', (change) => { this.updateRelance(change.doc); });
 */

/**
 * @action Calculer les statistiques des relances côté client
 * @checkpoint stats-calculated, compteurs par statut calculés
 * 
 * **Approche full frontend** : Calcul à partir des données reçues :
 * relances.filter(r => r.statut === 'xxx').length
 */

/**
 * @action Stocker les données dans Alpine.store('relances')
 * @checkpoint data-stored, relances et stats disponibles
 */

/**
 * @action Rendre le tableau groupé par payeur
 * @checkpoint table-rendered, sections dépliables par payeur affichées
 */

/**
 * @action Activer les contrôles d'action (envoi, modification)
 * @checkpoint actions-enabled, boutons d'action fonctionnels
 */
```

## PouchDB Operations

### Chargement initial

```javascript
async loadRelances() {
  this.loading = true;
  
  try {
    // 1. Récupérer les relances
    const relancesResult = await db.allDocs({
      startkey: 'relance:',
      endkey: 'relance:\ufff0',
      include_docs: true
    });
    
    this.relances = relancesResult.rows.map(r => r.doc);
    
    // 2. Récupérer les contacts
    const contactsResult = await dbContacts.allDocs({
      startkey: 'contact:',
      endkey: 'contact:\ufff0',
      include_docs: true
    });
    
    this.contacts = contactsResult.rows.map(r => r.doc);
    
    // 3. Calculer les stats
    this.calculateStats();
    
  } catch (error) {
    console.error('Erreur chargement relances:', error);
    this.error = error.message;
  } finally {
    this.loading = false;
  }
}

calculateStats() {
  this.stats = {
    total: this.relances.length,
    brouillon: this.relances.filter(r => r.statut === 'brouillon').length,
    aValider: this.relances.filter(r => r.statut === 'a_valider').length,
    programmee: this.relances.filter(r => r.statut === 'programmee').length,
    envoyee: this.relances.filter(r => r.statut === 'envoyee').length,
    annulee: this.relances.filter(r => r.statut === 'annulee').length
  };
}
```

### Live Sync (temps réel)

```javascript
// Écouter les changements sur les relances
db.changes({
  since: 'now',
  live: true,
  include_docs: true
}).on('change', (change) => {
  if (change.doc.type === 'relance') {
    const index = this.relances.findIndex(r => r._id === change.doc._id);
    if (index >= 0) {
      // Mise à jour
      this.relances[index] = change.doc;
    } else {
      // Nouvelle relance
      this.relances.unshift(change.doc);
    }
    this.calculateStats();
  }
}).on('error', (err) => {
  console.error('Erreur sync relances:', err);
});
```

## Mockups de référence

- `specs/mockups/relances.html`

---

## Migration depuis l'ancienne API

| Aspect | Avant (API) | Après (PouchDB) |
|--------|-------------|-----------------|
| Relances | `GET /api/relances` | `db.allDocs()` |
| Contacts | `GET /api/contacts` | `dbContacts.allDocs()` |
| Calcul stats | Backend | Côté client |
| Mises à jour temps réel | Polling | `db.changes()` |
| Latence | ~300-800ms | ~50-100ms (local) |
| Offline | ❌ Impossible | ✅ Fonctionne offline |
