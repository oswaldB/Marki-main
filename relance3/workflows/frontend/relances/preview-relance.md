---
id: relances-preview
type: frontend
folder: specs/workflows/frontend/relances/
description: Prévisualiser le rendu d'une relance avant envoi depuis PouchDB
depends_on: [relances-details]
screen: relances
global: false
mockup_entry: specs/mockups/relances.html
---

# relances-preview : Prévisualiser une relance (PouchDB)

## Description

Afficher un aperçu complet de la relance telle qu'elle sera envoyée au payeur, avec le template interprété et les variables remplacées. Les données sont chargées depuis PouchDB local.

## Étapes

```javascript
/**
 * @action Cliquer sur le bouton "Prévisualiser"
 * @checkpoint preview-clicked, intention de prévisualisation confirmée
 */

/**
 * @action Ouvrir le modal d'aperçu avec skeleton loader
 * @checkpoint modal-opened, overlay visible avec état de chargement
 */

/**
 * @action Récupérer les données de la relance depuis PouchDB
 * @checkpoint relance-fetched, données de la relance reçues
 * 
 * **Query PouchDB** :
 * const relance = await db.get('relance:' + relanceId);
 */

/**
 * @action Récupérer les données du payeur depuis PouchDB
 * @checkpoint payeur-fetched, nom, adresse, solde reçus
 * 
 * **Query PouchDB** :
 * const payeur = await dbContacts.get('contact:' + relance.contact_id);
 */

/**
 * @action Récupérer les impayés liés depuis PouchDB
 * @checkpoint impayes-fetched, factures liées reçues
 * 
 * **Query PouchDB** :
 * const result = await db.allDocs({
 *   keys: relance.impaye_ids,
 *   include_docs: true
 * });
 * const impayes = result.rows.map(r => r.doc);
 */

/**
 * @action Interpréter le template avec les variables réelles côté client
 * @checkpoint template-rendered, remplacement des {{variables}} effectué
 * 
 * Variables disponibles :
 * - {{payeur_nom}} - Nom du payeur
 * - {{montant_total}} - Montant total des impayés
 * - {{nombre_impayes}} - Nombre de factures impayées
 * - {{liste_impayes}} - Tableau HTML des impayés
 * - {{date_relance}} - Date du jour
 * - {{lien_paiement}} - Lien vers portail de paiement
 */

/**
 * @action Afficher l'objet de l'email
 * @checkpoint sujet-rendered, ligne objet visible
 */

/**
 * @action Afficher le rendu HTML de l'email
 * @checkpoint html-rendered, aperçu visuel dans iframe ou div
 * 
 * **Sécurité** : Le HTML est sanitizé pour éviter les XSS
 * Avant affichage, supprimer les scripts et styles dangereux
 */

/**
 * @action Afficher les informations du destinataire
 * @checkpoint destinataire-rendered, email et nom du payeur visibles
 */

/**
 * @action Afficher les pièces jointes (PDF factures si configuré)
 * @checkpoint attachments-shown, liste des PJ avec tailles visibles
 */

/**
 * @action Basculer entre vue HTML et vue texte brut
 * @checkpoint toggle-available, onglets ou switch HTML/Texte fonctionnel
 */

/**
 * @action Activer les boutons d'action depuis la prévisualisation
 * @checkpoint actions-enabled, boutons "Modifier" ou "Envoyer" actifs
 */
```

## PouchDB Operations

### Chargement des données pour prévisualisation

```javascript
async previewRelance(relanceId) {
  this.loading = true;
  
  try {
    // 1. Récupérer la relance
    const relance = await db.get('relance:' + relanceId);
    this.previewRelance = relance;
    
    // 2. Récupérer le payeur
    const payeur = await dbContacts.get('contact:' + relance.contact_id);
    this.previewPayeur = payeur;
    
    // 3. Récupérer les impayés liés
    if (relance.impaye_ids?.length) {
      const result = await db.allDocs({
        keys: relance.impaye_ids,
        include_docs: true
      });
      this.previewImpayers = result.rows.map(r => r.doc).filter(Boolean);
    } else {
      this.previewImpayers = [];
    }
    
    // 4. Calculer les variables
    const montantTotal = this.previewImpayers.reduce(
      (sum, i) => sum + (i.reste_a_payer || 0), 0
    );
    
    this.previewData = {
      payeur_nom: payeur.nom,
      payeur_email: payeur.email,
      montant_total: this.formatMoney(montantTotal),
      nombre_impayes: this.previewImpayers.length,
      date_relance: new Date().toLocaleDateString('fr-FR'),
      liste_impayes: this.generateTableHTML(this.previewImpayers),
      lien_paiement: this.generatePaymentLink(payeur._id),
      echeance_plus_ancienne: this.getOldestDueDate(this.previewImpayers),
      jours_retard: this.calculateDaysOverdue(this.previewImpayers)
    };
    
    // 5. Interpréter le template
    this.renderedSubject = this.interpolateTemplate(relance.objet, this.previewData);
    this.renderedBody = this.interpolateTemplate(relance.corps, this.previewData);
    
    // 6. Afficher le modal
    this.showPreviewModal = true;
    
  } catch (error) {
    console.error('Erreur prévisualisation:', error);
    this.error = error.message;
  } finally {
    this.loading = false;
  }
}

// Interpolation des variables dans le template
interpolateTemplate(template, data) {
  if (!template) return '';
  
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return data[key] !== undefined ? data[key] : match;
  });
}

// Générer le tableau HTML des impayés
generateTableHTML(impayes) {
  if (!impayes?.length) return '<p>Aucun impayé</p>';
  
  const rows = impayes.map(i => `
    <tr>
      <td>${i.nfacture}</td>
      <td>${this.formatDate(i.date_echeance)}</td>
      <td>${this.formatMoney(i.reste_a_payer)}</td>
    </tr>
  `).join('');
  
  return `
    <table border="1" cellpadding="5">
      <thead>
        <tr>
          <th>Facture</th>
          <th>Échéance</th>
          <th>Montant</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

// Helpers
formatMoney(amount) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount);
}

formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('fr-FR');
}

generatePaymentLink(contactId) {
  return `https://portail.markidiags.com/payer?contact=${contactId}`;
}

getOldestDueDate(impayes) {
  if (!impayes?.length) return '-';
  const dates = impayes.map(i => new Date(i.date_echeance)).filter(d => !isNaN(d));
  if (!dates.length) return '-';
  const oldest = new Date(Math.min(...dates));
  return oldest.toLocaleDateString('fr-FR');
}

calculateDaysOverdue(impayes) {
  if (!impayes?.length) return 0;
  const today = new Date();
  const oldest = new Date(Math.min(...impayes.map(i => new Date(i.date_echeance))));
  const diff = Math.floor((today - oldest) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}
```

## API Calls

**Aucun appel API** - Toutes les données sont récupérées depuis PouchDB local et le rendu est effectué côté client.

## Variables de template disponibles

| Variable | Description | Exemple |
|----------|-------------|---------|
| `{{payeur_nom}}` | Nom du payeur | "ACME Corporation" |
| `{{montant_total}}` | Total TTC | "12 500,00 €" |
| `{{nombre_impayes}}` | Nb factures | "3" |
| `{{date_relance}}` | Date formatée | "21/07/2026" |
| `{{liste_impayes}}` | Tableau HTML | `<table>...</table>` |
| `{{lien_paiement}}` | URL portail | "https://.../pay?id=XXX" |
| `{{echeance_plus_ancienne}}` | Date | "15/01/2026" |
| `{{jours_retard}}` | Nombre | "187" |

## Mockups de référence

- `specs/mockups/relances.html` (modal prévisualisation)

## Options d'affichage

| Option | Description |
|--------|-------------|
| Vue desktop | Rendu email largeur 600px (standard) |
| Vue mobile | Rendu email largeur 320px |
| Vue texte | Version texte brut sans HTML |

---

## Migration depuis l'ancienne API

| Aspect | Avant (API) | Après (PouchDB) |
|--------|-------------|-----------------|
| Données relance | `GET /api/relances/:id/preview` | `db.get('relance:' + id)` |
| Données payeur | `GET /api/payers/:id` | `dbContacts.get('contact:' + id)` |
| Impayés liés | `GET /api/impayes?relance_id=:id` | `db.allDocs({ keys: [...] })` |
| Rendu template | Backend | **Côté client** avec interpolation |
| Latence | ~300-800ms | ~20-50ms (local) |
| Offline | ❌ Impossible | ✅ Fonctionne offline |
