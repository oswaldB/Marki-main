---
id: settings-smtp-initial-load
type: frontend
folder: specs/workflows/frontend/settings-smtp/
description: Charger les profils SMTP configurés depuis PouchDB
depends_on: [auth-check]
screen: settings-smtp
global: false
mockup_entry: specs/mockups/settings-smtp.html
---

# settings-smtp-initial-load : Chargement initial Profils SMTP (PouchDB)

## Description

Charger la liste des profils SMTP depuis PouchDB avec leur statut et statistiques d'envoi.

## Étapes

```javascript
/**
 * @action Initialiser PouchDB et configurer le sync
 * @checkpoint pouchdb-initialized, base configs prête
 * 
 * Code:
 * this.db = new PouchDB('marki-configs');
 * this.db.sync(remoteUrl, { live: true, retry: true });
 */

/**
 * @action Afficher le spinner de chargement
 * @checkpoint loading-shown, liste en chargement
 */

/**
 * @action Récupérer les profils SMTP depuis PouchDB
 * @checkpoint profils-fetched, profils SMTP reçus
 * 
 * **Query PouchDB** :
 * const result = await db.allDocs({
 *   startkey: 'smtp-profile:',
 *   endkey: 'smtp-profile:\ufff0',
 *   include_docs: true
 * });
 */

/**
 * @action Filtrer les profils actifs (suppression logique)
 * @checkpoint profils-filtered, uniquement actifs
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
 *   filter: (doc) => doc.type === 'smtp-profile'
 * }).on('change', (change) => { this.updateProfils(change.doc); });
 */

/**
 * @action Stocker les données dans le store page
 * @checkpoint data-stored, profils disponibles
 */

/**
 * @action Rendre la liste des profils avec indicateurs de statut
 * @checkpoint list-rendered, badges actif/inactif et boutons test visibles
 */
```

## PouchDB Operations

### Chargement initial

```javascript
async loadSmtpProfiles() {
  this.loading = true;
  
  try {
    // Récupérer tous les profils SMTP depuis PouchDB
    const result = await db.allDocs({
      startkey: 'smtp-profile:',
      endkey: 'smtp-profile:\ufff0',
      include_docs: true
    });
    
    // Filtrer les profils actifs (suppression logique)
    this.profils = result.rows
      .map(row => row.doc)
      .filter(doc => doc.actif !== false);
    
  } catch (error) {
    console.error('Erreur chargement profils SMTP:', error);
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
  filter: (doc) => doc.type === 'smtp-profile'
}).on('change', (change) => {
  // Mettre à jour la liste des profils
  const index = this.profils.findIndex(p => p._id === change.doc._id);
  
  if (change.deleted || change.doc.actif === false) {
    this.profils = this.profils.filter(p => p._id !== change.doc._id);
  } else if (index >= 0) {
    this.profils[index] = change.doc;
  } else {
    this.profils.push(change.doc);
  }
}).on('error', (err) => {
  console.error('Erreur sync profils SMTP:', err);
});
```

## Mockups de référence

- `specs/mockups/settings-smtp.html`

---

## Migration depuis l'ancienne API

| Aspect | Avant (API) | Après (PouchDB) |
|--------|-------------|-----------------|
| Profils | `GET /api/smtp-profiles` | `db.allDocs({ startkey: 'smtp-profile:' })` |
| Filtrage | Backend | Client-side (`filter(doc => doc.actif !== false)`) |
| Mises à jour temps réel | Polling | `db.changes({ filter: ... })` |
| Latence | ~200-500ms | ~10-50ms (local) |
| Offline | ❌ Impossible | ✅ Fonctionne offline |
