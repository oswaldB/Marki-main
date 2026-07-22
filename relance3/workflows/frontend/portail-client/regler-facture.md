# Workflow : Régler facture client

## Écran
`portail-client.html`

## Élément déclencheur
Bouton avec `@click="reglerFacture(facture)"`

## Action
Rediriger vers le lien de paiement externe (Stripe, PayPal, etc.) avec les données provenant de PouchDB

## Description
- Récupère les données de la facture et du client depuis PouchDB
- Récupère le template de lien de paiement depuis la configuration (PouchDB)
- Remplace les variables `[[]]` par les valeurs réelles de la facture
- Redirige l'utilisateur vers le lien de paiement complet
- Affiche uniquement si la facture est impayée

## Data Model
**Page Function:** `portailClientPage()`

**Données (depuis PouchDB):**
- `client` - données du client depuis PouchDB
- `factures` - liste des factures du client depuis PouchDB
- `factureAPayer` - facture sélectionnée
- `paymentConfig` - Configuration des liens de paiement (stockée dans PouchDB ou chargée)
- `db` - instance PouchDB

**États UI:**
- `loading`
- `error`

## State Changes

**Modifications:**
- `loading` → `true` → `false`
- `error` ← message si échec de génération du lien

## PouchDB Operations

**Action:** Récupérer la configuration de paiement depuis PouchDB si nécessaire.

**Méthodes utilisées:**
- `db.get('config:payment')` - Récupérer la configuration de paiement (optionnel)

**Note** : Ce workflow n'effectue pas d'écriture dans PouchDB. La redirection vers le paiement externe se fait côté client.

## API Calls

**Pas d'appel API** - Traitement côté client uniquement avec les données PouchDB

**Configuration** (déjà créée dans PouchDB ou `/backend/data/payment_links/`) :

Document PouchDB `config:payment` :
```javascript
{
  "_id": "config:payment",
  "type": "config",
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
- **Point d'entrée** : Initialise la page Alpine.js avec PouchDB

### Fichier workflow
- **JS** : `frontend/app/portail-client/js/regler-facture.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/portail-client/js/regler-facture.js
export function reglerFacture() {
  // Implementation avec données PouchDB
}
```

## Implementation

```javascript
async reglerFacture(facture) {
  try {
    // 1. Get payment config (from store ou PouchDB)
    // Option: Charger depuis PouchDB si besoin
    // const configDoc = await db.get('config:payment');
    const config = Alpine.store('config').paymentLink;
    
    if (!config?.template) {
      throw new Error('Configuration de paiement non disponible');
    }
    
    // 2. Prepare replacement values (données depuis PouchDB)
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
    this.toast(error.message, 'error');
  }
}

// Option: Charger la config depuis PouchDB
async loadPaymentConfig() {
  try {
    const config = await db.get('config:payment');
    Alpine.store('config').paymentLink = {
      template: config.payment_link_template,
      variables: config.variables
    };
  } catch (error) {
    console.warn('Config paiement non trouvée dans PouchDB:', error);
    // Fallback: utiliser config par défaut ou message erreur
  }
}
```

## Notes

- **Données PouchDB** : Les données client et facture proviennent de PouchDB (chargées par `initial-load`)
- **Configuration paiement** : Peut être stockée dans PouchDB (`config:payment`) ou dans le store Alpine
- **Sécurité** : Les variables sont encodées avec `encodeURIComponent` pour éviter les injections
- **Montant** : Généralement envoyé en centimes (multiplié par 100) pour les passerelles de paiement
- **Fallback** : Si pas de config, afficher un message invitant à contacter l'entreprise
- **Pas d'écriture** : Ce workflow ne modifie pas PouchDB, il utilise uniquement les données en lecture

---

## Migration depuis l'ancienne architecture

| Aspect | Avant | Après (PouchDB) |
|--------|-------|-----------------|
| Données facture/client | Props/page params | PouchDB local |
| Config paiement | Backend/API | PouchDB local (optionnel) |
| Traitement | Côté client | **Conservé** - Côté client |
| Latence | Instantanée | Instantanée (données déjà en mémoire) |
| Offline | ❌ Impossible | ✅ Lien générable offline (mais paiement nécessite connexion) |
