---
id: impayes-detail-initial-load
type: frontend
folder: specs/workflows/frontend/impayes-detail/
description: Charger le détail complet d'un impayé depuis PouchDB avec historique des relances
depends_on: [auth-check]
screen: impayes-detail
global: false
mockup_entry: specs/mockups/impayes-detail.html
---

# impayes-detail-initial-load : Chargement initial Détail Impayé (PouchDB)

## Description

Charger les informations complètes d'un impayé depuis **PouchDB local**, son historique de relances et les contacts associés.

Les données sont synchronisées automatiquement avec CouchDB distant.

## Étapes

```javascript
/**
 * @action Extraire l'ID de l'impayé depuis l'URL (/impayes-detail?id=:id)
 * @checkpoint impaye-id-extracted, paramètre d'URL récupéré
 */

/**
 * @action Initialiser PouchDB et configurer le sync
 * @checkpoint pouchdb-initialized, bases locales prêtes
 * 
 * Code:
 * this.db = new PouchDB('marki-factures');
 * this.dbRelances = new PouchDB('marki-relances');
 * this.dbContacts = new PouchDB('marki-contacts');
 */

/**
 * @action Afficher le spinner de chargement
 * @checkpoint loading-shown, overlay sur toute la page
 */

/**
 * @action Récupérer l'impayé via PouchDB
 * @checkpoint impaye-fetched, données complètes reçues
 * 
 * Query:
 * const doc = await db.get('facture:' + impayeId);
 */

/**
 * @action Configurer le listener pour les changements temps réel
 * @checkpoint changes-listener-active, mises à jour automatiques
 * 
 * Code:
 * db.changes({ since: 'now', live: true, include_docs: true })
 *   .on('change', (change) => { this.handleImpayeChange(change.doc) });
 */

/**
 * @action Récupérer les relances liées depuis PouchDB
 * @checkpoint relances-fetched, relances liées à l'impayé reçues
 * 
 * Query:
 * const result = await dbRelances.find({
 *   selector: {
 *     type: { $eq: 'relance' },
 *     facture_id: { $eq: impayeId }
 *   }
 * });
 */

/**
 * @action Récupérer le contact/payeur depuis PouchDB si nécessaire
 * @checkpoint payer-fetched, informations du payeur complétées
 * 
 * Query (optionnel - si besoin de données complémentaires):
 * const contactDoc = await dbContacts.get('contact:' + contactId);
 */

/**
 * @action Stocker toutes les données dans le store page
 * @checkpoint data-stored, store.impaye et collections associées remplies
 */

/**
 * @action Afficher le contenu complet avec l'onglet 'Détails' actif
 * @checkpoint content-rendered, page complète sans spinner
 */
```

## PouchDB Operations

### Chargement initial

```javascript
async loadImpayeDetail() {
  this.loading = true;
  
  try {
    // 1. Extraire l'ID depuis l'URL
    const urlParams = new URLSearchParams(window.location.search);
    const impayeId = urlParams.get('id');
    
    if (!impayeId) {
      throw new Error('ID impayé manquant dans l\'URL');
    }
    
    this.impayeId = impayeId;
    
    // 2. Récupérer l'impayé depuis PouchDB
    const impayeDoc = await db.get('facture:' + impayeId);
    this.impaye = impayeDoc;
    
    // 3. Récupérer les relances liées
    const relancesResult = await dbRelances.find({
      selector: {
        type: { $eq: 'relance' },
        facture_id: { $eq: impayeId }
      },
      sort: [{ created_at: 'desc' }]
    });
    this.relances = relancesResult.docs;
    
    // 4. Optionnel: récupérer le contact si besoin de données complémentaires
    if (impayeDoc.contact_id) {
      try {
        const contactDoc = await dbContacts.get(impayeDoc.contact_id);
        this.contact = contactDoc;
      } catch (err) {
        // Contact peut ne pas être disponible localement
        console.warn('Contact non trouvé:', err);
      }
    }
    
    // 5. Charger les séquences disponibles
    const sequencesResult = await dbSequences.allDocs({
      startkey: 'sequence:',
      endkey: 'sequence:\ufff0',
      include_docs: true
    });
    this.sequences = sequencesResult.rows
      .map(row => row.doc)
      .filter(seq => seq.actif === true);
    
  } catch (error) {
    console.error('Erreur chargement détail:', error);
    this.error = error.message;
  } finally {
    this.loading = false;
  }
}
```

### Live Sync (temps réel)

```javascript
// Écouter les changements sur l'impayé
setupChangesListener() {
  // Listener sur la facture
  db.changes({
    since: 'now',
    live: true,
    include_docs: true,
    doc_ids: ['facture:' + this.impayeId]
  }).on('change', (change) => {
    if (change.doc) {
      this.impaye = change.doc;
    }
  });
  
  // Listener sur les relances
  dbRelances.changes({
    since: 'now',
    live: true,
    include_docs: true
  }).on('change', (change) => {
    if (change.doc.type === 'relance' && change.doc.facture_id === this.impayeId) {
      this.loadRelances(); // Recharger les relances
    }
  });
}
```

## Structure des documents PouchDB

### Facture (impayé)

```javascript
{
  "_id": "facture:550e8400-...",
  "_rev": "1-abc123...",
  "type": "facture",
  "id": "F123",
  "nfacture": "F-2024-001",
  "montant_total": 2500.00,
  "reste_a_payer": 1500.00,
  "statut": "impaye",
  "date_echeance": "2024-01-15",
  "contact_id": "contact:...",
  "payeur_nom": "ACME Corporation",  // Dénormalisé
  "payeur_email": "contact@acme.fr",
  "sequence_id": "seq-001",
  "email_index": 0,
  "is_blacklisted": false,
  "is_suspended": false,
  "notes": []
}
```

### Relance

```javascript
{
  "_id": "relance:550e8400-...",
  "_rev": "1-abc123...",
  "type": "relance",
  "id": "R456",
  "facture_id": "F123",
  "contact_id": "contact:...",
  "sequence_id": "seq-001",
  "niveau": 1,
  "statut": "pending",
  "date_programmation": "2024-01-20T09:00:00Z",
  "template_id": "tpl-001"
}
```

## Notes

- L'impayé contient déjà les champs dénormalisés du payeur (`payeur_nom`, `payeur_email`, etc.) pour affichage rapide
- L'appel au contact n'est nécessaire que si on veut des informations complémentaires non dénormalisées
- Les relances sont récupérées via `find()` avec le `facture_id`
- Le sync temps réel met à jour automatiquement l'affichage si des modifications arrivent de CouchDB

## Mockups de référence

- `specs/mockups/impayes-detail.html`

---

## Migration depuis l'ancienne API

| Aspect | Avant (API) | Après (PouchDB) |
|--------|-------------|-----------------|
| Source impayé | `GET /api/impayes?facture_soldee=0&statut=impaye | `db.get('facture:' + id)` |
| Source relances | `GET /api/relancesimpaye_ids=:id` | `dbRelances.find({ facture_id })` |
| Source contact | `GET /api/contacts?statut=actif&limit=50 | `dbContacts.get('contact:' + id)` |
| Temps réel | Polling | `db.changes()` |
| Latence | ~300-800ms | ~10-50ms (local) |
| Offline | ❌ Impossible | ✅ Fonctionne offline |
