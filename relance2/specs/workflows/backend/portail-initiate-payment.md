# Workflow Backend : Portail - Initier Paiement

## Objectifs
- Générer un lien de paiement sécurisé
- Enregistrer la tentative de paiement
- Retourner l'URL de redirection vers la plateforme de paiement

## Base de données
- **SQLite** : `backend/data/marki.db`
- **Tables** : `impayes`, `paiements`, `contacts`, `sequences`

## Data Models SQLite

### Table `paiements` (à créer si non existante)

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | TEXT | Identifiant (pay_xxx) |
| `contact_id` | TEXT | ID du contact |
| `impaye_ids` | TEXT | IDs des impayés concernés (JSON array) |
| `montant` | REAL | Montant total du paiement |
| `statut` | TEXT | `initie`, `en_cours`, `succes`, `echec`, `annule` |
| `lien_paiement` | TEXT | URL de paiement générée |
| `reference_externe` | TEXT | Référence chez le prestataire de paiement |
| `date_initiation` | TEXT | Date d'initiation |
| `date_finalisation` | TEXT | Date de finalisation |
| `created_at` | TEXT | Date création |
| `updated_at` | TEXT | Date mise à jour |

## Process

```javascript
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

/**
 * Initier un paiement pour un ou plusieurs impayés
 * @param {string} contactId - ID du contact
 * @param {Array<string>} impayeIds - IDs des impayés à payer
 * @param {string} baseUrl - URL de base du portail
 * @returns {Object} Informations du paiement
 */
async function initiatePayment(contactId, impayeIds, baseUrl) {
  // Vérifier que les impayés existent et appartiennent au contact
  const impayes = [];
  for (const impayeId of impayeIds) {
    const impaye = db.read('impayes', impayeId);
    if (!impaye) {
      throw new Error('IMPAYE_NOT_FOUND');
    }
    if (impaye.contact_relance_id !== contactId) {
      throw new Error('IMPAYE_NOT_OWNED');
    }
    if (impaye.facture_soldee) {
      throw new Error('IMPAYE_ALREADY_PAID');
    }
    impayes.push(impaye);
  }
  
  // Calculer le montant total
  const montantTotal = impayes.reduce((sum, i) => sum + (i.reste_a_payer || 0), 0);
  
  if (montantTotal <= 0) {
    throw new Error('MONTANT_INVALID');
  }
  
  // Générer une référence unique
  const reference = `PAY-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  
  // Récupérer le contact
  const contact = db.read('contacts', contactId);
  
  // URLs de retour
  const returnUrl = `${baseUrl}/portail/paiement/succes?ref=${reference}`;
  const cancelUrl = `${base_url}/portail/paiement/annule?ref=${reference}`;
  const notifyUrl = `${process.env.API_URL}/api/webhooks/payment`;
  
  // Créer l'enregistrement de paiement
  const paiementId = `pay_${uuidv4().slice(0, 8)}`;
  const now = new Date().toISOString();
  
  db.create('paiements', {
    id: paiementId,
    contact_id: contactId,
    impaye_ids: JSON.stringify(impayeIds),
    montant: montantTotal,
    statut: 'initie',
    reference_externe: reference,
    date_initiation: now,
    created_at: now,
    updated_at: now
  });
  
  // Générer l'URL de paiement (intégration Stripe/PayPal/similaire)
  // Cet exemple suppose une intégration Stripe-like
  const paymentUrl = await generatePaymentLink({
    amount: montantTotal * 100, // en centimes
    currency: 'EUR',
    description: `Paiement factures ${impayes.map(i => i.nfacture).join(', ')}`,
    customerEmail: contact.email,
    customerName: `${contact.prenom} ${contact.nom}`,
    reference: reference,
    returnUrl,
    cancelUrl,
    notifyUrl
  });
  
  // Mettre à jour avec l'URL
  db.update('paiements', paiementId, {
    lien_paiement: paymentUrl,
    statut: 'en_cours',
    updated_at: new Date().toISOString()
  });
  
  // Logger
  logPaymentEvent(contactId, 'INITIATED', paiementId, montantTotal);
  
  return {
    paiementId,
    reference,
    montant: montantTotal,
    lienPaiement: paymentUrl,
    expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 min
  };
}

/**
 * Générer un lien de paiement (stub - à remplacer par intégration réelle)
 */
async function generatePaymentLink(params) {
  // Intégration réelle avec Stripe, PayPal, etc.
  // Exemple: return stripeClient.createCheckoutSession(params);
  
  // Pour l'exemple, on retourne une URL mock
  return `${process.env.PAYMENT_PROVIDER_URL}/checkout?ref=${params.reference}`;
}

/**
 * Logger un événement de paiement
 */
function logPaymentEvent(contactId, action, paiementId, montant) {
  db.create('events', {
    id: `evt_${uuidv4().slice(0, 8)}`,
    type: 'payment',
    titre: `Paiement ${action}`,
    description: `Paiement ${action}: ${paiementId}, Montant: ${montant}€`,
    entity_type: 'paiement',
    entity_id: paiementId,
    who_id: contactId,
    by_marki: 0,
    created_at: new Date().toISOString()
  });
}
```

## Route API

```bash
POST /api/portail/paiement/initier

# cURL
curl -X POST \
  -H "Authorization: Bearer $PORTAIL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"impayeIds":["impaye_001","impaye_002"]}' \
  "http://localhost:5000/api/portail/paiement/initier"
```

## Input

```json
{
  "impayeIds": ["impaye_001", "impaye_002"],
  "montantPersonnalise": null // Optionnel: pour paiement partiel
}
```

## Output Success

```json
{
  "success": true,
  "paiementId": "pay_abc123",
  "reference": "PAY-1234567890-ABC123",
  "montant": 15420.50,
  "lienPaiement": "https://checkout.stripe.com/pay/cs_test_...",
  "expiresAt": "2026-07-21T13:00:00Z"
}
```

## Output Error

```json
{
  "success": false,
  "error": "IMPAYE_ALREADY_PAID",
  "message": "Une ou plusieurs factures sont déjà soldées"
}
```

## Codes Erreur

| Code | Description |
|------|-------------|
| `IMPAYE_NOT_FOUND` | Impayé non trouvé |
| `IMPAYE_NOT_OWNED` | Impayé ne correspond pas au contact |
| `IMPAYE_ALREADY_PAID` | Facture déjà soldée |
| `MONTANT_INVALID` | Montant invalide (≤ 0) |
| `PAYMENT_PROVIDER_ERROR` | Erreur du prestataire de paiement |

## Webhook (Notification Paiement)

```bash
POST /api/webhooks/payment
```

Le prestataire de paiement appellera cette URL pour notifier du résultat.
