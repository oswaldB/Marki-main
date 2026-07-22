---
id: portail-mission-initial-load
type: frontend
folder: specs/workflows/frontend/portail-mission/
description: Charger le dashboard d'une facture/impayé pour le portail depuis PouchDB
depends_on: []
screen: portail-mission
global: false
mockup_entry: specs/mockups/portail-mission.html
---

# portail-mission-initial-load : Chargement initial Portail Mission (PouchDB)

## Description

Charger les informations d'une facture/impayé spécifique pour le portail client, avec ses détails et options de paiement. Les données sont chargées depuis **PouchDB local** après vérification du token.

**Similaire à** `portail-client/initial-load.md` mais pour une **seule facture** au lieu de toutes les factures du client.

## Étapes

```javascript
/**
 * @action Extraire les paramètres depuis l'URL : impayeId, sig (signature), expires
 * @checkpoint token-extracted, impayeId, sig et expires récupérés de `/mission/{id}?sig=xxx&expires=xxx`
 */

/**
 * @action Afficher le spinner de chargement
 * @checkpoint loading-shown, overlay sur la page
 */

/**
 * @action Vérifier le token signé via GET /api/portail/verify?impayeId=:id&sig=:sig&expires=:expires
 * @checkpoint token-validated, signature HMAC vérifiée et impayé identifié
 * 
 * **Backend** : Vérifie la signature avec `verifyContactToken()` (voir workflow backend `generate-contact-token`)
 * - Vérifie que `expires` n'est pas dépassé (3 min par défaut)
 * - Recalcule la signature HMAC-SHA256 et compare avec `sig`
 * 
 * **Note** : Cet appel API est conservé pour la sécurité (vérification signature)
 */

/**
 * @action Afficher l'écran "Lien temporaire expiré" si token invalide
 * @checkpoint error-displayed, message expliquant d'utiliser le lien email pour en générer un nouveau
 * 
 * **UI** : Réutilise le mockup `portail-client-dead-token.html` ou version adaptée
 * Message : "Lien temporaire expiré. Merci d'utiliser celui reçu par email pour en générer un nouveau."
 */

/**
 * @action Initialiser PouchDB et récupérer l'impayé
 * @checkpoint pouchdb-initialized, impayé chargé depuis PouchDB local
 * 
 * **Query PouchDB** :
 * const impayeDoc = await db.get('facture:' + impayeId);
 * 
 * Si non trouvé localement, attendre la sync avec CouchDB
 */

/**
 * @action Récupérer les informations du contact depuis PouchDB
 * @checkpoint contact-fetched, informations du client depuis PouchDB
 * 
 * **Query PouchDB** :
 * const contactDoc = await dbContacts.get('contact:' + impayeDoc.contact_id);
 */

/**
 * @action Configurer le listener pour les changements temps réel sur l'impayé
 * @checkpoint changes-listener-active, mises à jour automatiques
 * 
 * Code:
 * db.changes({ 
 *   since: 'now', 
 *   live: true, 
 *   doc_ids: ['facture:' + impayeId],
 *   include_docs: true 
 * }).on('change', (change) => {
 *   this.impaye = change.doc;
 * });
 */

/**
 * @action Stocker les données dans le store page
 * @checkpoint data-stored, impayé et contact disponibles
 */

/**
 * @action Afficher le dashboard de la facture avec option de paiement
 * @checkpoint content-rendered, interface portail affichée
 */
```

## PouchDB Operations

### Chargement de l'impayé

```javascript
async loadImpaye(impayeId) {
  this.loading = true;
  
  try {
    // 1. Récupérer l'impayé depuis PouchDB
    const impayeDoc = await db.get('facture:' + impayeId);
    this.impaye = impayeDoc;
    
    // 2. Récupérer le contact associé
    if (impayeDoc.contact_id) {
      const contactDoc = await dbContacts.get('contact:' + impayeDoc.contact_id);
      this.contact = contactDoc;
    }
    
  } catch (error) {
    if (error.status === 404) {
      // Document non trouvé localement, attendre la sync
      this.error = 'Document non disponible. Veuillez réessayer dans quelques instants.';
    } else {
      console.error('Erreur chargement impayé:', error);
      this.error = error.message;
    }
  } finally {
    this.loading = false;
  }
}
```

### Live Sync (temps réel sur l'impayé spécifique)

```javascript
// Écouter les changements sur l'impayé spécifique
db.changes({
  since: 'now',
  live: true,
  doc_ids: ['facture:' + this.impayeId], // Surveiller uniquement ce document
  include_docs: true
}).on('change', (change) => {
  // Mettre à jour l'impayé si modifié
  this.impaye = change.doc;
  
  // Mettre à jour l'affichage
  this.calculateTotals();
}).on('error', (err) => {
  console.error('Erreur sync impayé:', err);
});
```

## Mockups de référence

- `specs/mockups/portail-mission.html` - Écran de la facture/mission
- `specs/mockups/portail-client-dead-token.html` - Écran lien expiré (réutilisable)

## API Calls

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/portail/verify?impayeId=:id&sig=:sig&expires=:expires` | **Conservé** - Vérification sécurisée du token signé |

---

## Migration depuis l'ancienne API

| Aspect | Avant (API) | Après (PouchDB) |
|--------|-------------|-----------------|
| Vérification token | `/api/portail/verify` | **Conservé** - Sécurité requise |
| Chargement impayé | `GET /api/impayes/{id}` | `db.get('facture:' + id)` |
| Chargement contact | `GET /api/contacts/{id}` | `dbContacts.get('contact:' + id)` |
| Mises à jour temps réel | Polling API | `db.changes({ doc_ids: [...] })` |
| Latence | ~300-800ms | ~10-50ms (local) |
| Offline | ❌ Impossible | ✅ Consultation possible si données syncées |

## Notes

- **Token de vérification** : L'appel à `/api/portail/verify` est **conservé** car il implique une vérification de signature HMAC côté serveur (sécurité)
- **Données impayé/contact** : Une fois le token validé, les données sont chargées depuis PouchDB local
- **Sync ciblée** : Seul le document de l'impayé est surveillé en temps réel (pas toute la base)
- **Portail public** : Le portail mission est accessible via lien signé sans authentification classique
- **404 handling** : Si le document n'existe pas localement (première visite), la sync avec CouchDB se fait automatiquement
