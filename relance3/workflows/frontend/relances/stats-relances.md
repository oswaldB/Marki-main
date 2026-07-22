---
id: relances-stats
type: frontend
folder: specs/workflows/frontend/relances/
description: Afficher les statistiques et KPI des relances depuis PouchDB
depends_on: [auth-check]
screen: dashboard
global: false
mockup_entry: specs/mockups/dashboard.html
---

# relances-stats : Statistiques des relances (PouchDB)

## Description

Afficher un tableau de bord avec les statistiques clés des relances : taux d'envoi, réponses, efficacité, et tendances temporelles. Les données sont chargées depuis PouchDB local et les calculs sont effectués côté client.

## Étapes

```javascript
/**
 * @action Initialiser PouchDB et configurer le sync
 * @checkpoint pouchdb-initialized, bases locales prêtes
 * 
 * Code:
 * this.db = new PouchDB('marki-relances');
 * this.dbEvents = new PouchDB('marki-events');
 * this.db.sync(remoteUrl, { live: true, retry: true });
 */

/**
 * @action Initialiser la période d'analyse (défaut: 30 derniers jours)
 * @checkpoint period-initialized, date_from et date_to définis
 */

/**
 * @action Afficher le skeleton loader des graphiques
 * @checkpoint skeleton-shown, placeholders de graphiques visibles
 */

/**
 * @action Récupérer toutes les relances depuis PouchDB
 * @checkpoint relances-fetched, données brutes reçues
 * 
 * **Query PouchDB** :
 * const result = await db.allDocs({
 *   startkey: 'relance:',
 *   endkey: 'relance:\ufff0',
 *   include_docs: true
 * });
 * const relances = result.rows.map(r => r.doc);
 */

/**
 * @action Récupérer les événements de suivi depuis PouchDB
 * @checkpoint events-fetched, ouvertures emails et clics reçus
 * 
 * **Query PouchDB** :
 * const result = await dbEvents.allDocs({
 *   startkey: 'event:',
 *   endkey: 'event:\ufff0',
 *   include_docs: true
 * });
 * const events = result.rows
 *   .map(r => r.doc)
 *   .filter(e => e.event_type === 'suivi_relance');
 */

/**
 * @action Configurer le listener pour les changements temps réel
 * @checkpoint changes-listener-active, stats mises à jour automatiquement
 * 
 * Code:
 * db.changes({ since: 'now', live: true, include_docs: true })
 *   .on('change', () => { this.calculateKPIs(); });
 */

/**
 * @action Calculer les KPIs agrégés côté client
 * @checkpoint kpis-calculated, indicateurs calculés
 * 
 * Indicateurs calculés :
 * - total_relances (créées dans la période)
 * - relances_envoyees (statut = 'envoyee')
 * - taux_envoi (envoyees / total)
 * - emails_ouverts (nombre d'emails ouverts)
 * - taux_ouverture (ouverts / envoyees)
 * - liens_cliques (clics sur lien paiement)
 * - taux_clic (cliques / envoyees)
 * - montant_recouvre (paiements reçus)
 * - delai_moyen_paiement (jours entre relance et paiement)
 */

/**
 * @action Calculer les données pour les graphiques temporels
 * @checkpoint chart-data-calculated, données par jour/semaine/mois
 * 
 * Grouper par période (jour si <= 30j, semaine si <= 90j, mois sinon)
 * - relances créées
 * - relances envoyées
 * - taux de réponse
 */

/**
 * @action Afficher les cartes de KPIs
 * @checkpoint kpis-rendered, 4-6 indicateurs clés visibles
 */

/**
 * @action Afficher le graphique d'évolution temporelle
 * @checkpoint evolution-chart-rendered, courbe ou barres visibles
 */

/**
 * @action Afficher le graphique de répartition par statut
 * @checkpoint status-chart-rendered, camembert ou barres empilées
 */

/**
 * @action Afficher le top 10 des payeurs relancés
 * @checkpoint top-payeurs-rendered, tableau avec montants visibles
 */

/**
 * @action Afficher les statistiques par séquence
 * @checkpoint sequences-stats-rendered, efficacité comparée par séquence
 */

/**
 * @action Activer les filtres de période
 * @checkpoint period-filters-enabled, selecteurs de dates actifs
 */

/**
 * @action Activer le bouton d'export des statistiques
 * @checkpoint export-enabled, téléchargement PDF/Excel disponible
 */
```

## PouchDB Operations

### Chargement des données pour les stats

```javascript
async loadStatsData(dateFrom, dateTo) {
  this.loading = true;
  
  try {
    // 1. Relances dans la période
    const relancesResult = await db.allDocs({
      startkey: 'relance:',
      endkey: 'relance:\ufff0',
      include_docs: true
    });
    
    this.relances = relancesResult.rows
      .map(r => r.doc)
      .filter(r => {
        const date = new Date(r.created_at);
        return date >= dateFrom && date <= dateTo;
      });
    
    // 2. Événements de suivi
    const eventsResult = await dbEvents.allDocs({
      startkey: 'event:',
      endkey: 'event:\ufff0',
      include_docs: true
    });
    
    this.suiviEvents = eventsResult.rows
      .map(r => r.doc)
      .filter(e => 
        e.event_type === 'suivi_relance' ||
        e.event_type === 'email_opened' ||
        e.event_type === 'link_clicked'
      );
    
    // 3. Calculer les KPIs
    this.calculateKPIs();
    
  } catch (error) {
    console.error('Erreur chargement stats:', error);
    this.error = error.message;
  } finally {
    this.loading = false;
  }
}
```

### Calcul des KPIs

```javascript
calculateKPIs() {
  const relances = this.relances;
  const events = this.suiviEvents;
  
  // Totaux
  const total = relances.length;
  const envoyees = relances.filter(r => r.statut === 'envoyee').length;
  
  // Événements
  const emailsOuverts = events.filter(e => e.event_type === 'email_opened').length;
  const liensClics = events.filter(e => e.event_type === 'link_clicked').length;
  
  // Montants
  const montantRelance = relances.reduce((sum, r) => sum + (r.montant_total || 0), 0);
  
  this.kpis = {
    totalRelances: total,
    relancesEnvoyees: envoyees,
    tauxEnvoi: total > 0 ? Math.round((envoyees / total) * 100) : 0,
    emailsOuverts: emailsOuverts,
    tauxOuverture: envoyees > 0 ? Math.round((emailsOuverts / envoyees) * 100) : 0,
    liensClics: liensClics,
    tauxClic: envoyees > 0 ? Math.round((liensClics / envoyees) * 100) : 0,
    montantRelance: montantRelance,
    montantRecouvre: this.calculateRecouvrement(),
    delaiMoyenPaiement: this.calculateDelaiMoyen()
  };
  
  // Données pour les graphiques
  this.prepareChartData();
}

prepareChartData() {
  // Grouper par jour
  const parJour = new Map();
  
  for (const r of this.relances) {
    const jour = r.created_at.split('T')[0];
    if (!parJour.has(jour)) {
      parJour.set(jour, { crees: 0, envoyees: 0 });
    }
    const data = parJour.get(jour);
    data.crees++;
    if (r.statut === 'envoyee') data.envoyees++;
  }
  
  this.chartData = Array.from(parJour.entries())
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => new Date(a.date) - new Date(b.date));
}

// Top 10 payeurs
calculateTopPayeurs() {
  const payeurStats = new Map();
  
  for (const r of this.relances) {
    if (!payeurStats.has(r.contact_id)) {
      payeurStats.set(r.contact_id, {
        relances: 0,
        montant: 0
      });
    }
    const stats = payeurStats.get(r.contact_id);
    stats.relances++;
    stats.montant += r.montant_total || 0;
  }
  
  this.topPayeurs = Array.from(payeurStats.entries())
    .map(([id, stats]) => ({ id, ...stats }))
    .sort((a, b) => b.montant - a.montant)
    .slice(0, 10);
}
```

### Live Sync (temps réel)

```javascript
// Recalculer automatiquement quand les données changent
db.changes({
  since: 'now',
  live: true,
  include_docs: true
}).on('change', () => {
  this.calculateKPIs();
});

dbEvents.changes({
  since: 'now',
  live: true,
  include_docs: true
}).on('change', () => {
  this.calculateKPIs();
});
```

## API Calls

**Aucun appel API** - Toutes les données sont récupérées depuis PouchDB et les calculs sont effectués côté client.

## KPIs affichés

| KPI | Formule | Format |
|-----|---------|--------|
| Total relances | COUNT(relances) | Nombre |
| Taux d'envoi | envoyées / total × 100 | Pourcentage |
| Taux d'ouverture | ouverts / envoyées × 100 | Pourcentage |
| Taux de clic | cliqués / envoyées × 100 | Pourcentage |
| Montant relancé | SUM(montant_total) | Monétaire |
| Montant recouvré | SUM(paiements reçus post-relance) | Monétaire |
| Taux de recouvrement | recouvré / relancé × 100 | Pourcentage |
| Délai moyen de paiement | AVG(jours entre relance et paiement) | Jours |

## Graphiques

| Graphique | Type | Données |
|-----------|------|---------|
| Évolution | Courbe | Relances créées/envoyées dans le temps |
| Répartition | Camembert | Répartition par statut |
| Efficacité | Barres | Taux de réponse par séquence |
| Heatmap | Calendrier | Jours avec le plus d'envois |

## Filtres disponibles

| Filtre | Type | Description |
|--------|------|-------------|
| Période | prédéfinie | 7j, 30j, 90j, 12mois, personnalisé |
| Séquence | select | Filtrer par séquence de relance |
| Statut | multi-select | Statuts à inclure |

## Mockups de référence

- `specs/mockups/dashboard.html` (vue statistiques relances)

---

## Migration depuis l'ancienne API

| Aspect | Avant (API) | Après (PouchDB) |
|--------|-------------|-----------------|
| Relances | `GET /api/relances` | `db.allDocs()` |
| Événements | `GET /api/events` | `dbEvents.allDocs()` |
| Calcul KPIs | Backend SQL | Côté client JavaScript |
| Agrégation | Backend | `Array.reduce()` côté client |
| Grouper par période | SQL GROUP BY | `Map()` côté client |
| Top payeurs | SQL ORDER BY LIMIT | `Array.sort().slice()` côté client |
| Mises à jour temps réel | Polling | `db.changes()` |
| Latence | ~500-1000ms | ~100-200ms (local) |
| Offline | ❌ Impossible | ✅ Stats calculables offline |
