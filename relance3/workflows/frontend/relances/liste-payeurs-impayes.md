---
id: relances-liste-payeurs-impayes
type: frontend
folder: specs/workflows/frontend/relances/
description: Lister tous les payeurs ayant des impayés depuis PouchDB avec leurs totaux
depends_on: [auth-check]
screen: relances
global: false
mockup_entry: specs/mockups/relances.html
---

# relances-liste-payeurs-impayes : Liste des payeurs avec impayés (PouchDB)

## Description

Afficher la liste de tous les payeurs qui ont au moins un impayé, avec leurs soldes débiteurs et options d'action rapide. Les données sont chargées depuis PouchDB local.

## Étapes

```javascript
/**
 * @action Initialiser les filtres par défaut (tous les payeurs avec impayés)
 * @checkpoint filters-initialized, filtres actifs sur impayés > 0
 */

/**
 * @action Afficher le skeleton loader
 * @checkpoint skeleton-shown, état de chargement visible
 */

/**
 * @action Récupérer les impayés depuis PouchDB
 * @checkpoint impayes-fetched, données brutes reçues
 * 
 * **Query PouchDB** :
 * const result = await db.allDocs({
 *   startkey: 'facture:',
 *   endkey: 'facture:\ufff0',
 *   include_docs: true
 * });
 * const impayes = result.rows
 *   .map(r => r.doc)
 *   .filter(f => f.facture_soldee === 0);
 */

/**
 * @action Récupérer les payeurs depuis PouchDB
 * @checkpoint payers-fetched, liste des payeurs reçue
 * 
 * **Query PouchDB** :
 * const result = await dbContacts.allDocs({
 *   startkey: 'contact:',
 *   endkey: 'contact:\ufff0',
 *   include_docs: true
 * });
 * const payeurs = result.rows.map(r => r.doc);
 */

/**
 * @action Récupérer les relances programmées depuis PouchDB
 * @checkpoint relances-fetched, relances pour indicateurs
 * 
 * **Query PouchDB** :
 * const result = await dbRelances.allDocs({
 *   startkey: 'relance:',
 *   endkey: 'relance:\ufff0',
 *   include_docs: true
 * });
 * const relances = result.rows
 *   .map(r => r.doc)
 *   .filter(r => r.statut === 'programmee');
 */

/**
 * @action Agréger les impayés par payeur côté client
 * @checkpoint aggregated-by-payeur, données groupées calculées
 * 
 * Pour chaque payeur avec impayés :
 * - nombre_impayes
 * - montant_total_impaye
 * - date_derniere_facture
 * - statut_relance_en_cours (si relance programmée/envoyée récemment)
 */

/**
 * @action Calculer les statistiques globales
 * @checkpoint stats-calculated, totaux calculés
 * - nb_payeurs_impayes
 * - montant_total_global
 * - moyenne_impaye_par_payeur
 */

/**
 * @action Trier par montant décroissant par défaut
 * @checkpoint sorted-by-montant, ordre appliqué
 */

/**
 * @action Afficher la liste des payeurs avec impayés
 * @checkpoint list-rendered, tableau avec payeurs visibles
 */

/**
 * @action Afficher les indicateurs de priorité (score, ancienneté)
 * @checkpoint indicators-rendered, badges priorité visibles
 */

/**
 * @action Activer les actions rapides (voir impayés, créer relance)
 * @checkpoint actions-enabled, boutons d'action fonctionnels
 */

/**
 * @action Configurer la pagination si > 50 payeurs
 * @checkpoint pagination-configured, contrôles de pagination actifs
 */
```

## PouchDB Operations

### Chargement et agrégation

```javascript
async loadPayeursAvecImpayes() {
  this.loading = true;
  
  try {
    // 1. Impayés
    const impayesResult = await db.allDocs({
      startkey: 'facture:',
      endkey: 'facture:\ufff0',
      include_docs: true
    });
    const impayes = impayesResult.rows
      .map(r => r.doc)
      .filter(f => f.facture_soldee === 0);
    
    // 2. Payeurs
    const payeursResult = await dbContacts.allDocs({
      startkey: 'contact:',
      endkey: 'contact:\ufff0',
      include_docs: true
    });
    const payeursMap = new Map(
      payeursResult.rows.map(r => [r.doc._id, r.doc])
    );
    
    // 3. Relances programmées
    const relancesResult = await dbRelances.allDocs({
      startkey: 'relance:',
      endkey: 'relance:\ufff0',
      include_docs: true
    });
    const relancesActives = relancesResult.rows
      .map(r => r.doc)
      .filter(r => ['programmee', 'a_valider'].includes(r.statut));
    
    // 4. Grouper par payeur
    this.payeursAvecImpayes = this.aggregateByPayeur(
      impayes, 
      payeursMap, 
      relancesActives
    );
    
    // 5. Calculer stats
    this.calculateStats();
    
  } catch (error) {
    console.error('Erreur chargement:', error);
    this.error = error.message;
  } finally {
    this.loading = false;
  }
}

aggregateByPayeur(impayes, payeursMap, relancesActives) {
  const groups = new Map();
  
  for (const impaye of impayes) {
    const payeurId = impaye.contact_id;
    if (!payeurId) continue;
    
    if (!groups.has(payeurId)) {
      const payeur = payeursMap.get('contact:' + payeurId);
      groups.set(payeurId, {
        payeur_id: payeurId,
        nom: payeur?.nom || 'Inconnu',
        email: payeur?.email || '',
        nombre_impayes: 0,
        montant_total: 0,
        date_derniere_facture: null,
        relance_en_cours: relancesActives.some(r => r.contact_id === payeurId)
      });
    }
    
    const group = groups.get(payeurId);
    group.nombre_impayes++;
    group.montant_total += impaye.reste_a_payer || 0;
    
    const dateEcheance = new Date(impaye.date_echeance);
    if (!group.date_derniere_facture || dateEcheance > new Date(group.date_derniere_facture)) {
      group.date_derniere_facture = impaye.date_echeance;
    }
  }
  
  return Array.from(groups.values())
    .sort((a, b) => b.montant_total - a.montant_total);
}
```

## Colonnes affichées

| Colonne | Source | Triable |
|---------|--------|---------|
| Nom payeur | payeurs.nom | ✅ |
| N° impayés | agrégation | ✅ |
| Montant total | agrégation | ✅ (défaut) |
| Dernière échéance | max(impayes.date_echeance) | ✅ |
| Relance en cours | relances.statut = 'programmee' | ❌ |
| Score | calcul côté client | ✅ |
| Actions | - | ❌ |

## Filtres disponibles

| Filtre | Type | Description |
|--------|------|-------------|
| `montant_min` | number | Montant minimum total |
| `nb_impayes_min` | number | Nombre minimum d'impayés |
| `avec_relance` | checkbox | Exclure/Inclure ceux avec relance en cours |
| `score` | select | Filtrer par score (A/B/C/D) |

## Mockups de référence

- `specs/mockups/relances.html` (vue liste payeurs impayés)

---

## Migration depuis l'ancienne API

| Aspect | Avant (API) | Après (PouchDB) |
|--------|-------------|-----------------|
| Impayés | `GET /api/impayes?facture_soldee=0` | `db.allDocs()` + filtrage |
| Payeurs | `GET /api/payers` | `dbContacts.allDocs()` |
| Relances | `GET /api/relances?statut=programmee` | `dbRelances.allDocs()` + filtrage |
| Agrégation | Backend SQL | Côté client avec `Map()` |
| Tri | Paramètre API | `Array.sort()` côté client |
| Pagination | Paramètres API | Côté client avec `slice()` |
| Latence | ~500-1000ms | ~100-200ms (local) |
| Offline | ❌ Impossible | ✅ Fonctionne offline |
