---
id: relances-historique-payeur
type: frontend
folder: specs/workflows/frontend/relances/
description: Afficher l'historique des relances d'un payeur spécifique depuis PouchDB
depends_on: [relances-initial-load]
screen: relances
global: false
mockup_entry: specs/mockups/relances.html
---

# relances-historique-payeur : Historique des relances par payeur (PouchDB)

## Description

Afficher l'historique complet des relances envoyées à un payeur spécifique, avec filtres et timeline. Les données sont chargées depuis PouchDB local.

## Étapes

```javascript
/**
 * @action Cliquer sur le nom du payeur dans la liste des relances
 * @checkpoint payeur-clicked, payeur ID identifié
 */

/**
 * @action Naviguer vers la vue historique du payeur
 * @checkpoint navigation-done, URL mise à jour avec ?payeur_id=:id
 */

/**
 * @action Afficher le skeleton loader de l'historique
 * @checkpoint skeleton-shown, état de chargement visible
 */

/**
 * @action Récupérer les relances du payeur depuis PouchDB
 * @checkpoint relances-fetched, liste des relances reçues
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
 * @action Récupérer les infos du payeur depuis PouchDB
 * @checkpoint payeur-fetched, nom et solde reçus
 * 
 * **Query PouchDB** :
 * const payeur = await dbContacts.get('contact:' + payeurId);
 */

/**
 * @action Récupérer les impayés du payeur depuis PouchDB
 * @checkpoint impayes-fetched, factures liées au payeur
 * 
 * **Query PouchDB** :
 * const result = await db.allDocs({
 *   startkey: 'facture:',
 *   endkey: 'facture:\ufff0',
 *   include_docs: true
 * });
 * const impayes = result.rows
 *   .map(r => r.doc)
 *   .filter(f => f.contact_id === payeurId && f.facture_soldee === 0);
 */

/**
 * @action Calculer les statistiques du payeur (total relances, taux réponse...)
 * @checkpoint stats-calculated, indicateurs calculés côté client
 */

/**
 * @action Afficher l'en-tête avec infos du payeur
 * @checkpoint header-rendered, nom, solde, score visibles
 */

/**
 * @action Afficher la timeline des relances
 * @checkpoint timeline-rendered, relances ordonnées par date
 */

/**
 * @action Afficher les statistiques du payeur
 * @checkpoint stats-rendered, indicateurs visibles
 */

/**
 * @action Activer les filtres (par statut, par date, par séquence)
 * @checkpoint filters-enabled, filtres interactifs actifs
 * 
 * **Note** : Les filtres sont appliqués côté client sur les données déjà chargées
 */
```

## PouchDB Operations

### Chargement des données

```javascript
async loadHistoriquePayeur(payeurId) {
  this.loading = true;
  
  try {
    // 1. Récupérer le payeur
    const payeur = await dbContacts.get('contact:' + payeurId);
    this.selectedPayeur = payeur;
    
    // 2. Récupérer les relances du payeur
    const relancesResult = await db.allDocs({
      startkey: 'relance:',
      endkey: 'relance:\ufff0',
      include_docs: true
    });
    
    this.relancesPayeur = relancesResult.rows
      .map(r => r.doc)
      .filter(r => r.contact_id === payeurId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    // 3. Récupérer les impayés du payeur
    const impayesResult = await db.allDocs({
      startkey: 'facture:',
      endkey: 'facture:\ufff0',
      include_docs: true
    });
    
    this.impayesPayeur = impayesResult.rows
      .map(r => r.doc)
      .filter(f => f.contact_id === payeurId && f.facture_soldee === 0);
    
    // 4. Calculer les statistiques
    this.calculateStats();
    
  } catch (error) {
    console.error('Erreur chargement historique:', error);
    this.error = error.message;
  } finally {
    this.loading = false;
  }
}

// Filtrer les relances côté client
filterRelances() {
  let filtered = [...this.relancesPayeur];
  
  // Filtre par statut
  if (this.filterStatut) {
    filtered = filtered.filter(r => r.statut === this.filterStatut);
  }
  
  // Filtre par date
  if (this.filterDateFrom) {
    filtered = filtered.filter(r => 
      new Date(r.created_at) >= new Date(this.filterDateFrom)
    );
  }
  if (this.filterDateTo) {
    filtered = filtered.filter(r => 
      new Date(r.created_at) <= new Date(this.filterDateTo)
    );
  }
  
  // Filtre par séquence
  if (this.filterSequenceId) {
    filtered = filtered.filter(r => r.sequence_id === this.filterSequenceId);
  }
  
  return filtered;
}

// Calculer les statistiques
calculateStats() {
  const relances = this.relancesPayeur;
  
  this.stats = {
    totalRelances: relances.length,
    relancesEnvoyees: relances.filter(r => r.statut === 'envoyee').length,
    tauxReponse: this.calculateTauxReponse(relances),
    montantTotal: this.impayesPayeur.reduce((sum, i) => sum + (i.reste_a_payer || 0), 0),
    derniereRelance: relances.length > 0 
      ? new Date(Math.max(...relances.map(r => new Date(r.created_at))))
      : null
  };
}
```

## Filtres disponibles

| Filtre | Type | Description |
|--------|------|-------------|
| `statut` | select | brouillon, a_valider, programmee, envoyee, annulee |
| `date_from` | date | Date de début |
| `date_to` | date | Date de fin |
| `sequence_id` | select | Filtrer par séquence |

## Statistiques affichées

| Indicateur | Calcul |
|------------|--------|
| Total relances | relances.length |
| Relances envoyées | relances.filter(r => r.statut === 'envoyee').length |
| Taux de réponse | (relances avec réponse / total envoyées) × 100 |
| Montant total relancé | Sum des impayés liés |
| Dernière relance | Max date_envoi |

## Mockups de référence

- `specs/mockups/relances.html` (vue historique payeur)

---

## Migration depuis l'ancienne API

| Aspect | Avant (API) | Après (PouchDB) |
|--------|-------------|-----------------|
| Relances du payeur | `GET /api/relances?payeur_id=:id` | `db.allDocs()` + filtrage côté client |
| Infos payeur | `GET /api/payers/:id` | `dbContacts.get('contact:' + id)` |
| Impayés du payeur | `GET /api/impayes?payeur_id=:id` | `db.allDocs()` + filtrage côté client |
| Filtrage | Paramètres API | Côté client sur données en mémoire |
| Calcul stats | Backend | Côté client |
| Latence | ~300-800ms | ~50-100ms (local) |
| Offline | ❌ Impossible | ✅ Consultation complète offline |
