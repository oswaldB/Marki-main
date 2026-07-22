---
id: relances-liste-sequences
type: frontend
folder: specs/workflows/frontend/relances/
description: Afficher la liste des séquences de relance disponibles depuis PouchDB
depends_on: [auth-check]
screen: sequences
global: false
mockup_entry: specs/mockups/sequences.html
---

# relances-liste-sequences : Liste des séquences de relance (PouchDB)

## Description

Afficher la liste complète des séquences de relance configurées, avec leurs étapes, délais et templates associés. Les données sont chargées depuis PouchDB local.

## Étapes

```javascript
/**
 * @action Initialiser PouchDB et configurer le sync
 * @checkpoint pouchdb-initialized, base séquences prête
 * 
 * Code:
 * this.dbSequences = new PouchDB('marki-sequences');
 * this.dbSequences.sync(remoteUrl, { live: true, retry: true });
 */

/**
 * @action Initialiser l'état avec filtres par défaut (actives uniquement)
 * @checkpoint state-initialized, filtre actif=true par défaut
 */

/**
 * @action Afficher le skeleton loader
 * @checkpoint skeleton-shown, lignes de chargement visibles
 */

/**
 * @action Récupérer les séquences depuis PouchDB
 * @checkpoint sequences-fetched, liste complète reçue
 * 
 * **Query PouchDB** :
 * const result = await dbSequences.allDocs({
 *   startkey: 'sequence:',
 *   endkey: 'sequence:\ufff0',
 *   include_docs: true
 * });
 * const sequences = result.rows.map(r => r.doc);
 */

/**
 * @action Récupérer les relances pour les stats depuis PouchDB
 * @checkpoint relances-fetched, données pour calcul des stats
 * 
 * **Query PouchDB** :
 * const result = await dbRelances.allDocs({
 *   startkey: 'relance:',
 *   endkey: 'relance:\ufff0',
 *   include_docs: true
 * });
 * const relances = result.rows.map(r => r.doc);
 */

/**
 * @action Configurer le listener pour les changements temps réel
 * @checkpoint changes-listener-active, mises à jour automatiques
 * 
 * Code:
 * dbSequences.changes({ since: 'now', live: true, include_docs: true })
 *   .on('change', (change) => { this.updateSequence(change.doc); });
 */

/**
 * @action Calculer les statistiques par séquence
 * @checkpoint stats-calculated, nombre de relances utilisant chaque séquence
 * 
 * **Approche** : Compter pour chaque séquence combien de relances l'utilisent
 * depuis les données PouchDB déjà chargées
 */

/**
 * @action Trier par ordre d'affichage (champ ordre) ou par nom
 * @checkpoint sorted, ordre appliqué (défaut: ordre croissant)
 */

/**
 * @action Afficher le tableau des séquences
 * @checkpoint table-rendered, lignes avec noms et statuts visibles
 */

/**
 * @action Afficher le nombre d'étapes pour chaque séquence
 * @checkpoint etapes-count-rendered, badge avec nb étapes visible
 */

/**
 * @action Afficher le statut actif/inactif avec toggle
 * @checkpoint status-rendered, switch on/off visible et fonctionnel
 */

/**
 * @action Activer le bouton "Voir détails" par ligne
 * @checkpoint view-enabled, navigation vers fiche séquence possible
 */

/**
 * @action Activer le bouton "Réorganiser" pour changer l'ordre
 * @checkpoint reorder-enabled, drag & drop ou boutons d'ordre actifs
 */

/**
 * @action Activer le bouton "Dupliquer" pour créer une copie
 * @checkpoint duplicate-enabled, action de duplication disponible
 */
```

## PouchDB Operations

### Chargement des séquences

```javascript
async loadSequences() {
  this.loading = true;
  
  try {
    // 1. Séquences
    const sequencesResult = await dbSequences.allDocs({
      startkey: 'sequence:',
      endkey: 'sequence:\ufff0',
      include_docs: true
    });
    
    this.sequences = sequencesResult.rows.map(r => r.doc);
    
    // 2. Relances pour les stats
    const relancesResult = await dbRelances.allDocs({
      startkey: 'relance:',
      endkey: 'relance:\ufff0',
      include_docs: true
    });
    
    this.relances = relancesResult.rows.map(r => r.doc);
    
    // 3. Calculer stats
    this.calculateStats();
    
    // 4. Trier
    this.sortSequences();
    
  } catch (error) {
    console.error('Erreur chargement séquences:', error);
    this.error = error.message;
  } finally {
    this.loading = false;
  }
}

calculateStats() {
  // Compter les relances par séquence
  const counts = new Map();
  for (const relance of this.relances) {
    if (relance.sequence_id) {
      counts.set(relance.sequence_id, (counts.get(relance.sequence_id) || 0) + 1);
    }
  }
  
  // Ajouter les stats à chaque séquence
  this.sequences = this.sequences.map(seq => ({
    ...seq,
    nbRelances: counts.get(seq._id) || 0
  }));
}

sortSequences() {
  this.sequences.sort((a, b) => {
    // Par ordre si défini, sinon par nom
    if (a.ordre !== undefined && b.ordre !== undefined) {
      return a.ordre - b.ordre;
    }
    return (a.nom || '').localeCompare(b.nom || '');
  });
}
```

### Live Sync (temps réel)

```javascript
// Écouter les changements sur les séquences
dbSequences.changes({
  since: 'now',
  live: true,
  include_docs: true
}).on('change', (change) => {
  if (change.doc.type === 'sequence') {
    const index = this.sequences.findIndex(s => s._id === change.doc._id);
    if (index >= 0) {
      this.sequences[index] = change.doc;
    } else {
      this.sequences.push(change.doc);
    }
    this.calculateStats();
  }
}).on('error', (err) => {
  console.error('Erreur sync séquences:', err);
});
```

## Colonnes affichées

| Colonne | Source | Description |
|---------|--------|-------------|
| Ordre | sequence.ordre | Position dans la liste |
| Nom | sequence.nom | Nom de la séquence |
| Description | sequence.description | Description courte |
| Nb étapes | sequence.etapes.length | Nombre d'étapes |
| Délais | etapes[].delai_jours | J+15, J+30, etc. |
| Relances | nbRelances | Nb de relances utilisant cette séquence |
| Statut | sequence.actif | Actif/Inactif (toggle) |
| Actions | - | Voir, Modifier, Dupliquer, Supprimer |

## Actions disponibles

| Action | Condition | Description |
|--------|-----------|-------------|
| Voir | Toujours | Ouvrir la fiche détail |
| Modifier | Toujours | Éditer la séquence |
| Dupliquer | Toujours | Créer une copie |
| Supprimer | Aucune relance liée | Supprimer définitivement |
| Activer/Désactiver | Toujours | Toggle statut |

## Mockups de référence

- `specs/mockups/sequences.html` (liste des séquences)

---

## Migration depuis l'ancienne API

| Aspect | Avant (API) | Après (PouchDB) |
|--------|-------------|-----------------|
| Séquences | `GET /api/sequences` | `dbSequences.allDocs()` |
| Relances (stats) | `GET /api/relances?sequence_id=:id` | `dbRelances.allDocs()` + comptage côté client |
| Mises à jour temps réel | Polling | `dbSequences.changes()` |
| Calcul stats | Backend | Côté client avec `Map()` |
| Latence | ~200-500ms | ~30-50ms (local) |
| Offline | ❌ Impossible | ✅ Fonctionne offline |
