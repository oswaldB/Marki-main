# Workflow : Régler facture mission

## Écran
`portail-mission.html`

## Élément déclencheur
Bouton avec `@click="reglerFacture()"`

## Action
Rediriger vers le lien de paiement externe (Stripe, PayPal, etc.)

## Description
- Récupère le lien de paiement depuis le champ `lien_paiement` de l'impayé
- Redirige l'utilisateur vers le lien de paiement externe
- Affiche uniquement si la facture est impayée
- Même mécanisme que `portail-client/regler-facture.md`

## Data Model
**Page Function:** `portailMissionPage()`

**Données:**
- `impaye` - l'impayé/facture en cours de consultation (contient `lien_paiement`)
- `client`

**États UI:**
- `loading`
- `error`

## State Changes

**Modifications:**
- `loading` → `true` → `false`
- `error` ← message si échec de génération du lien

## API Calls

**GET /api/portail/data** - Récupère les données du portail incluant l'impayé avec son lien de paiement

**Note** : Le lien de paiement (`lien_paiement`) est stocké dans la table `impayes` et retourné par l'API.

**Pas d'appel API supplémentaire** - Le lien est déjà disponible dans les données de l'impayé.

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
  const workflowId = crypto.randomUUID();
  log.info('WORKFLOW_START', { workflowId, workflow: 'reglerFacture', impayeId: this.impaye.id });
  
  try {
    // Le lien de paiement est directement disponible dans les données de l'impayé
    const lienPaiement = this.impaye.lien_paiement;
    
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
    
    log.info('WORKFLOW_SUCCESS', { workflowId, impayeId: this.impaye.id, redirectUrl: lienPaiement });
    
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
