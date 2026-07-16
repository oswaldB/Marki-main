---
id: dashboard-initial-load
type: frontend
folder: specs/workflows/frontend/dashboard/
description: Charger les KPIs (calcul frontend), graphiques, top débiteurs et événements récents
depends_on: [auth-check]
screen: dashboard
global: false
mockup_entry: specs/mockups/dashboard.html
---
+> il faut aussi ici que la dernière synchronisation soit loadé. C'est un event. donc il faut le request en CRUD dans la table event de la base.
# dashboard-initial-load : Chargement initial Dashboard

## Description

Charger toutes les données du dashboard : KPIs calculés côté frontend, graphiques d'évolution, top débiteurs et événements récents.

## Étapes

```javascript
/**
 * @action Afficher le spinner de chargement global
 * @checkpoint loading-shown, état loading=true visible
 */

/**
 * @action Récupérer les impayés via GET /api/impayes?facture_soldee=0&statut=impaye
 * @checkpoint impayes-fetched, liste des impayés reçue
 */

/**
 * @action Récupérer les relances via GET /api/relancesdate=today
 * @checkpoint relances-fetched, relances du jour reçues
 */

/**
 * @action Récupérer les événements via GET /api/events?limit=10
 * @checkpoint events-fetched, événements récents reçus
 */

/**
 * @action Récupérer le dernier event de synchronisation via GET /api/events?type=sync&limit=1
 * @checkpoint last-sync-fetched, date de dernière synchro récupérée pour affichage dans le header
 */

/**
 * @action Récupérer les nouvelles factures via GET /api/impayes?facture_soldee=0&statut=impaye
 * @checkpoint new-invoices-fetched, factures depuis dernière synchro reçues
 */

/**
 * @action Calculer les KPIs côté frontend
 * @checkpoint kpis-calculated, tous les KPIs calculés (voir tableau ci-dessous)
 */

/**
 * @action Calculer les données du graphique côté frontend
 * @checkpoint chart-data-calculated, données 12 mois calculées depuis les impayés
 */

/**
 * @action Initialiser le graphique avec Chart.js
 * @checkpoint chart-rendered, canvas du graphique affiché avec données
 */

/**
 * @action Calculer le top débiteurs côté frontend
 * @checkpoint top-debiteurs-calculated, tri par montant décroissant
 */

/**
 * @action Masquer le spinner et afficher le contenu complet
 * @checkpoint loading-complete, dashboard entièrement rendu
 */
```

## Calcul des KPIs (Frontend)

Les KPIs sont calculés à partir des données brutes :

| KPI | Source | Calcul |
|-----|--------|--------|
| Factures en attente | `impayes` | Count où `reste_a_payer > 0` |
| Impayés actifs | `impayes` | Count où `statut = 'actif'` et `reste_a_payer > 0` |
| Montant total | `impayes` | `sum(impayes.map(i => i.reste_a_payer))` |
| Relances du jour | `relances` | Count où `date_envoi = aujourd'hui` |
| Taux recouvrement | `impayes` | `montant_recouvre / montant_total * 100` |

### KPIs Ancienneté (par tranche)

| Tranche | Calcul |
|---------|--------|
| Moins de 7 jours | `daysSince(date_echeance) < 7` |
| 8 à 30 jours | `daysSince(date_echeance) >= 8 && <= 30` |
| 31 à 60 jours | `daysSince(date_echeance) >= 31 && <= 60` |
| 60 à 120 jours | `daysSince(date_echeance) >= 60 && <= 120` |
| Plus de 120 jours | `daysSince(date_echeance) > 120` |

## Données du graphique (Calcul Frontend)

Le graphique d'évolution est calculé côté frontend à partir des impayés :

**Structure calculée :**
```javascript
{
  labels: ['Avant', 'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc'],
  montantsPayes: [],      // Par mois : sum(montant_total - reste_a_payer)
  restesAPayer: [],      // Par mois : sum(reste_a_payer)
  facturesImpayees: []   // Par mois : count(impayés)
}
```

**Algorithme :**
1. Grouper les impayés par mois (basé sur `date_echeance` ou `date_facture`)
2. Pour chaque mois :
   - `montantsPayes` = somme des montants payés (`montant_total - reste_a_payer`)
   - `restesAPayer` = somme des restes à payer
   - `facturesImpayees` = nombre d'impayés actifs
3. Inclure le mois "Avant" pour les données antérieures à l'année en cours

## Top Débiteurs

Calcul côté frontend à partir des impayés :
1. Grouper par `payer_id`
2. Calculer : `montant_total`, `jours_retard_max`, `count_impayes`
3. Trier par `montant_total` décroissant
4. Limiter à 10 résultats

## API Calls

| Endpoint | Description |
|----------|-------------|
| `GET /api/impayes?facture_soldee=0&statut=impaye
| `GET /api/impayes?facture_soldee=0&statut=impaye
| `GET /api/relancesdate=today` | Relances envoyées aujourd'hui |
| `GET /api/events?limit=10` | Événements récents |

## Structure des données

### Impayé (backend SQLite)
```javascript
{
  id: string,
  payer_id: string,           // ID du contact payeur
  contact_relance_id: string, // ID du contact à relancer
  nfacture: string,
  date_echeance: string,
  montant_total: number,
  reste_a_payer: number,
  statut: 'unpaid' | 'paid' | 'cancelled',
  is_blacklisted: boolean,
  facture_soldee: boolean,
  apporteur_id: string,
  sequence_id: string
}
```

### Relance
```javascript
{
  id: string,
  contact_id: string,
  sequence_id: string,
  statut: 'pending' | 'sent' | 'failed',
  date_envoi: string
}
```

### Événement
```javascript
{
  id: string,
  type: 'sync' | 'payment' | 'relance' | 'alert' | 'import',
  icon: string,
  title: string,
  description: string,
  time: string
}
```

## Mockups de référence

- `specs/mockups/dashboard.html`
