---
id: dashboard-initial-load
type: frontend
folder: specs/workflows/frontend/dashboard/
description: Orchestrateur du chargement initial via PouchDB - coordonne tous les workflows KPI, graphique et événements
depends_on: [
  dashboard-kpi-factures-en-attente,
  dashboard-kpi-impayes-actifs,
  dashboard-kpi-montant-total,
  dashboard-kpi-relances-jour,
  dashboard-kpi-taux-recouvrement,
  dashboard-kpi-anciennete-tranches,
  dashboard-chart-evolution-impayes,
  dashboard-events-manager
]
screen: dashboard
global: false
mockup_entry: specs/mockups/dashboard.html
---

# dashboard-initial-load : Orchestrateur Dashboard (PouchDB)

## Description

Workflow orchestrateur qui coordonne le chargement initial du dashboard depuis **PouchDB local**.
Déclenche tous les workflows KPI et le graphique en parallèle, puis affiche le résultat.

Toutes les données proviennent de PouchDB (pas d'appels API backend).

## Workflow Orchestrateur

```javascript
/**
 * @action Initialiser PouchDB et vérifier le sync
 * @checkpoint pouchdb-initialized, bases locales prêtes
 * 
 * Code:
 * this.dbFactures = new PouchDB('marki-factures');
 * this.dbContacts = new PouchDB('marki-contacts');
 * this.dbEvents = new PouchDB('marki-events');
 * 
 * // Configurer le sync avec CouchDB
 * this.dbFactures.sync('https://admin:admin@dev.markidiags.com/data/marki', {
 *   live: true, retry: true
 * });
 */

/**
 * @action Afficher le spinner de chargement global
 * @checkpoint loading-shown, état loading=true visible
 */

/**
 * @action Déclencher tous les workflows KPI en parallèle
 * @checkpoint kpis-workflows-triggered, tous les workflows KPI lancés
 * 
 * Workflows déclenchés (tous utilisent PouchDB):
 * - dashboard-kpi-factures-en-attente
 * - dashboard-kpi-impayes-actifs
 * - dashboard-kpi-montant-total
 * - dashboard-kpi-relances-jour
 * - dashboard-kpi-taux-recouvrement
 * - dashboard-kpi-anciennete-tranches
 */

/**
 * @action Déclencher le workflow du graphique
 * @checkpoint chart-workflow-triggered, chart-evolution-impayes lancé
 */

/**
 * @action Déclencher le workflow events-manager
 * @checkpoint events-workflow-triggered, événements chargés depuis PouchDB
 */

/**
 * @action Attendre la complétion de tous les workflows
 * @checkpoint all-workflows-completed, tous les KPI et graphique prêts
 */

/**
 * @action Calculer le top débiteurs depuis PouchDB
 * @checkpoint top-debiteurs-calculated, tri par montant décroissant
 * 
 * Note: Le top débiteurs est calculé ici en agrégeant les données
 * des factures impayées depuis PouchDB.
 */

/**
 * @action Masquer le spinner et afficher le contenu complet
 * @checkpoint loading-complete, dashboard entièrement rendu
 */
```

## Dépendances

| Workflow | Description | Source de données |
|----------|-------------|-------------------|
| dashboard-kpi-factures-en-attente | Calcule `kpis.facturesEnAttente` | PouchDB `facture:` |
| dashboard-kpi-impayes-actifs | Calcule `kpis.impayesActifs` | PouchDB `facture:` |
| dashboard-kpi-montant-total | Calcule `kpis.montantTotal` | PouchDB `facture:` |
| dashboard-kpi-relances-jour | Calcule `kpis.relancesJour` | PouchDB `relance:` |
| dashboard-kpi-taux-recouvrement | Calcule `kpis.tauxRecouvrement` | PouchDB `facture:` |
| dashboard-kpi-anciennete-tranches | Calcule `kpis.anciennete.*` | PouchDB `facture:` |
| dashboard-chart-evolution-impayes | Initialise Chart.js | PouchDB `facture:` |
| dashboard-events-manager | Charge les événements | PouchDB `event:` |

## PouchDB Initialization

```javascript
async initPouchDB() {
  // Initialiser les bases
  this.dbFactures = new PouchDB('marki-factures');
  this.dbContacts = new PouchDB('marki-contacts');
  this.dbRelances = new PouchDB('marki-relances');
  this.dbEvents = new PouchDB('marki-events');
  
  // Configurer le sync avec CouchDB distant
  const remoteUrl = 'https://admin:admin@dev.markidiags.com/data';
  
  this.dbFactures.sync(remoteUrl + '/marki', { live: true, retry: true });
  this.dbContacts.sync(remoteUrl + '/marki', { live: true, retry: true });
  this.dbRelances.sync(remoteUrl + '/marki', { live: true, retry: true });
  this.dbEvents.sync(remoteUrl + '/marki-events', { live: true, retry: true });
  
  // Vérifier si données locales existent
  const facturesInfo = await this.dbFactures.info();
  this.hasLocalData = facturesInfo.doc_count > 0;
}
```

## Top Débiteurs (calculé depuis PouchDB)

```javascript
// Calcul du top débiteurs après chargement des factures depuis PouchDB
async calculateTopDebtors() {
  // Récupérer toutes les factures impayées depuis PouchDB
  const result = await this.dbFactures.allDocs({
    startkey: 'facture:',
    endkey: 'facture:\ufff0',
    include_docs: true
  });
  
  const factures = result.rows
    .map(row => row.doc)
    .filter(f => f.reste_a_payer > 0);
  
  // Agréger par contact
  const debtorsMap = factures.reduce((acc, f) => {
    const payerId = f.contact_id || f.payer_id;
    const payerName = f.payer_name || f.nom_contact;
    
    if (!acc[payerId]) {
      acc[payerId] = {
        id: payerId,
        name: payerName,
        initials: this.getInitials(payerName),
        montant: 0,
        impayesCount: 0,
        jours: 0
      };
    }
    
    acc[payerId].montant += f.reste_a_payer;
    acc[payerId].impayesCount++;
    acc[payerId].jours = Math.max(
      acc[payerId].jours,
      this.calculateJours(f.date_echeance)
    );
    
    return acc;
  }, {});
  
  // Trier et limiter
  this.topDebtors = Object.values(debtorsMap)
    .sort((a, b) => b.montant - a.montant)
    .slice(0, 10);
}

// Utilitaire
getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

calculateJours(dateEcheance) {
  if (!dateEcheance) return 0;
  const echeance = new Date(dateEcheance);
  const now = new Date();
  return Math.max(0, Math.floor((now - echeance) / (1000 * 60 * 60 * 24)));
}
```

## Sync Status (optionnel)

```javascript
// Afficher le statut de synchronisation
showSyncStatus() {
  this.dbFactures.sync(remoteUrl + '/marki', { live: true, retry: true })
    .on('change', () => { this.syncStatus = 'syncing'; })
    .on('paused', () => { this.syncStatus = 'idle'; })
    .on('active', () => { this.syncStatus = 'syncing'; })
    .on('denied', (err) => { 
      this.syncStatus = 'error';
      console.error('Sync denied:', err);
    })
    .on('error', (err) => { 
      this.syncStatus = 'error';
      console.error('Sync error:', err);
    });
}
```

## Flow complet

```javascript
async initDashboard() {
  this.loading = true;
  
  try {
    // 1. Initialiser PouchDB
    await this.initPouchDB();
    
    // 2. Déclencher tous les workflows en parallèle
    await Promise.all([
      this.loadKPIs(),
      this.initChart(),
      this.loadEvents(),
      this.calculateTopDebtors()
    ]);
    
    // 3. Afficher le dashboard
    this.loading = false;
    
  } catch (err) {
    console.error('Erreur chargement dashboard:', err);
    this.error = err.message;
    this.loading = false;
  }
}
```

## Mockups de référence

- `specs/mockups/dashboard.html`

## Notes

- Ce workflow est un **orchestrateur**, il ne fait pas de calculs métier directement
- Les calculs métier sont délégués aux workflows KPI dédiés
- Le top débiteurs est calculé ici en agrégeant les données PouchDB
- **Toutes les données proviennent de PouchDB local**, pas d'appels API
- Le sync avec CouchDB se fait en arrière-plan

---

## Migration depuis l'ancienne API

| Aspect | Avant (API) | Après (PouchDB) |
|--------|-------------|-----------------|
| Source données | `GET /api/factures`, `/api/relances`, etc. | PouchDB local avec sync |
| Latence initiale | ~1-2s (plusieurs appels API) | ~100-500ms (lecture locale) |
| Offline | ❌ Impossible | ✅ Fonctionne offline |
| Mise à jour temps réel | Polling/WebSocket | `db.changes()` automatique |
| Top débiteurs | Calcul backend | Calcul frontend depuis PouchDB |
