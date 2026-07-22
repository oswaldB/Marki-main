---
id: sequences-suivi-detail-initial-load
type: frontend
folder: specs/workflows/frontend/sequences-suivi-detail/
description: Charger le détail d'une séquence de suivi depuis PouchDB avec ses étapes
depends_on: [auth-check]
screen: sequences-suivi-detail
global: false
mockup_entry: specs/mockups/sequences-suivi-detail.html
---

# sequences-suivi-detail-initial-load : Chargement initial Détail Séquence Suivi (PouchDB)

## Description

Charger les détails complets d'une séquence de suivi depuis PouchDB : étapes éducatives, modèles et règles d'envoi.

## Étapes

```javascript
/**
 * @action Extraire l'ID de la séquence depuis l'URL (/sequences/suivi/:id)
 * @checkpoint sequence-id-extracted, paramètre URL récupéré
 */

/**
 * @action Initialiser PouchDB et configurer le sync
 * @checkpoint pouchdb-initialized, base séquences prête
 * 
 * Code:
 * this.db = new PouchDB('marki-sequences');
 * this.db.sync(remoteUrl, { live: true, retry: true });
 */

/**
 * @action Afficher le spinner de chargement
 * @checkpoint loading-shown, overlay sur la page
 */

/**
 * @action Récupérer la séquence depuis PouchDB
 * @checkpoint sequence-fetched, données de la séquence reçues
 * 
 * **Query PouchDB** :
 * const sequence = await db.get('sequence:' + sequenceId);
 */

/**
 * @action Configurer le listener pour les changements temps réel
 * @checkpoint changes-listener-active, mises à jour automatiques
 * 
 * Code:
 * db.changes({ 
 *   since: 'now', 
 *   live: true, 
 *   doc_ids: ['sequence:' + sequenceId],
 *   include_docs: true 
 * }).on('change', (change) => { this.updateSequence(change.doc); });
 */

/**
 * @action Extraire les étapes depuis la clé `emails`
 * @checkpoint etapes-extracted, étapes de suivi disponibles
 */

/**
 * @action Extraire les modèles d'email depuis la clé `modeles_email`
 * @checkpoint modeles-extracted, modèles éducatifs disponibles
 */

/**
 * @action Stocker les données dans le store page
 * @checkpoint data-stored, séquence de suivi complète
 */

/**
 * @action Afficher le contenu avec l'onglet 'Étapes' actif
 * @checkpoint content-rendered, interface de suivi éducatif affichée
 */
```

## PouchDB Operations

### Chargement initial

```javascript
async loadSequenceSuiviDetail(sequenceId) {
  this.loading = true;
  
  try {
    // Récupérer la séquence depuis PouchDB
    const sequence = await db.get('sequence:' + sequenceId);
    
    this.sequence = sequence;
    this.etapes = sequence.emails || [];
    this.modeles = sequence.modeles_email || [];
    this.reglesAttribution = sequence.regles_attribution || {};
    
  } catch (error) {
    console.error('Erreur chargement séquence suivi:', error);
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
  doc_ids: ['sequence:' + this.sequenceId],
  include_docs: true
}).on('change', (change) => {
  // Mettre à jour la séquence si modifiée
  this.sequence = change.doc;
  this.etapes = change.doc.emails || [];
  this.modeles = change.doc.modeles_email || [];
}).on('error', (err) => {
  console.error('Erreur sync séquence suivi:', err);
});
```

## Mockups de référence

- `specs/mockups/sequences-suivi-detail.html`

---

## Migration depuis l'ancienne API

| Aspect | Avant (API) | Après (PouchDB) |
|--------|-------------|-----------------|
| Séquence | `GET /api/sequences/:id` | `db.get('sequence:' + id)` |
| Étapes | Clé `etapes` dans réponse | Clé `emails` dans doc PouchDB |
| Mises à jour temps réel | Polling | `db.changes({ doc_ids: [...] })` |
| Latence | ~200-500ms | ~10-50ms (local) |
| Offline | ❌ Impossible | ✅ Fonctionne offline |
