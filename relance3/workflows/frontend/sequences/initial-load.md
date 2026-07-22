---
id: sequences-initial-load
type: frontend
folder: specs/workflows/frontend/sequences/
description: Charger la liste des séquences de relance et de suivi depuis PouchDB
depends_on: [auth-check]
screen: sequences
global: false
mockup_entry: specs/mockups/sequences.html
---

# sequences-initial-load : Chargement initial Liste Séquences (PouchDB)

## Description

Charger les séquences de relance et de suivi depuis PouchDB avec leurs métadonnées (nombre d'étapes, factures liées).

## Étapes

```javascript
/**
 * @action Initialiser PouchDB et configurer le sync
 * @checkpoint pouchdb-initialized, base séquences prête
 * 
 * Code:
 * this.db = new PouchDB('marki-sequences');
 * this.db.sync(remoteUrl, { live: true, retry: true });
 */

/**
 * @action Initialiser les filtres par défaut (type='all')
 * @checkpoint state-initialized, filtres prêts
 */

/**
 * @action Afficher le skeleton loader
 * @checkpoint skeleton-shown, liste en chargement
 */

/**
 * @action Récupérer les séquences depuis PouchDB
 * @checkpoint sequences-fetched, séquences reçues
 * 
 * **Query PouchDB** :
 * const result = await db.allDocs({
 *   startkey: 'sequence:',
 *   endkey: 'sequence:\ufff0',
 *   include_docs: true
 * });
 * const sequences = result.rows.map(r => r.doc);
 */

/**
 * @action Configurer le listener pour les changements temps réel
 * @checkpoint changes-listener-active, mises à jour automatiques
 * 
 * Code:
 * db.changes({ since: 'now', live: true, include_docs: true })
 *   .on('change', (change) => { this.updateSequence(change.doc); });
 */

/**
 * @action Calculer les statistiques des séquences côté client
 * @checkpoint stats-calculated, compteurs de factures liées calculés
 * 
 * **Approche full frontend** : Calcul à partir des données locales.
 * sequences.map(seq => ({
 *   ...seq,
 *   nb_etapes: seq.emails?.length || 0
 * }))
 */

/**
 * @action Stocker les données dans Alpine.store('sequences')
 * @checkpoint data-stored, séquences enrichies disponibles
 */

/**
 * @action Rendre la liste des séquences avec cartes visuelles
 * @checkpoint list-rendered, cartes séquences avec stats affichées
 */

/**
 * @action Activer le bouton de création de nouvelle séquence
 * @checkpoint create-button-enabled, bouton "Nouvelle séquence" fonctionnel
 */
```

## PouchDB Operations

### Chargement initial

```javascript
async loadSequences() {
  this.loading = true;
  
  try {
    const result = await db.allDocs({
      startkey: 'sequence:',
      endkey: 'sequence:\ufff0',
      include_docs: true
    });
    
    this.sequences = result.rows
      .map(r => r.doc)
      .map(seq => ({
        ...seq,
        nb_etapes: seq.emails?.length || 0
      }))
      .sort((a, b) => a.nom.localeCompare(b.nom));
    
  } catch (error) {
    console.error('Erreur chargement séquences:', error);
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
  if (change.doc.type === 'sequence') {
    const index = this.sequences.findIndex(s => s._id === change.doc._id);
    if (index >= 0) {
      this.sequences[index] = {
        ...change.doc,
        nb_etapes: change.doc.emails?.length || 0
      };
    } else {
      this.sequences.push({
        ...change.doc,
        nb_etapes: change.doc.emails?.length || 0
      });
    }
  }
});
```

## Mockups de référence

- `specs/mockups/sequences.html`

---

## Migration depuis l'ancienne API

| Aspect | Avant (API) | Après (PouchDB) |
|--------|-------------|-----------------|
| Séquences | `GET /api/sequences` | `db.allDocs()` |
| Calcul stats | Backend | Côté client |
| Mises à jour temps réel | Polling | `db.changes()` |
| Latence | ~300-800ms | ~50-100ms (local) |
| Offline | ❌ Impossible | ✅ Fonctionne offline |
