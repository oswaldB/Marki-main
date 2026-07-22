---
id: impayes-payeur-initial-load
type: frontend
folder: specs/workflows/frontend/impayes-payeur/
description: Charger les impayés groupés par payeur depuis PouchDB avec leurs factures
depends_on: [auth-check]
screen: impayes-payeur
global: false
mockup_entry: specs/mockups/impayes-payeur.html
---

# impayes-payeur-initial-load : Chargement initial Impayés par Payeur (PouchDB)

## Description

Charger la vue groupée des impayés par payeur avec les factures associées et le scoring depuis **PouchDB local**.

Les données sont synchronisées automatiquement avec CouchDB distant.

## Étapes

```javascript
/**
 * @action Initialiser PouchDB et configurer le sync
 * @checkpoint pouchdb-initialized, bases locales prêtes
 * 
 * Code:
 * this.db = new PouchDB('marki-factures');
 * this.dbContacts = new PouchDB('marki-contacts');
 * this.db.sync(remoteUrl, { live: true, retry: true });
 */

/**
 * @action Initialiser les filtres par défaut (tri par montant total DESC)
 * @checkpoint filters-initialized, sortBy='montant', sortDirection='desc'
 */

/**
 * @action Afficher le spinner de chargement
 * @checkpoint loading-shown, overlay de chargement visible
 */

/**
 * @action Récupérer tous les impayés depuis PouchDB
 * @checkpoint data-fetched, impayés reçus depuis PouchDB local
 * 
 * Query:
 * const result = await db.allDocs({
 *   startkey: 'facture:',
 *   endkey: 'facture:\ufff0',
 *   include_docs: true
 * });
 * const impayes = result.rows
 *   .map(row => row.doc)
 *   .filter(f => f.reste_a_payer > 0 && f.statut === 'impaye');
 */

/**
 * @action Configurer le listener pour les changements temps réel
 * @checkpoint changes-listener-active, mises à jour automatiques
 * 
 * Code:
 * db.changes({ since: 'now', live: true, include_docs: true })
 *   .on('change', (change) => { this.handleDataChange(change.doc) });
 */

/**
 * @action Grouper les impayés par payeur côté client
 * @checkpoint grouped-by-payer, factures regroupées par contact_id
 * 
 * Traitement:
 * const grouped = impayes.reduce((acc, facture) => {
 *   const payerId = facture.contact_id;
 *   if (!acc[payerId]) acc[payerId] = [];
 *   acc[payerId].push(facture);
 *   return acc;
 * }, {});
 */

/**
 * @action Calculer les totaux par payeur côté client
 * @checkpoint totals-calculated, montants agrégés pour chaque payeur
 * 
 * Calcul:
 * const payerTotals = Object.entries(grouped).map(([payerId, factures]) => ({
 *   payerId,
 *   factures,
 *   montantTotal: factures.reduce((s, f) => s + f.reste_a_payer, 0),
 *   nbFactures: factures.length,
 *   ancienMax: Math.max(...factures.map(f => calculateJours(f.date_echeance)))
 * }));
 */

/**
 * @action Déterminer le statut (régulier/retard/critique) pour chaque payeur
 * @checkpoint status-computed, statut calculé selon ancienneté et montant
 */

/**
 * @action Stocker les données dans Alpine.store('impayesPayeur')
 * @checkpoint data-stored, payeurs triés et enrichis stockés
 */

/**
 * @action Rendre les cartes payeurs avec leurs factures repliables
 * @checkpoint cards-rendered, première carte dépliée par défaut
 */
```

## PouchDB Operations

### Chargement initial

```javascript
async loadImpayesByPayer() {
  this.loading = true;
  
  try {
    // 1. Récupérer toutes les factures depuis PouchDB
    const result = await db.allDocs({
      startkey: 'facture:',
      endkey: 'facture:\ufff0',
      include_docs: true
    });
    
    // 2. Filtrer les impayés
    const impayes = result.rows
      .map(row => row.doc)
      .filter(f => f.reste_a_payer > 0 && f.statut === 'impaye');
    
    // 3. Grouper par payeur
    const grouped = impayes.reduce((acc, facture) => {
      const payerId = facture.contact_id || facture.payer_id;
      if (!acc[payerId]) {
        acc[payerId] = {
          payerId,
          payerName: facture.payer_name || facture.nom_contact,
          factures: [],
          montantTotal: 0,
          nbFactures: 0
        };
      }
      acc[payerId].factures.push(facture);
      acc[payerId].montantTotal += facture.reste_a_payer;
      acc[payerId].nbFactures++;
      return acc;
    }, {});
    
    // 4. Convertir en array et trier par montant décroissant
    this.payers = Object.values(grouped)
      .sort((a, b) => b.montantTotal - a.montantTotal);
    
    // 5. Calculer le statut pour chaque payeur
    this.payers.forEach(payer => {
      payer.statut = this.calculatePayerStatus(payer);
      payer.score = this.calculatePayerScore(payer);
    });
    
  } catch (error) {
    console.error('Erreur chargement impayés par payeur:', error);
    this.error = error.message;
  } finally {
    this.loading = false;
  }
}

// Calculer le statut du payeur
calculatePayerStatus(payer) {
  const maxJours = Math.max(...payer.factures.map(f => 
    this.calculateJours(f.date_echeance)
  ));
  
  if (maxJours > 90) return 'critique';
  if (maxJours > 30) return 'retard';
  return 'regulier';
}

// Calculer le score du payeur (A/B/C/D)
calculatePayerScore(payer) {
  const montant = payer.montantTotal;
  const nbFactures = payer.nbFactures;
  const maxJours = Math.max(...payer.factures.map(f => 
    this.calculateJours(f.date_echeance)
  ));
  
  if (maxJours > 90 || montant > 10000) return 'D';
  if (maxJours > 60 || montant > 5000) return 'C';
  if (maxJours > 30 || montant > 1000) return 'B';
  return 'A';
}

// Calculer les jours depuis l'échéance
calculateJours(dateEcheance) {
  if (!dateEcheance) return 0;
  const echeance = new Date(dateEcheance);
  const now = new Date();
  return Math.max(0, Math.floor((now - echeance) / (1000 * 60 * 60 * 24)));
}
```

### Live Sync (temps réel)

```javascript
// Écouter les changements sur les factures
db.changes({
  since: 'now',
  live: true,
  include_docs: true
}).on('change', (change) => {
  if (change.doc.type === 'facture') {
    const isImpaye = change.doc.reste_a_payer > 0 && 
                     change.doc.statut === 'impaye';
    
    if (isImpaye) {
      // Mettre à jour le groupement
      this.loadImpayesByPayer();
    }
  }
});
```

### Option: Mango Query avec index

```javascript
// Créer un index pour optimiser les requêtes
await db.createIndex({
  index: {
    fields: ['type', 'statut', 'reste_a_payer', 'contact_id']
  },
  name: 'idx-impayes-by-payer'
});

// Requête avec find
const result = await db.find({
  selector: {
    type: { $eq: 'facture' },
    statut: { $eq: 'impaye' },
    reste_a_payer: { $gt: 0 }
  }
});

const impayes = result.docs;
```

## Structure des données résultat

```javascript
// Payeurs groupés avec leurs factures
[
  {
    payerId: "contact:550e8400-...",
    payerName: "ACME Corporation",
    factures: [
      { _id: "facture:...", nfacture: "F-001", reste_a_payer: 2500, ... },
      { _id: "facture:...", nfacture: "F-002", reste_a_payer: 1500, ... }
    ],
    montantTotal: 4000,
    nbFactures: 2,
    statut: "retard", // régulier | retard | critique
    score: "B",       // A | B | C | D
    ancienMax: 45     // Jours de retard maximum
  },
  // ... autres payeurs
]
```

## Mockups de référence

- `specs/mockups/impayes-payeur.html`

---

## Migration depuis l'ancienne API

| Aspect | Avant (API) | Après (PouchDB) |
|--------|-------------|-----------------|
| Source | `GET /api/impayes?facture_soldee=0` + `GET /api/contacts` | `db.allDocs()` |
| Traitement | Backend (SQL JOIN) | Côté client (JavaScript reduce) |
| Grouper par payeur | SQL GROUP BY | `reduce()` côté client |
| Calcul montants | SQL SUM | `reduce()` côté client |
| Temps réel | Polling | `db.changes()` |
| Latence | ~500ms-1s | ~50-200ms (local) |
| Offline | ❌ Impossible | ✅ Fonctionne offline |
