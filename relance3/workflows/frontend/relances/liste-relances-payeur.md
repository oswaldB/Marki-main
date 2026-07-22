---
id: relances-liste-par-payeur
type: frontend
folder: specs/workflows/frontend/relances/
description: Afficher la liste des relances d'un payeur spécifique depuis PouchDB
depends_on: [relances-initial-load]
screen: relances
global: false
mockup_entry: specs/mockups/relances.html
---

# relances-liste-par-payeur : Liste des relances par payeur (PouchDB)

## Description

Afficher toutes les relances associées à un payeur spécifique, avec leur statut, dates et actions possibles. Les données sont chargées depuis PouchDB local.

## Étapes

```javascript
/**
 * @action Filtrer la liste des relances par payeur_id
 * @checkpoint filter-applied, paramètre payeur_id extrait de l'URL ou sélectionné
 */

/**
 * @action Afficher le skeleton loader
 * @checkpoint skeleton-shown, état de chargement visible
 */

/**
 * @action Récupérer les relances du payeur depuis PouchDB
 * @checkpoint relances-fetched, liste filtrée reçue
 * 
 * **Query PouchDB** :
 * const result = await db.allDocs({
 *   startkey: 'relance:',
 *   endkey: 'relance:\ufff0',
 *   include_docs: true
 * });
 * const relances = result.rows
 *   .map(r => r.doc)
 *   .filter(r => r.contact_id === payeurId)
 *   .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
 */

/**
 * @action Récupérer les détails du payeur depuis PouchDB
 * @checkpoint payeur-fetched, nom et informations reçues
 * 
 * **Query PouchDB** :
 * const payeur = await dbContacts.get('contact:' + payeurId);
 */

/**
 * @action Enrichir les relances avec les données de séquence depuis PouchDB
 * @checkpoint sequences-enriched, noms des séquences ajoutés
 * 
 * **Query PouchDB** :
 * Pour chaque relance.sequence_id :
 * const sequence = await dbSequences.get('sequence:' + sequenceId);
 */

/**
 * @action Calculer les statistiques des relances du payeur
 * @checkpoint stats-calculated, indicateurs calculés côté client
 * - total_relances
 * - relances_par_statut
 * - montant_total_relance
 */

/**
 * @action Afficher l'en-tête avec nom du payeur et résumé
 * @checkpoint header-rendered, titre et stats visibles
 */

/**
 * @action Afficher le tableau des relances
 * @checkpoint table-rendered, lignes avec statuts et actions visibles
 */

/**
 * @action Colorer les lignes selon le statut
 * @checkpoint status-colors-applied, brouillon=gris, envoyee=vert, etc.
 */

/**
 * @action Activer les boutons d'action par ligne
 * @checkpoint row-actions-enabled, boutons selon statut de chaque relance
 */

/**
 * @action Afficher le résumé des impayés liés depuis PouchDB
 * @checkpoint linked-impayes-shown, montant total des impayés visible
 */
```

## PouchDB Operations

### Chargement des données

```javascript
async loadRelancesByPayeur(payeurId) {
  this.loading = true;
  
  try {
    // 1. Payeur
    const payeur = await dbContacts.get('contact:' + payeurId);
    this.selectedPayeur = payeur;
    
    // 2. Relances du payeur
    const result = await db.allDocs({
      startkey: 'relance:',
      endkey: 'relance:\ufff0',
      include_docs: true
    });
    
    this.relancesPayeur = result.rows
      .map(r => r.doc)
      .filter(r => r.contact_id === payeurId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    // 3. Enrichir avec les séquences
    await this.enrichWithSequences();
    
    // 4. Calculer stats
    this.calculateStats();
    
  } catch (error) {
    console.error('Erreur chargement:', error);
    this.error = error.message;
  } finally {
    this.loading = false;
  }
}

async enrichWithSequences() {
  const sequenceIds = [...new Set(this.relancesPayeur.map(r => r.sequence_id))];
  
  for (const id of sequenceIds) {
    if (!id) continue;
    try {
      const sequence = await dbSequences.get('sequence:' + id);
      this.sequencesMap.set(id, sequence);
    } catch (e) {
      console.warn('Séquence non trouvée:', id);
    }
  }
}

calculateStats() {
  this.stats = {
    total: this.relancesPayeur.length,
    parStatut: {
      brouillon: this.relancesPayeur.filter(r => r.statut === 'brouillon').length,
      aValider: this.relancesPayeur.filter(r => r.statut === 'a_valider').length,
      programmee: this.relancesPayeur.filter(r => r.statut === 'programmee').length,
      envoyee: this.relancesPayeur.filter(r => r.statut === 'envoyee').length,
      annulee: this.relancesPayeur.filter(r => r.statut === 'annulee').length
    }
  };
}
```

## Colonnes affichées

| Colonne | Source | Description |
|---------|--------|-------------|
| ID relance | relance._id | Identifiant unique |
| Séquence | sequencesMap.get(relance.sequence_id).nom | Nom de la séquence |
| Étape | relance.etape_sequence | N° d'étape |
| Statut | relance.statut | Badge coloré |
| Date création | relance.created_at | Date de création |
| Date envoi | relance.date_envoi_programmee | Date programmée/réelle |
| Montant | relance.montant_total | Total des impayés |
| Actions | - | Voir/Modifier/Annuler/Valider |

## Statuts et couleurs

| Statut | Couleur | Actions disponibles |
|--------|---------|---------------------|
| brouillon | gris | Voir, Modifier, Supprimer |
| a_valider | orange | Voir, Valider, Modifier |
| programmee | bleu | Voir, Annuler |
| envoyee | vert | Voir |
| annulee | rouge | Voir |

## Mockups de référence

- `specs/mockups/relances.html` (liste filtrée par payeur)

---

## Migration depuis l'ancienne API

| Aspect | Avant (API) | Après (PouchDB) |
|--------|-------------|-----------------|
| Relances du payeur | `GET /api/relances?payeur_id=:id` | `db.allDocs()` + filtrage côté client |
| Détails payeur | `GET /api/payers/:id` | `dbContacts.get('contact:' + id)` |
| Séquences | `GET /api/sequences` | `dbSequences.get()` pour chaque |
| Enrichissement | Backend | Côté client |
| Latence | ~300-800ms | ~50-100ms (local) |
| Offline | ❌ Impossible | ✅ Fonctionne offline |
