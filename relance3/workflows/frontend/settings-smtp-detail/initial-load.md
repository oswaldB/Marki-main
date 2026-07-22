---
id: settings-smtp-detail-initial-load
type: frontend
folder: specs/workflows/frontend/settings-smtp-detail/
description: Charger le détail d'un profil SMTP depuis PouchDB avec historique et stats
depends_on: [auth-check]
screen: settings-smtp-detail
global: false
mockup_entry: specs/mockups/settings-smtp-detail.html
---

# settings-smtp-detail-initial-load : Chargement initial Détail Profil SMTP (PouchDB)

## Description

Charger les informations complètes d'un profil SMTP depuis PouchDB, son historique d'envoi et ses statistiques.

## Étapes

```javascript
/**
 * @action Extraire l'ID du profil depuis l'URL (/settings/smtp/:id)
 * @checkpoint profil-id-extracted, paramètre URL récupéré
 */

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
 * @checkpoint loading-shown, overlay sur la page
 */

/**
 * @action Récupérer le profil depuis PouchDB
 * @checkpoint profil-fetched, configuration SMTP reçue
 * 
 * **Query PouchDB** :
 * const profil = await db.get('smtp-profile:' + profilId);
 */

/**
 * @action Configurer le listener pour les changements temps réel
 * @checkpoint changes-listener-active, mises à jour automatiques
 * 
 * Code:
 * db.changes({ 
 *   since: 'now', 
 *   live: true, 
 *   doc_ids: ['smtp-profile:' + this.profilId],
 *   include_docs: true 
 * }).on('change', (change) => { this.updateProfil(change.doc); });
 */

/**
 * @action Stocker les données dans le store page
 * @checkpoint data-stored, profil disponible pour édition
 */

/**
 * @action Afficher le contenu avec l'onglet 'Configuration' actif
 * @checkpoint content-rendered, formulaire de configuration affiché
 */
```

## PouchDB Operations

### Chargement initial

```javascript
async loadProfilDetail(profilId) {
  this.loading = true;
  
  try {
    // Récupérer le profil depuis PouchDB
    const profil = await db.get('smtp-profile:' + profilId);
    
    this.profil = profil;
    
  } catch (error) {
    console.error('Erreur chargement profil SMTP:', error);
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
  doc_ids: ['smtp-profile:' + this.profilId],
  include_docs: true
}).on('change', (change) => {
  // Mettre à jour le profil si modifié
  this.profil = change.doc;
}).on('error', (err) => {
  console.error('Erreur sync profil SMTP:', err);
});
```

## Mockups de référence

- `specs/mockups/settings-smtp-detail.html`

---

## Migration depuis l'ancienne API

| Aspect | Avant (API) | Après (PouchDB) |
|--------|-------------|-----------------|
| Profil | `GET /api/smtp-profiles/:id` | `db.get('smtp-profile:' + id)` |
| Mises à jour temps réel | Polling | `db.changes({ doc_ids: [...] })` |
| Latence | ~200-500ms | ~10-50ms (local) |
| Offline | ❌ Impossible | ✅ Fonctionne offline |
