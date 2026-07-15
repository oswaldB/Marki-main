---
id: contacts-initial-load
type: frontend
folder: specs/workflows/frontend/contacts/
description: Charger la liste complète des contacts avec stats et filtres
depends_on: [auth-check]
screen: contacts
global: false
mockup_entry: specs/mockups/contacts.html
---

# contacts-initial-load : Chargement initial Liste Contacts

## Description

Charger la liste complète des contacts avec leurs informations, statistiques et états (blacklist, sans email).

## Étapes

```javascript
/**
 * @action Initialiser les filtres par défaut (type='all')
 * @checkpoint state-initialized, filtres et pagination prêts
 */

/**
 * @action Afficher le skeleton loader
 * @checkpoint skeleton-shown, tableau en chargement
 */

/**
 * @action Récupérer les contacts via GET /api/contacts?statut=actif&limit=50
 * @checkpoint contacts-fetched, liste des contacts reçue
 * @api GET /api/contacts?statut=actif&limit=50
 * @response { contacts: [...], total: 1250, limit: 50, offset: 0 }
 */

/**
 * @action Récupérer les statistiques globales via GET /api/dashboard/stats
 * @checkpoint stats-fetched, totaux reçus
 * @api GET /api/dashboard/stats
 * @response { stats: { total_impayes, contacts_blacklistes, ... } }
 */

/**
 * @action Stocker les données dans Alpine.store('contacts')
 * @checkpoint data-stored, contacts et stats disponibles
 */

/**
 * @action Rendre le tableau avec colonnes triables
 * @checkpoint table-rendered, contacts affichés avec badges statut
 */

/**
 * @action Activer les boutons d'action (édition, blacklist, export)
 * @checkpoint actions-enabled, contrôles fonctionnels
 */
```

## API Calls

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/contacts?statut=actif&is_blacklisted=0&limit=50&offset=0` | Liste des contacts actifs |
| GET | `/api/dashboard/stats` | Statistiques globales |

## Paramètres de requête

| Paramètre | Type | Défaut | Description |
|-----------|------|--------|-------------|
| `statut` | string | - | Filtrer par statut (`actif`, `inactif`) |
| `is_blacklisted` | integer | - | Filtrer blacklist (0 ou 1) |
| `type_personne` | string | - | Filtrer par type (`P`, `M`) |
| `limit` | integer | 50 | Nombre de résultats par page |
| `offset` | integer | 0 | Décalage pour pagination |

## Mockups de référence

- `specs/mockups/contacts.html`

## Logs (console.log) - OBLIGATOIRE

Chaque étape du workflow doit être loguée avec `console.log()`:

| Checkpoint | Instruction console.log |
|------------|------------------------|
| `workflow-start` | `console.log('[WORKFLOW.contacts-initial-load] START: Début chargement liste contacts')` |
| `loading-shown` | `console.log('[WORKFLOW.contacts-initial-load] START: Affichage skeleton loader tableau')` |
| `auth-verified` | `console.log('[WORKFLOW.contacts-initial-load] STEP: Token auth vérifié')` |
| `state-initialized` | `console.log('[WORKFLOW.contacts-initial-load] STEP: Filtres initialisés (type=all, limit=50, offset=0)')` |
| `contacts-fetch-start` | `console.log('[WORKFLOW.contacts-initial-load] STEP: Appel API GET /api/contacts?statut=actif&is_blacklisted=0&limit=50&offset=0')` |
| `contacts-fetched` | `console.log('[WORKFLOW.contacts-initial-load] DATA: Contacts reçus:', {count: contacts.length, total: total})` |
| `stats-fetch-start` | `console.log('[WORKFLOW.contacts-initial-load] STEP: Appel API GET /api/dashboard/stats')` |
| `stats-fetched` | `console.log('[WORKFLOW.contacts-initial-load] DATA: Stats reçues:', {total_impayes, contacts_blacklistes, sans_email})` |
| `data-stored` | `console.log('[WORKFLOW.contacts-initial-load] SUCCESS: Données stockées dans Alpine.store(contacts)')` |
| `filter-applied` | `console.log('[WORKFLOW.contacts-initial-load] STEP: Filtre actif appliqué (type/statut/blacklist)')` |
| `sort-applied` | `console.log('[WORKFLOW.contacts-initial-load] STEP: Tri appliqué sur colonne:', sortKey, sortDir)` |
| `table-rendered` | `console.log('[WORKFLOW.contacts-initial-load] SUCCESS: Tableau rendu avec colonnes triables')` |
| `badges-rendered` | `console.log('[WORKFLOW.contacts-initial-load] DATA: Badges statut affichés (blacklist/sans-email)')` |
| `pagination-ready` | `console.log('[WORKFLOW.contacts-initial-load] SUCCESS: Pagination prête:', {page: 1, pages: Math.ceil(total/50)})` |
| `actions-enabled` | `console.log('[WORKFLOW.contacts-initial-load] SUCCESS: Boutons action activés (édition/blacklist/export)')` |
| `loading-complete` | `console.log('[WORKFLOW.contacts-initial-load] END: Chargement contacts terminé en', duree, 'ms')` |
| `error` | `console.error('[WORKFLOW.contacts-initial-load] ERROR:', error)` |
