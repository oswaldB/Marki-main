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

**GET /api/portail/data** - Récupère les données du portail incluant les impayés avec leurs liens de paiement

**Note** : Le lien de paiement (`lien_paiement`) est stocké dans la table `impayes` et retourné par l'API pour chaque facture.

**Pas d'appel API supplémentaire** - Le lien est déjà disponible dans les données de la facture.

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
  const workflowId = crypto.randomUUID();
  log.info('WORKFLOW_START', { workflowId, workflow: 'reglerFacture', factureId: facture.id });
  
  try {
    // Le lien de paiement est directement disponible dans les données de la facture
    const lienPaiement = facture.lien_paiement;
    
    if (!lienPaiement) {
      log.error('WORKFLOW_ERROR', { workflowId, error: 'Lien de paiement non disponible' });
      Alpine.store('ui').addToast('Lien de paiement non disponible pour cette facture', 'error');
      return;
    }
    
    // Validation de l'URL
    try {
      new URL(lienPaiement);
    } catch {
      throw new Error('URL de paiement invalide');
    }
    
    log.info('WORKFLOW_SUCCESS', { workflowId, factureId: facture.id, redirectUrl: lienPaiement });
    
    // Redirection vers le lien de paiement externe
    window.location.href = lienPaiement;
    
  } catch (error) {
    log.error('WORKFLOW_ERROR', { workflowId, error: error.message });
    Alpine.store('ui').addToast(error.message, 'error');
  }
}
```

## Notes

- Le champ `lien_paiement` est stocké dans la table `impayes` et retourné par `GET /api/portail/data`
- Le lien est généré/géré côté backend (Stripe, PayPal, etc.)
- Le frontend utilise simplement ce lien pour rediriger l'utilisateur
- Pas de construction d'URL côté frontend - utilisation directe du lien stocké
