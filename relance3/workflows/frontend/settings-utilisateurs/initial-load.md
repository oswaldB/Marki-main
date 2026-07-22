---
id: settings-utilisateurs-initial-load
type: frontend
folder: specs/workflows/frontend/settings-utilisateurs/
description: Charger la liste des utilisateurs avec leurs rôles depuis PouchDB
depends_on: [auth-check]
screen: settings-utilisateurs
global: false
mockup_entry: specs/mockups/settings-utilisateurs.html
---

# settings-utilisateurs-initial-load : Chargement initial Gestion Utilisateurs (PouchDB)

## Description

Charger la liste des utilisateurs avec leurs rôles, statut et dernière connexion depuis PouchDB.

## Étapes

```javascript
/**
 * @action Initialiser PouchDB et configurer le sync
 * @checkpoint pouchdb-initialized, base users prête
 * 
 * Code:
 * this.db = new PouchDB('marki-configs');
 * this.db.sync(remoteUrl, { live: true, retry: true });
 */

/**
 * @action Initialiser les filtres par défaut
 * @checkpoint state-initialized, filtres rôle et recherche prêts
 */

/**
 * @action Afficher le spinner de chargement
 * @checkpoint loading-shown, tableau en chargement
 */

/**
 * @action Récupérer les utilisateurs depuis PouchDB
 * @checkpoint users-fetched, liste des utilisateurs reçue
 * 
 * **Query PouchDB** :
 * const result = await db.allDocs({
 *   startkey: 'user:',
 *   endkey: 'user:\ufff0',
 *   include_docs: true
 * });
 */

/**
 * @action Filtrer les utilisateurs actifs (suppression logique)
 * @checkpoint users-filtered, uniquement actifs
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
 *   filter: (doc) => doc.type === 'user'
 * }).on('change', (change) => { this.updateUtilisateurs(change.doc); });
 */

/**
 * @action Stocker les données dans le store page
 * @checkpoint data-stored, utilisateurs et rôles disponibles
 */

/**
 * @action Rendre le tableau avec colonnes rôle et statut
 * @checkpoint table-rendered, utilisateurs avec badges actif/inactif visibles
 */

/**
 * @action Activer les boutons d'action (éditer, désactiver, supprimer)
 * @checkpoint actions-enabled, contrôles d'administration fonctionnels
 */
```

## PouchDB Operations

### Chargement initial

```javascript
async loadUtilisateurs() {
  this.loading = true;
  
  try {
    // Récupérer tous les utilisateurs depuis PouchDB
    const result = await db.allDocs({
      startkey: 'user:',
      endkey: 'user:\ufff0',
      include_docs: true
    });
    
    // Filtrer les utilisateurs actifs (suppression logique)
    this.utilisateurs = result.rows
      .map(row => row.doc)
      .filter(doc => doc.actif !== false);
    
  } catch (error) {
    console.error('Erreur chargement utilisateurs:', error);
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
  filter: (doc) => doc.type === 'user'
}).on('change', (change) => {
  // Mettre à jour la liste des utilisateurs
  const index = this.utilisateurs.findIndex(u => u._id === change.doc._id);
  
  if (change.deleted || change.doc.actif === false) {
    this.utilisateurs = this.utilisateurs.filter(u => u._id !== change.doc._id);
  } else if (index >= 0) {
    this.utilisateurs[index] = change.doc;
  } else {
    this.utilisateurs.push(change.doc);
  }
}).on('error', (err) => {
  console.error('Erreur sync utilisateurs:', err);
});
```

## Mockups de référence

- `specs/mockups/settings-utilisateurs.html`

---

## Migration depuis l'ancienne API

| Aspect | Avant (API) | Après (PouchDB) |
|--------|-------------|-----------------|
| Utilisateurs | `GET /api/users` | `db.allDocs({ startkey: 'user:' })` |
| Filtrage | Backend | Client-side (`filter(doc => doc.actif !== false)`) |
| Mises à jour temps réel | Polling | `db.changes({ filter: ... })` |
| Latence | ~200-500ms | ~10-50ms (local) |
| Offline | ❌ Impossible | ✅ Fonctionne offline |
