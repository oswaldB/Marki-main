---
id: relances-details
type: frontend
folder: specs/workflows/frontend/relances/
description: Afficher les détails complets d'une relance depuis PouchDB
depends_on: [relances-initial-load]
screen: relances
global: false
mockup_entry: specs/mockups/relances.html
---

# relances-details : Détails d'une relance (PouchDB)

## Description

Afficher la fiche détaillée d'une relance avec ses informations complètes depuis PouchDB, historique et actions disponibles.

## Étapes

```javascript
/**
 * @action Cliquer sur le bouton "Voir détails" d'une relance
 * @checkpoint details-clicked, relance ID identifié
 */

/**
 * @action Ouvrir le modal de détails
 * @checkpoint modal-opened, overlay affiché avec skeleton loader
 */

/**
 * @action Récupérer la relance depuis PouchDB
 * @checkpoint relance-fetched, données complètes reçues
 * 
 * **Query PouchDB** :
 * const relanceDoc = await db.get('relance:' + relanceId);
 */

/**
 * @action Récupérer les infos du payeur depuis PouchDB
 * @checkpoint payeur-fetched, nom et contact reçus
 * 
 * **Query PouchDB** :
 * const payeurDoc = await dbContacts.get('contact:' + relanceDoc.contact_id);
 */

/**
 * @action Récupérer la séquence associée depuis PouchDB
 * @checkpoint sequence-fetched, étape et template identifiés
 * 
 * **Query PouchDB** :
 * const sequenceDoc = await dbSequences.get('sequence:' + relanceDoc.sequence_id);
 */

/**
 * @action Récupérer les impayés liés depuis PouchDB
 * @checkpoint impayes-fetched, factures liées récupérées
 * 
 * **Query PouchDB** :
 * const result = await db.allDocs({
 *   startkey: 'facture:',
 *   endkey: 'facture:\ufff0',
 *   include_docs: true
 * });
 * const impayes = result.rows
 *   .map(r => r.doc)
 *   .filter(f => relanceDoc.impaye_ids.includes(f._id));
 */

/**
 * @action Afficher les informations de la relance dans le modal
 * @checkpoint relance-rendered, statut, montant, dates visibles
 */

/**
 * @action Afficher la liste des impayés liés
 * @checkpoint impayes-rendered, tableau des factures affiché
 */

/**
 * @action Afficher l'historique des actions sur cette relance
 * @checkpoint historique-rendered, timeline des événements visible
 * 
 * **Query PouchDB** :
 * const events = await dbEvents.find({
 *   selector: {
 *     type: 'event',
 *     'metadata.relance_id': relanceId
 *   }
 * });
 */

/**
 * @action Activer les boutons d'action selon le statut
 * @checkpoint actions-enabled, boutons modifier/envoyer/annuler actifs selon statut
 */
```

## PouchDB Operations

### Chargement des détails

```javascript
async loadRelanceDetails(relanceId) {
  this.loading = true;
  
  try {
    // 1. Récupérer la relance
    const relanceDoc = await db.get('relance:' + relanceId);
    this.selectedRelance = relanceDoc;
    
    // 2. Récupérer le payeur
    if (relanceDoc.contact_id) {
      const payeurDoc = await dbContacts.get('contact:' + relanceDoc.contact_id);
      this.selectedPayeur = payeurDoc;
    }
    
    // 3. Récupérer la séquence
    if (relanceDoc.sequence_id) {
      const sequenceDoc = await dbSequences.get('sequence:' + relanceDoc.sequence_id);
      this.selectedSequence = sequenceDoc;
    }
    
    // 4. Récupérer les impayés liés
    if (relanceDoc.impaye_ids?.length) {
      const result = await db.allDocs({
        startkey: 'facture:',
        endkey: 'facture:\ufff0',
        include_docs: true
      });
      
      this.impayesLies = result.rows
        .map(r => r.doc)
        .filter(f => relanceDoc.impaye_ids.includes(f._id));
    }
    
    // 5. Récupérer l'historique des events
    const eventsResult = await dbEvents.find({
      selector: {
        type: 'event',
        'metadata.relance_id': relanceId
      },
      sort: [{ created_at: 'desc' }]
    });
    
    this.historique = eventsResult.docs;
    
  } catch (error) {
    console.error('Erreur chargement détails:', error);
    this.error = error.message;
  } finally {
    this.loading = false;
  }
}
```

## État des boutons selon statut

| Statut | Modifier | Envoyer | Annuler | Valider |
|--------|----------|---------|---------|---------|
| `brouillon` | ✅ | ✅ | ✅ | ❌ |
| `a_valider` | ✅ | ❌ | ✅ | ✅ |
| `programmee` | ❌ | ❌ | ✅ | ❌ |
| `envoyee` | ❌ | ❌ | ❌ | ❌ |
| `annulee` | ❌ | ❌ | ❌ | ❌ |

## Mockups de référence

- `specs/mockups/relances.html` (modal détails)

---

## Migration depuis l'ancienne API

| Aspect | Avant (API) | Après (PouchDB) |
|--------|-------------|-----------------|
| Détails relance | `GET /api/relances/:id` | `db.get('relance:' + id)` |
| Infos payeur | `GET /api/payers/:id` | `dbContacts.get('contact:' + id)` |
| Détails séquence | `GET /api/sequences/:id` | `dbSequences.get('sequence:' + id)` |
| Impayés liés | `GET /api/impayes?relance_id=:id` | `db.allDocs()` + filtrage côté client |
| Historique | `GET /api/events?relance_id=:id` | `dbEvents.find()` |
| Latence | ~300-800ms (4 appels) | ~50-100ms (local) |
| Offline | ❌ Impossible | ✅ Consultation complète offline |
