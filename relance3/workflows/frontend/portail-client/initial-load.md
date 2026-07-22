---
id: portail-client-initial-load
type: frontend
folder: specs/workflows/frontend/portail-client/
description: Charger le dashboard client avec factures et paiement depuis PouchDB
depends_on: []
screen: portail-client
global: false
mockup_entry: specs/mockups/portail-client.html
---

# portail-client-initial-load : Chargement initial Portail Client (PouchDB)

## Description

Charger les informations du client, ses factures impayées et options de paiement pour le portail. Les données sont chargées depuis **PouchDB local** après vérification du token.

## Étapes

```javascript
/**
 * @action Extraire les paramètres depuis l'URL : contactId, sig (signature), expires
 * @checkpoint token-extracted, contactId, sig et expires récupérés de `/espace/{id}/impaye?sig=xxx&expires=xxx`
 */

/**
 * @action Afficher le spinner de chargement
 * @checkpoint loading-shown, overlay sur la page
 */

/**
 * @action Vérifier le token signé via GET /api/portail/verify?contactId=:id&sig=:sig&expires=:expires
 * @checkpoint token-validated, signature HMAC vérifiée et contact identifié
 * 
 * **Backend** : Vérifie la signature avec `verifyContactToken()` (voir workflow backend `generate-contact-token`)
 * - Vérifie que `expires` n'est pas dépassé (3 min par défaut)
 * - Recalcule la signature HMAC-SHA256 et compare avec `sig`
 * 
 * **Note** : Cet appel API est conservé pour la sécurité (vérification signature)
 */

/**
 * @action Afficher l'écran "Lien temporaire expiré" si token invalide
 * @checkpoint error-displayed, message expliquant d'utiliser le lien email pour en générer un nouveau
 * 
 * **UI** : Mockup `portail-client-dead-token.html`
 * Message : "Lien temporaire expiré. Merci d'utiliser celui reçu par email pour en générer un nouveau et voir vos documents."
 */

/**
 * @action Initialiser PouchDB et récupérer les factures du client
 * @checkpoint pouchdb-initialized, factures chargées depuis PouchDB local
 * 
 * **Query PouchDB** :
 * const result = await db.allDocs({
 *   startkey: 'facture:',
 *   endkey: 'facture:\ufff0',
 *   include_docs: true
 * });
 * 
 * const facturesClient = result.rows
 *   .map(row => row.doc)
 *   .filter(f => f.contact_id === contactId && f.facture_soldee === 0);
 */

/**
 * @action Configurer le listener pour les changements temps réel
 * @checkpoint changes-listener-active, mises à jour automatiques des factures
 * 
 * Code:
 * db.changes({ since: 'now', live: true, include_docs: true })
 *   .on('change', (change) => {
 *     if (change.doc.contact_id === contactId) {
 *       this.updateFacture(change.doc);
 *     }
 *   });
 */

/**
 * @action Calculer le solde total et le nombre de factures impayées
 * @checkpoint totals-calculated, montants agrégés calculés côté client
 */

/**
 * @action Stocker les données dans le store page
 * @checkpoint data-stored, client et factures disponibles
 */

/**
 * @action Afficher le dashboard client avec boutons de paiement
 * @checkpoint content-rendered, interface de paiement fonctionnelle
 */
```

## PouchDB Operations

### Chargement des factures client

```javascript
async loadClientFactures(contactId) {
  this.loading = true;
  
  try {
    // Récupérer toutes les factures depuis PouchDB
    const result = await db.allDocs({
      startkey: 'facture:',
      endkey: 'facture:\ufff0',
      include_docs: true
    });
    
    // Filtrer côté client par contact_id et statut impayé
    this.factures = result.rows
      .map(row => row.doc)
      .filter(f => 
        f.contact_id === contactId && 
        f.facture_soldee === 0 &&
        f.statut === 'impaye'
      )
      .sort((a, b) => new Date(b.date_echeance) - new Date(a.date_echeance));
    
    // Calculer les totaux côté client
    this.totalImpaye = this.factures.reduce((sum, f) => sum + (f.reste_a_payer || 0), 0);
    this.nombreFactures = this.factures.length;
    
  } catch (error) {
    console.error('Erreur chargement factures:', error);
    this.error = error.message;
  } finally {
    this.loading = false;
  }
}
```

### Live Sync (temps réel)

```javascript
// Écouter les changements sur les factures du client
db.changes({
  since: 'now',
  live: true,
  include_docs: true
}).on('change', (change) => {
  if (change.doc.type === 'facture' && change.doc.contact_id === this.contactId) {
    if (change.doc.facture_soldee === 0) {
      // Ajouter ou mettre à jour
      const index = this.factures.findIndex(f => f._id === change.doc._id);
      if (index >= 0) {
        this.factures[index] = change.doc;
      } else {
        this.factures.unshift(change.doc);
      }
    } else {
      // Retirer si soldée
      this.factures = this.factures.filter(f => f._id !== change.doc._id);
    }
    
    // Recalculer les totaux
    this.totalImpaye = this.factures.reduce((sum, f) => sum + (f.reste_a_payer || 0), 0);
    this.nombreFactures = this.factures.length;
  }
});
```

## Mockups de référence

- `specs/mockups/portail-client.html` - Écran principal du portail client
- `specs/mockups/portail-client-dead-token.html` - Écran lien temporaire expiré (token invalide)

## API Calls

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/portail/verify?contactId=:id&sig=:sig&expires=:expires` | **Conservé** - Vérification sécurisée du token signé |

---

## Migration depuis l'ancienne API

| Aspect | Avant (API) | Après (PouchDB) |
|--------|-------------|-----------------|
| Vérification token | `/api/portail/verify` | **Conservé** - Sécurité requise |
| Chargement factures | `GET /api/impayes?facture_soldee=0&contact_id=xxx` | `db.allDocs()` + filtrage côté client |
| Calcul totaux | Backend | Côté client avec `reduce()` |
| Mises à jour | Polling API | `db.changes()` temps réel |
| Latence | ~300-800ms | ~10-50ms (local) |
| Offline | ❌ Impossible | ✅ Consultation offline possible |

## Notes

- **Token de vérification** : L'appel à `/api/portail/verify` est **conservé** car il implique une vérification de signature HMAC côté serveur (sécurité)
- **Données factures** : Une fois le token validé, les factures sont chargées depuis PouchDB local
- **Sync temps réel** : Les modifications (paiement, mise à jour) sont synchronisées automatiquement
- **Portail public** : Le portail client est accessible via lien signé sans authentification classique
