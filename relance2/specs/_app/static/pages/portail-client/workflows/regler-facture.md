# Workflow : Régler facture client

## Écran
`portail-client.html`

## Élément déclencheur
Bouton avec `@click="reglerFacture(facture)"`

## Action
Rediriger vers le lien de paiement externe (Stripe, PayPal, etc.)

## Description
- Récupère le template de lien de paiement depuis la configuration
- Remplace les variables `[[]]` par les valeurs réelles de la facture
- Redirige l'utilisateur vers le lien de paiement complet
- Affiche uniquement si la facture est impayée

## Data Model
**Page Function:** `portailClientPage()`

**Données:**
- `client`
- `factures`
- `factureAPayer`
- `paymentConfig` - Configuration des liens de paiement

**États UI:**
- `loading`
- `error`

## State Changes

**Modifications:**
- `loading` → `true` → `false`
- `error` ← message si échec de génération du lien

## API Calls

**Pas d'appel API** - Traitement côté client uniquement

**Configuration** (déjà créée dans `/backend/data/payment_links/`) :

Table `payment_links` :
```javascript
{
  "payment_link_template": "https://paiement.example.com/pay?amount=[[MONTANT]]&ref=[[REFERENCE]]&email=[[EMAIL]]",
  "variables": ["[[MONTANT]]", "[[REFERENCE]]", "[[EMAIL]]", "[[NOM_CLIENT]]"]
}
```

**Variables disponibles :**
- `[[MONTANT]]` - Montant TTC de la facture (en centimes ou formaté)
- `[[REFERENCE]]` - Numéro de facture (nfacture)
- `[[EMAIL]]` - Email du client
- `[[NOM_CLIENT]]` - Nom complet du client
- `[[ID_FACTURE]]` - ID interne de la facture

## Organisation des fichiers

```
frontend/
└── app/
    └── portail-client/
        ├── index.html
        ├── components/
        │   └── (composants partagés)
        └── js/
            └── regler-facture.js
```

### Fichier principal
- **HTML** : `frontend/app/portail-client/index.html`
- **Point d'entrée** : Initialise la page Alpine.js

### Fichier workflow
- **JS** : `frontend/app/portail-client/js/regler-facture.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/portail-client/js/regler-facture.js
export function reglerFacture() {
  // Implementation du workflow
}
```

## Implementation

```javascript
async reglerFacture(facture) {
  try {
    // 1. Get payment config (from store or API)
    const config = Alpine.store('config').paymentLink;
    if (!config?.template) {
      throw new Error('Configuration de paiement non disponible');
    }
    
    // 2. Prepare replacement values
    const values = {
      '[[MONTANT]]': Math.round(facture.montant_ttc * 100), // centimes
      '[[REFERENCE]]': encodeURIComponent(facture.nfacture),
      '[[EMAIL]]': encodeURIComponent(this.client.email),
      '[[NOM_CLIENT]]': encodeURIComponent(`${this.client.prenom} ${this.client.nom}`),
      '[[ID_FACTURE]]': facture.id
    };
    
    // 3. Replace variables in template
    let paymentUrl = config.template;
    for (const [variable, value] of Object.entries(values)) {
      paymentUrl = paymentUrl.replaceAll(variable, value);
    }
    
    // 4. Validate URL
    try {
      new URL(paymentUrl);
    } catch {
      throw new Error('URL de paiement invalide');
    }
    
    // 5. Redirect to payment
    window.location.href = paymentUrl;
    
  } catch (error) {
    Alpine.store('ui').addToast(error.message, 'error');
  }
}
```

## Notes

- **Configuration à créer** : Une table `payment_links` ou un champ dans les settings globaux pour stocker le template
- **Sécurité** : Les variables sont encodées avec `encodeURIComponent` pour éviter les injections
- **Montant** : Généralement envoyé en centimes (multiplié par 100) pour les passerelles de paiement
- **Fallback** : Si pas de config, afficher un message invitant à contacter l'entreprise

## Logs (console.log) - OBLIGATOIRE

Chaque étape du workflow doit être loguée avec `console.log()`:

| Checkpoint | Instruction console.log |
|------------|------------------------|
| `start` | `console.log('[WORKFLOW.portail-client-regler-facture] START: Réglement facture', facture.nfacture, 'pour client', this.client?.id)` |
| `config-loaded` | `console.log('[WORKFLOW.portail-client-regler-facture] STEP: Configuration de paiement récupérée depuis store', {hasTemplate: !!config?.template, variables: config?.variables})` |
| `validation` | `console.log('[WORKFLOW.portail-client-regler-facture] STEP: Validation de la facture (impayée + config OK) -', validationResult ? 'OK' : 'KO')` |
| `values-prepared` | `console.log('[WORKFLOW.portail-client-regler-facture] DATA: Variables préparées pour substitution', values)` |
| `url-built` | `console.log('[WORKFLOW.portail-client-regler-facture] STEP: URL de paiement générée', paymentUrl)` |
| `api-call` | `console.log('[WORKFLOW.portail-client-regler-facture] API: Validation URL via new URL() -', isValid ? 'OK' : 'KO')` |
| `state-updated` | `console.log('[WORKFLOW.portail-client-regler-facture] DATA: État après génération:', {loading: false, error: null, factureAPayer: facture.id})` |
| `end` | `console.log('[WORKFLOW.portail-client-regler-facture] SUCCESS: Redirection vers passerelle de paiement en', duree, 'ms')` |
| `error` | `console.error('[WORKFLOW.portail-client-regler-facture] ERROR:', error.message, {factureId: facture?.id, step: errorStep})` |
