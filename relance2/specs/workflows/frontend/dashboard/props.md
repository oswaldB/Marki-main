---
id: dashboard-props
type: documentation
folder: specs/workflows/frontend/dashboard/
description: Référence complète des propriétés Alpine.js, données API et états locaux du Dashboard
screen: dashboard
---

# Props & State - Dashboard

Ce document liste toutes les propriétés nécessaires au fonctionnement du Dashboard (Alpine.js, LocalStorage, API).

---

## 📊 État Global (Alpine.js)

### `dashboardPage()` - Objet principal

| Propriété | Type | Description | Workflow associé |
|-----------|------|-------------|------------------|
| `loading` | `boolean` | État de chargement global | initial-load |
| `error` | `string \| null` | Message d'erreur éventuel | initial-load, sync-data |
| `syncing` | `boolean` | État de synchronisation en cours | sync-data |
| `lastSyncTime` | `string` | Heure de dernière synchro formatée | initial-load, sync-data |
| `chart` | `Chart \| null` | Instance Chart.js | chart-evolution-impayes |

---

## 📈 KPIs Cards (Row 1)

### `kpis` - Object contenant tous les KPIs

| Propriété | Type | Description | Source calcul |
|-----------|------|-------------|---------------|
| `kpis.facturesEnAttente` | `number` | Nombre de factures avec reste à payer > 0 | kpi-factures-en-attente |
| `kpis.impayesActifs` | `number` | Nombre de factures échues (date dépassée) | kpi-impayes-actifs |
| `kpis.montantTotal` | `number` | Montant HT total des factures en attente | kpi-montant-total |
| `kpis.relancesJour` | `number` | Relances envoyées aujourd'hui | kpi-relances-jour |
| `kpis.tauxRecouvrement` | `number` | Taux de recouvrement (%) sur 90j | kpi-taux-recouvrement |

---

## 📅 KPIs Ancienneté (Row 2)

### `kpis.anciennete` - Répartition par tranche

| Propriété | Type | Description | Source |
|-----------|------|-------------|--------|
| `kpis.anciennete.moins7j` | `number` | Count factures 0-6 jours échus | kpi-anciennete-tranches |
| `kpis.anciennete.moins7jMontant` | `number` | Montant total tranche <7j | kpi-anciennete-tranches |
| `kpis.anciennete.j8a30` | `number` | Count factures 8-30 jours | kpi-anciennete-tranches |
| `kpis.anciennete.j8a30Montant` | `number` | Montant total tranche 8-30j | kpi-anciennete-tranches |
| `kpis.anciennete.j31a60` | `number` | Count factures 31-60 jours | kpi-anciennete-tranches |
| `kpis.anciennete.j31a60Montant` | `number` | Montant total tranche 31-60j | kpi-anciennete-tranches |
| `kpis.anciennete.j60a120` | `number` | Count factures 60-120 jours | kpi-anciennete-tranches |
| `kpis.anciennete.j60a120Montant` | `number` | Montant total tranche 60-120j | kpi-anciennete-tranches |
| `kpis.anciennete.plus120j` | `number` | Count factures >120 jours | kpi-anciennete-tranches |
| `kpis.anciennete.plus120jMontant` | `number` | Montant total tranche >120j | kpi-anciennete-tranches |

---

## 📉 Graphique Évolution

### `chartData` - Données pour Chart.js

| Propriété | Type | Description | Format |
|-----------|------|-------------|--------|
| `chartData.labels` | `string[]` | Labels des 13 périodes | `["Avant", "Jan", "Fév", ...]` |
| `chartData.montantsPayes` | `number[]` | Montants payés par mois | `[45000, 52000, ...]` |
| `chartData.restesAPayer` | `number[]` | Restes à payer par mois | `[28000, 32000, ...]` |
| `chartData.facturesImpayees` | `number[]` | Nb factures impayées par mois | `[12, 15, ...]` |

---

## 👥 Top Débiteurs

### `topDebtors` - Tableau des principaux débiteurs

| Propriété | Type | Description | Exemple |
|-----------|------|-------------|---------|
| `topDebtors[].id` | `string` | UUID du payeur | `"uuid-1"` |
| `topDebtors[].name` | `string` | Nom du client | `"ACME Corp"` |
| `topDebtors[].initials` | `string` | Initiales (2 chars) | `"AC"` |
| `topDebtors[].jours` | `number` | Jours de retard max | `87` |
| `topDebtors[].montant` | `number` | Montant total dû | `45230` |
| `topDebtors[].impayesCount` | `number` | Nombre d'impayés | `3` |

---

## 📋 Événements Récents

### `events` - Liste complète des événements

| Propriété | Type | Description | Exemple |
|-----------|------|-------------|---------|
| `events[].id` | `number` | ID unique | `1` |
| `events[].type` | `string` | Type d'événement | `"sync"`, `"payment"`, `"relance"`, `"alert"`, `"relance_cleaned"`, `"contact_blacklisted"`, `"payment_suspended"` |
| `events[].icon` | `string` | Classe FontAwesome | `"fa-sync-alt"` |
| `events[].title` | `string` | Titre affiché | `"Relance R2 envoyée"` |
| `events[].description` | `string` | Description | `"Relance niveau 2 envoyée à..."` |
| `events[].time` | `string` | Date formatée relative | `"Il y a 2 heures"` |
| `events[].created_at` | `string` | ISO datetime | `"2024-01-15T10:30:00Z"` |
| `events[].user_id` | `number \| null` | ID utilisateur | `123` ou `null` |
| `events[].user_username` | `string \| null` | Username | `"admin"` ou `null` |
| `events[].by_marki` | `boolean` | Action par Marki IA | `true` / `false` |

### `unreadCount` - Computed Property

| Propriété | Type | Description | Source |
|-----------|------|-------------|--------|
| `unreadCount` | `number` | Nombre d'événements non lus (pour le badge header) | Computed from `events.filter(e => !readEvents[e.id]).length` |

### `hasUnreadEvents` - Computed Property

| Propriété | Type | Description | Source |
|-----------|------|-------------|--------|
| `hasUnreadEvents` | `boolean` | Afficher/masquer le badge "non lus" | Computed from `unreadCount > 0` |

### `isEventRead(eventId)` - Méthode

| Propriété | Paramètre | Retour | Description |
|-----------|-----------|--------|-------------|
| `isEventRead(eventId)` | `string/number` | `boolean` | Vérifie si un event est marqué comme lu (pour les pastilles)

---

## 💾 LocalStorage

### Clé : `marki_read_events`

| Structure | Type | Description |
|-----------|------|-------------|
| `{ [eventId]: { read: boolean, readAt: string } }` | `object` | Map des events lus avec timestamp |

```javascript
// Exemple
{
  "1": { read: true, readAt: "2024-01-15T10:30:00Z" },
  "2": { read: true, readAt: "2024-01-15T10:35:00Z" }
}
```

---

## 🎨 UI State

### États d'affichage

| Propriété | Type | Description | Workflow |
|-----------|------|-------------|----------|
| `viewMode` | `"list" \| "card"` | Mode d'affichage top débiteurs | switch-view-list, switch-view-card |
| `open` (Smart Marki) | `boolean` | État d'ouverture du tiroir | - |
| `expanded.impayes` | `boolean` | Section Impayés expandée | initial-load |
| `expanded.relances` | `boolean` | Section Relances expandée | initial-load |
| `expanded.contacts` | `boolean` | Section Contacts expandée | initial-load |

---

## 🔗 Données API Brutes

### `/api/factures` - Response

| Champ | Type | Description |
|-------|------|-------------|
| `id` | `string` | UUID facture |
| `nfacture` | `string` | Numéro de facture |
| `date_facture` | `string` | Date ISO |
| `date_echeance` | `string` | Date ISO échéance |
| `montant_total` | `number` | Montant TTC |
| `montant_ht` | `number` | Montant HT |
| `reste_a_payer` | `number` | Solde restant |
| `statut` | `string` | `"unpaid"`, `"paid"`, `"cancelled"` |
| `payer_id` | `string` | UUID contact payeur |
| `contact_relance_id` | `string` | UUID contact à relancer |
| `is_blacklisted` | `boolean` | Contact blacklisté |
| `facture_soldee` | `boolean` | Facture soldée |

### `/api/relances` - Response

| Champ | Type | Description |
|-------|------|-------------|
| `id` | `string` | UUID relance |
| `contact_id` | `string` | UUID contact |
| `facture_id` | `string` | UUID facture |
| `niveau_relance` | `string` | `"R1"`, `"R2"`, `"R3"` |
| `date_envoi` | `string` | ISO datetime |
| `statut` | `string` | `"pending"`, `"sent"`, `"failed"` |
| `canal` | `string` | `"email"`, `"sms"`, `"courrier"` |

### `/api/events` - Response

| Champ | Type | Description |
|-------|------|-------------|
| `id` | `string` | UUID event |
| `type` | `string` | Type d'event |
| `title` | `string` | Titre |
| `description` | `string` | Description |
| `created_at` | `string` | ISO datetime |
| `user_id` | `number \| null` | ID user (NULL si by_marki) |
| `by_marki` | `boolean` | Action par Marki |

### `/api/users` (jointure)

| Champ | Type | Description |
|-------|------|-------------|
| `id` | `number` | ID user |
| `username` | `string` | Nom d'utilisateur |
| `email` | `string` | Email |

---

## 🧮 Méthodes/Computed

### Méthodes utilitaires

| Méthode | Paramètres | Retour | Description |
|---------|------------|--------|-------------|
| `formatMoney(amount)` | `number` | `string` | Format EUR ex: "12 500,00 €" |
| `isActive(page)` | `string` | `boolean` | Vérifie si page active |
| `isActiveSection(section)` | `string` | `boolean` | Vérifie si section active |
| `toggle(section)` | `string` | `void` | Toggle expansion section |
| `markAllAsRead()` | - | `void` | Marque tous events comme lus |
| `markEventAsRead(eventId)` | `string/number` | `void` | Marque un event comme lu |
| `isEventRead(eventId)` | `string/number` | `boolean` | Vérifie si un event est lu (pour pastilles) |
| `syncData()` | - | `Promise` | Lance synchronisation |
| `loadData()` | - | `Promise` | Charge données initiales |
| `initChart()` | - | `void` | Initialise Chart.js |

---

## 📝 Résumé par Workflow

| Workflow | Props modifiées | API utilisée |
|----------|-----------------|--------------|
| `initial-load` | `loading`, `error`, `kpis.*`, `chartData`, `topDebtors`, `events`, `lastSyncTime` | `/api/factures`, `/api/relances`, `/api/events` |
| `kpi-factures-en-attente` | `kpis.facturesEnAttente` | `/api/factures?reste_a_payer_gt=0` |
| `kpi-impayes-actifs` | `kpis.impayesActifs` | `/api/factures?date_echeance_lt=now` |
| `kpi-montant-total` | `kpis.montantTotal` | `/api/factures?reste_a_payer_gt=0` |
| `kpi-relances-jour` | `kpis.relancesJour` | `/api/relances?date_envoi=today` |
| `kpi-taux-recouvrement` | `kpis.tauxRecouvrement` | `/api/factures?date_echeance_gte=START` |
| `kpi-anciennete-tranches` | `kpis.anciennete.*` | `/api/factures?date_echeance_lt=now` |
| `chart-evolution-impayes` | `chartData`, `chart` | `/api/factures?date_facture_gte=START` |
| `events-manager` | `events`, `unreadCount`, `isEventRead()` | `/api/events`, localStorage |
| `sync-data` | `syncing`, `lastSyncTime` | POST + reload |
| `clear-events` | `events` | localStorage |
| `switch-view-list` | `viewMode` | - |
| `switch-view-card` | `viewMode` | - |

---

## ⚠️ Dépendances entre Props

```
initial-load
    ├── alimente → kpis.*
    ├── alimente → chartData
    ├── alimente → topDebtors
    ├── alimente → events
    └── alimente → lastSyncTime

kpi-* (si appelés séparément)
    └── utilisent les mêmes données API que initial-load
    └── nécessitent → rawData (factures, relances)

chart-evolution-impayes
    └── dépend de → chartData
    └── dépend de → chart (instance Chart.js)

events-manager
    ├── affiche → events[] (tous)
    ├── calcule → unreadCount (badge)
    ├── vérifie → isEventRead() (pastilles)
    └── dépend de → localStorage['marki_read_events']
```

---

## 🔄 Flux de données

```
[API] → [initial-load] → [state Alpine.js] → [UI HTML]
                            ↓
                     [kpi-* workflows]
                     (si modularisé)
                            ↓
                     [localStorage] (events lu/non-lu)
```
