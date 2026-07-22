---
id: relances-a-valider-list
type: frontend
folder: specs/workflows/frontend/relances/
description: Afficher la liste des relances en attente de validation depuis PouchDB
depends_on: [auth-check]
screen: relances-validation
global: false
mockup_entry: specs/mockups/relances-validation.html
---

# relances-a-valider-list : Liste des relances à valider (PouchDB)

## Description

Afficher toutes les relances en statut "à valider" nécessitant une action manuelle avant programmation ou envoi. Les données sont chargées depuis PouchDB local.

## Étapes

```javascript
/**
 * @action Initialiser PouchDB et configurer le sync
 * @checkpoint pouchdb-initialized, bases locales prêtes
 * 
 * Code:
 * this.db = new PouchDB('marki-relances');
 * this.dbContacts = new PouchDB('marki-contacts');
 * this.db.sync(remoteUrl, { live: true, retry: true });
 */

/**
 * @action Initialiser le filtre sur statut='a_valider'
 * @checkpoint filter-initialized, paramètre statut défini
 */

/**
 * @action Afficher le skeleton loader
 * @checkpoint skeleton-shown, état de chargement visible
 */

/**
 * @action Récupérer les relances depuis PouchDB et filtrer par statut
 * @checkpoint relances-fetched, liste des relances à valider reçue
 * 
 * **Query PouchDB** :
 * const result = await db.allDocs({
 *   startkey: 'relance:',
 *   endkey: 'relance:\ufff0',
 *   include_docs: true
 * });
 * const relances = result.rows
 *   .map(r => r.doc)
 *   .filter(r => r.statut === 'a_valider')
 *   .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
 */

/**
 * @action Récupérer les payeurs associés depuis PouchDB
 * @checkpoint payers-fetched, mapping payeur_id => nom établi
 * 
 * **Query PouchDB** :
 * const result = await dbContacts.allDocs({
 *   startkey: 'contact:',
 *   endkey: 'contact:\ufff0',
 *   include_docs: true
 * });
 * const payeursMap = new Map(result.rows.map(r => [r.doc._id, r.doc]));
 */

/**
 * @action Configurer le listener pour les changements temps réel
 * @checkpoint changes-listener-active, mises à jour automatiques
 * 
 * Code:
 * db.changes({ since: 'now', live: true, include_docs: true })
 *   .on('change', (change) => { 
 *     if (change.doc.statut === 'a_valider') this.updateRelanceAValider(change.doc);
 *   });
 */

/**
 * @action Calculer les statistiques (total à valider, montant global)
 * @checkpoint stats-calculated, indicateurs visuels calculés
 */

/**
 * @action Afficher l'en-tête avec badge du nombre à valider
 * @checkpoint header-rendered, titre "Relances à valider (N)" visible
 */

/**
 * @action Afficher la liste des relances en attente
 * @checkpoint list-rendered, tableau avec toutes les relances visibles
 */

/**
 * @action Colorer les lignes selon l'ancienneté
 * @checkpoint aging-colors-applied, 
 * - > 7 jours: rouge
 * - > 3 jours: orange
 * - <= 3 jours: normal
 */

/**
 * @action Afficher le détail des impayés liés à chaque relance depuis PouchDB
 * @checkpoint impayes-preview-rendered, aperçu des factures visible
 */

/**
 * @action Activer les boutons d'action rapide
 * @checkpoint quick-actions-enabled, 
 * - Valider en 1 clic
 * - Voir détails
 * - Modifier
 * - Refuser
 */

/**
 * @action Activer la sélection multiple pour actions en lot
 * @checkpoint bulk-selection-enabled, checkboxes et actions groupées disponibles
 */

/**
 * @action Afficher les actions groupées (valider X relances)
 * @checkpoint bulk-actions-shown, boutons apparaissent si sélection > 0
 */
```

## PouchDB Operations

### Chargement des relances à valider

```javascript
async loadRelancesAValider() {
  this.loading = true;
  
  try {
    // 1. Récupérer les relances
    const result = await db.allDocs({
      startkey: 'relance:',
      endkey: 'relance:\ufff0',
      include_docs: true
    });
    
    // 2. Filtrer par statut 'a_valider'
    this.relancesAValider = result.rows
      .map(r => r.doc)
      .filter(r => r.statut === 'a_valider')
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    // 3. Récupérer les payeurs
    const contactsResult = await dbContacts.allDocs({
      startkey: 'contact:',
      endkey: 'contact:\ufff0',
      include_docs: true
    });
    
    this.payeursMap = new Map(
      contactsResult.rows.map(r => [r.doc._id, r.doc])
    );
    
    // 4. Calculer les stats
    this.calculateStats();
    
  } catch (error) {
    console.error('Erreur chargement relances à valider:', error);
    this.error = error.message;
  } finally {
    this.loading = false;
  }
}

calculateStats() {
  const relances = this.relancesAValider;
  
  this.stats = {
    total: relances.length,
    montantTotal: relances.reduce((sum, r) => sum + (r.montant_total || 0), 0),
    parAnciennete: {
      critique: relances.filter(r => this.getDaysSince(r.created_at) > 7).length,
      warning: relances.filter(r => {
        const days = this.getDaysSince(r.created_at);
        return days > 3 && days <= 7;
      }).length,
      normal: relances.filter(r => this.getDaysSince(r.created_at) <= 3).length
    }
  };
}

getDaysSince(dateStr) {
  const date = new Date(dateStr);
  const today = new Date();
  return Math.floor((today - date) / (1000 * 60 * 60 * 24));
}

getAncienneteClass(relance) {
  const days = this.getDaysSince(relance.created_at);
  if (days > 7) return 'critical';
  if (days > 3) return 'warning';
  return 'normal';
}
```

### Live Sync (temps réel)

```javascript
// Écouter les changements sur les relances
db.changes({
  since: 'now',
  live: true,
  include_docs: true
}).on('change', (change) => {
  if (change.doc.type === 'relance') {
    const index = this.relancesAValider.findIndex(r => r._id === change.doc._id);
    
    if (change.doc.statut === 'a_valider') {
      if (index >= 0) {
        // Mise à jour
        this.relancesAValider[index] = change.doc;
      } else {
        // Nouvelle relance à valider
        this.relancesAValider.unshift(change.doc);
      }
    } else {
      // Retirer si plus en statut 'a_valider'
      if (index >= 0) {
        this.relancesAValider.splice(index, 1);
      }
    }
    
    this.calculateStats();
  }
}).on('error', (err) => {
  console.error('Erreur sync relances:', err);
});
```

## Colonnes affichées

| Colonne | Source | Description |
|---------|--------|-------------|
| Sélection | - | Checkbox pour actions groupées |
| Date création | relance.created_at | Triable |
| Payeur | payeursMap.get(relance.contact_id).nom | Nom du payeur |
| Montant | relance.montant_total | Total TTC |
| Nb impayés | relance.impaye_ids.length | Nombre de factures |
| Séquence | relance.sequence_id | Séquence de relance |
| Échéance | min(impayes.date_echeance) | Date échéance la plus ancienne |
| Ancienneté | calcul | Jours depuis création |
| Actions | - | Valider / Voir / Modifier |

## Actions individuelles

| Action | Description |
|--------|-------------|
| ✅ Valider | Passe en statut 'programmée' |
| 👁️ Voir | Ouvre la prévisualisation |
| ✏️ Modifier | Ouvre le modal d'édition |
| ❌ Refuser | Annule la relance (avec motif) |

## Actions groupées

| Action | Description |
|--------|-------------|
| Valider la sélection | Valide toutes les relances cochées |
| Refuser la sélection | Annule toutes les relances cochées |
| Exporter la liste | Génère un CSV des relances affichées |

## Mockups de référence

- `specs/mockups/relances-validation.html` (liste à valider)

---

## Migration depuis l'ancienne API

| Aspect | Avant (API) | Après (PouchDB) |
|--------|-------------|-----------------|
| Relances à valider | `GET /api/relances?statut=a_valider` | `db.allDocs()` + filtrage côté client |
| Payeurs | `GET /api/payers` | `dbContacts.allDocs()` |
| Impayés liés | `GET /api/impayes?relance_id=:id` | Chargement à la volée si besoin |
| Mises à jour temps réel | Polling | `db.changes()` |
| Calcul stats | Backend | Côté client |
| Latence | ~200-500ms | ~30-50ms (local) |
| Offline | ❌ Impossible | ✅ Fonctionne offline |
