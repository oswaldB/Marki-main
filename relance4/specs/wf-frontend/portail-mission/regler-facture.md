# Workflow : Régler facture mission

## Écran
`portail-mission.html`

## Élément déclencheur
Bouton avec `@click="reglerFacture()"`

## Action
Rediriger vers le lien de paiement externe (Stripe, PayPal, etc.)

## Description
- Récupère le template de lien de paiement depuis la configuration (`payment_links`)
- Remplace les variables `[[]]` par les valeurs réelles de la facture
- Redirige l'utilisateur vers le lien de paiement complet
- Affiche uniquement si la facture est impayée
- Même mécanisme que `portail-client/regler-facture.md`

## Data Model
**Page Function:** `portailMissionPage()`

**Données:**
- `impaye` - l'impayé/facture en cours de consultation
- `client`
- `paymentConfig` - Configuration des liens de paiement (récupérée depuis `/api/payment_links`)

**États UI:**
- `loading`
- `error`

## State Changes

**Modifications:**
- `loading` → `true` → `false`
- `error` ← message si échec de génération du lien

## API Calls

**Pas d'appel API direct** - Traitement côté client

**Configuration utilisée** (depuis `/backend/data/payment_links/`) :
```javascript
{
  "payment_link_template": "https://paiement.example.com/pay?amount=[[MONTANT]]&ref=[[REFERENCE]]&email=[[EMAIL]]",
  "variables": ["[[MONTANT]]", "[[REFERENCE]]", "[[EMAIL]]", "[[NOM_CLIENT]]"]
}
```

**Variables disponibles :**
- `[[MONTANT]]` - Montant TTC de la facture (en centimes)
- `[[REFERENCE]]` - Numéro de facture (nfacture)
- `[[EMAIL]]` - Email du client
- `[[NOM_CLIENT]]` - Nom complet du client
- `[[ID_FACTURE]]` - ID interne de la facture

```
frontend/
└── app/
    └── portail-mission/
        ├── index.html
        ├── components/
        │   └── (composants partagés)
        └── js/
            └── regler-facture.js
```

### Fichier principal
- **HTML** : `frontend/app/portail-mission/index.html`
- **Point d'entrée** : Initialise la page Alpine.js

### Fichier workflow
- **JS** : `frontend/app/portail-mission/js/regler-facture.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/portail-mission/js/regler-facture.js
export function reglerFacture() {
  // Implementation du workflow
}
```

## Implementation

```javascript
async reglerFacture() {
  try {
    // 1. Get payment config (from store or API)
    const config = Alpine.store('config').paymentLink;
    if (!config?.template) {
      throw new Error('Configuration de paiement non disponible');
    }
    
    // 2. Prepare replacement values
    const values = {
      '[[MONTANT]]': Math.round(this.impaye.montant_ttc * 100), // centimes
      '[[REFERENCE]]': encodeURIComponent(this.impaye.nfacture),
      '[[EMAIL]]': encodeURIComponent(this.client.email),
      '[[NOM_CLIENT]]': encodeURIComponent(`${this.client.prenom} ${this.client.nom}`),
      '[[ID_FACTURE]]': this.impaye.id
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

- **Configuration** : Utilise la table `payment_links` créée dans `/backend/data/`
- **Sécurité** : Les variables sont encodées avec `encodeURIComponent` pour éviter les injections
- **Montant** : Généralement envoyé en centimes (multiplié par 100) pour les passerelles de paiement
- **Fallback** : Si pas de config, afficher un message invitant à contacter l'entreprise
