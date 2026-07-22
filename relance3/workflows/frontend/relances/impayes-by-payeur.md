---
id: relances-impayes-by-payeur
type: frontend
folder: specs/workflows/frontend/relances/
description: Afficher les impayés regroupés par payeur dans les relances depuis PouchDB
depends_on: [relances-initial-load]
screen: relances
global: false
mockup_entry: specs/mockups/relances.html
---

# relances-impayes-by-payeur : Impayés par payeur (PouchDB)

## Description

Afficher les impayés groupés par payeur dans le contexte des relances, avec possibilité de sélection pour relance. Les données sont chargées depuis PouchDB local.

## Étapes

```javascript
/**
 * @action Charger la vue relances avec groupement par payeur
 * @checkpoint view-loaded, mode groupement actif
 */

/**
 * @action Récupérer les impayés non soldés depuis PouchDB
 * @checkpoint impayes-fetched, liste des impayés reçue
 * 
 * **Query PouchDB** :
 * const result = await db.allDocs({
 *   startkey: 'facture:',
 *   endkey: 'facture:\ufff0',
 *   include_docs: true
 * });
 * const impayes = result.rows
 *   .map(r => r.doc)
 *   .filter(f => f.facture_soldee === 0 && !f.is_blacklisted);
 */

/**
 * @action Récupérer les contacts/payeurs depuis PouchDB
 * @checkpoint contacts-fetched, mapping payeur_id => contact établi
 * 
 * **Query PouchDB** :
 * const result = await dbContacts.allDocs({
 *   startkey: 'contact:',
 *   endkey: 'contact:\ufff0',
 *   include_docs: true
 * });
 * const contacts = result.rows.map(r => r.doc);
 */

/**
 * @action Grouper les impayés par payeur côté client
 * @checkpoint grouped-by-payeur, Map(payeur_id => impayes[])
 * 
 * **Approche** : Pour chaque impayé, agréger dans un objet groupé :
 * - payeur_id, payeur_nom
 * - total_impayes (montant)
 * - count_impayes (nombre)
 * - date_premiere_echeance
 * - date_derniere_echeance
 * - impayes[] (détail)
 */

/**
 * @action Calculer les totaux par payeur
 * @checkpoint totals-calculated, montants agrégés calculés
 */

/**
 * @action Trier les payeurs par montant total décroissant
 * @checkpoint sorted-by-montant, ordre décroissant appliqué
 */

/**
 * @action Afficher les sections dépliables par payeur
 * @checkpoint sections-rendered, accordéons payeurs visibles
 */

/**
 * @action Afficher le résumé par payeur (nom, nb impayés, montant total)
 * @checkpoint summary-rendered, en-tête de section visible
 */

/**
 * @action Afficher la liste des impayés dans chaque section
 * @checkpoint impayes-list-rendered, tableau détaillé par payeur
 */

/**
 * @action Activer les checkboxes de sélection par impayé
 * @checkpoint checkboxes-enabled, sélection multiple possible
 */

/**
 * @action Activer le bouton "Créer relance" pour les impayés sélectionnés
 * @checkpoint create-button-enabled, bouton actif si sélection > 0
 */
```

## PouchDB Operations

### Chargement et groupement des données

```javascript
async loadImpayesByPayeur() {
  this.loading = true;
  
  try {
    // 1. Récupérer tous les impayés non soldés
    const impayesResult = await db.allDocs({
      startkey: 'facture:',
      endkey: 'facture:\ufff0',
      include_docs: true
    });
    
    const impayes = impayesResult.rows
      .map(r => r.doc)
      .filter(f => f.facture_soldee === 0 && !f.is_blacklisted);
    
    // 2. Récupérer tous les contacts
    const contactsResult = await dbContacts.allDocs({
      startkey: 'contact:',
      endkey: 'contact:\ufff0',
      include_docs: true
    });
    
    const contactsMap = new Map(
      contactsResult.rows.map(r => [r.doc._id, r.doc])
    );
    
    // 3. Grouper par payeur
    this.payeursGroupes = this.groupByPayeur(impayes, contactsMap);
    
    // 4. Trier par montant total décroissant
    this.payeursGroupes.sort((a, b) => b.total_impayes - a.total_impayes);
    
  } catch (error) {
    console.error('Erreur chargement impayés:', error);
    this.error = error.message;
  } finally {
    this.loading = false;
  }
}

// Grouper les impayés par payeur
groupByPayeur(impayes, contactsMap) {
  const groups = new Map();
  
  for (const impaye of impayes) {
    const payeurId = impaye.contact_id;
    if (!payeurId) continue;
    
    if (!groups.has(payeurId)) {
      const contact = contactsMap.get('contact:' + payeurId) || {};
      groups.set(payeurId, {
        payeur_id: payeurId,
        payeur_nom: contact.nom || 'Inconnu',
        contact_email: contact.email || '',
        total_impayes: 0,
        count_impayes: 0,
        date_premiere_echeance: null,
        date_derniere_echeance: null,
        impayes: []
      });
    }
    
    const group = groups.get(payeurId);
    group.impayes.push(impaye);
    group.total_impayes += impaye.reste_a_payer || 0;
    group.count_impayes++;
    
    // Mettre à jour les dates
    const dateEcheance = new Date(impaye.date_echeance);
    if (!group.date_premiere_echeance || dateEcheance < new Date(group.date_premiere_echeance)) {
      group.date_premiere_echeance = impaye.date_echeance;
    }
    if (!group.date_derniere_echeance || dateEcheance > new Date(group.date_derniere_echeance)) {
      group.date_derniere_echeance = impaye.date_echeance;
    }
  }
  
  return Array.from(groups.values());
}
```

## Structure des données groupées

```javascript
{
  payeur_id: "contact:PAY_001",
  payeur_nom: "ACME Corp",
  contact_email: "contact@acme.com",
  total_impayes: 12500.00,
  count_impayes: 3,
  date_premiere_echeance: "2026-01-15",
  date_derniere_echeance: "2026-03-20",
  impayes: [
    { _id: "facture:IMP_001", nfacture: "FAC-001", reste_a_payer: 5000, ... },
    { _id: "facture:IMP_002", nfacture: "FAC-002", reste_a_payer: 4500, ... },
    { _id: "facture:IMP_003", nfacture: "FAC-003", reste_a_payer: 3000, ... }
  ]
}
```

## Mockups de référence

- `specs/mockups/relances.html` (vue groupement par payeur)

---

## Migration depuis l'ancienne API

| Aspect | Avant (API) | Après (PouchDB) |
|--------|-------------|-----------------|
| Impayés non soldés | `GET /api/impayes?facture_soldee=0` | `db.allDocs()` + filtrage côté client |
| Contacts | `GET /api/contacts` | `dbContacts.allDocs()` |
| Groupement | Backend SQL GROUP BY | Côté client avec `Map()` |
| Calcul totaux | Backend | Côté client avec `reduce()` |
| Tri | Paramètre API | `Array.sort()` côté client |
| Latence | ~300-800ms | ~50-100ms (local) |
| Offline | ❌ Impossible | ✅ Consultation complète offline |
