---
id: relances-validation-initial-load
type: frontend
folder: specs/workflows/frontend/relances-validation/
description: Charger les relances en attente de validation depuis PouchDB avec preview
depends_on: [auth-check]
screen: relances-validation
global: false
mockup_entry: specs/mockups/relances-validation.html
---

# relances-validation-initial-load : Chargement initial Validation Relances (PouchDB)

## Description

Charger les relances en statut 'à valider' depuis PouchDB permettant leur revue et approbation avant envoi.

## Étapes

```javascript
/**
 * @action Initialiser PouchDB et configurer le sync
 * @checkpoint pouchdb-initialized, bases locales prêtes
 * 
 * Code:
 * this.db = new PouchDB('marki-relances');
 * this.db.sync(remoteUrl, { live: true, retry: true });
 */

/**
 * @action Initialiser l'état de sélection (selectedRelances vide)
 * @checkpoint state-initialized, mode sélection prêt
 */

/**
 * @action Afficher le skeleton loader
 * @checkpoint skeleton-shown, tableau en chargement
 */

/**
 * @action Récupérer les relances à valider depuis PouchDB
 * @checkpoint relances-fetched, relances en attente de validation reçues
 * 
 * **Query PouchDB** :
 * const result = await db.allDocs({
 *   startkey: 'relance:',
 *   endkey: 'relance:\ufff0',
 *   include_docs: true
 * });
 * const relances = result.rows
 *   .map(r => r.doc)
 *   .filter(r => r.valide === false && r.statut === 'pret pour envoi');
 */

/**
 * @action Configurer le listener pour les changements temps réel
 * @checkpoint changes-listener-active, mises à jour automatiques
 * 
 * Code:
 * db.changes({ since: 'now', live: true, include_docs: true })
 *   .on('change', (change) => { this.updateRelanceValidation(change.doc); });
 */

/**
 * @action Récupérer les templates email depuis PouchDB
 * @checkpoint templates-fetched, templates disponibles pour aperçu
 * 
 * **Query PouchDB** :
 * const templates = await dbTemplates.allDocs({
 *   startkey: 'template:',
 *   endkey: 'template:\ufff0',
 *   include_docs: true
 * });
 */

/**
 * @action Stocker les données dans le store
 * @checkpoint data-stored, relancesAValider et templates prêts
 */

/**
 * @action Rendre le tableau avec cases à cocher de sélection
 * @checkpoint table-rendered, colonnes sélection + aperçu disponibles
 */

/**
 * @action Activer les boutons d'action batch (valider/rejeter sélection)
 * @checkpoint batch-actions-enabled, boutons fonctionnels
 */
```

## PouchDB Operations

### Chargement initial

```javascript
async loadRelancesAValider() {
  this.loading = true;
  
  try {
    // 1. Relances à valider
    const result = await db.allDocs({
      startkey: 'relance:',
      endkey: 'relance:\ufff0',
      include_docs: true
    });
    
    this.relancesAValider = result.rows
      .map(r => r.doc)
      .filter(r => r.valide === false && r.statut === 'pret pour envoi');
    
    // 2. Templates
    const templatesResult = await dbTemplates.allDocs({
      startkey: 'template:',
      endkey: 'template:\ufff0',
      include_docs: true
    });
    
    this.templates = templatesResult.rows.map(r => r.doc);
    
  } catch (error) {
    console.error('Erreur chargement:', error);
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
  include_docs: true
}).on('change', (change) => {
  if (change.doc.type === 'relance') {
    const index = this.relancesAValider.findIndex(r => r._id === change.doc._id);
    
    if (change.doc.valide === false && change.doc.statut === 'pret pour envoi') {
      if (index >= 0) {
        this.relancesAValider[index] = change.doc;
      } else {
        this.relancesAValider.push(change.doc);
      }
    } else {
      if (index >= 0) {
        this.relancesAValider.splice(index, 1);
      }
    }
  }
});
```

## Mockups de référence

- `specs/mockups/relances-validation.html`

---

## Migration depuis l'ancienne API

| Aspect | Avant (API) | Après (PouchDB) |
|--------|-------------|-----------------|
| Relances à valider | `GET /api/relances?valide=false&statut=pret pour envoi` | `db.allDocs()` + filtrage côté client |
| Templates | `GET /api/templates` | `dbTemplates.allDocs()` |
| Mises à jour temps réel | Polling | `db.changes()` |
| Latence | ~300-800ms | ~50-100ms (local) |
| Offline | ❌ Impossible | ✅ Fonctionne offline |
