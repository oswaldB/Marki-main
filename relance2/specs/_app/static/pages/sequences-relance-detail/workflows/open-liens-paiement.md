# Workflow : Gérer liens de paiement

## Écran
`sequences-relance-detail.html`

## Élément déclencheur
Bouton avec `@click="ouvrirModalLiensPaiement()"`

## Action
Ouvrir la gestion des liens de paiement

## Description
- Affiche les liens de paiement configurés
- Permet d'ajouter/modifier/supprimer
- Liens vers Stripe, PayPal, etc.

## Data Model
**Page Function:** `sequencesRelanceDetailPage()`

**Stores Alpine.js:**
- $store.ui

**Données:**
- `sequence`
- `etapes`
- `modeles`
- `activeTab`
- `draggingEtape`
- `editingEtape`
- `editorInstance`

**États UI:**
- `loading`
- `error`
- `saving`
- `hasChanges`
- `showEtapeModal`
- `showModeleModal`
- `showDeleteEtapeModal`

## State Changes

**Modifications:** États UI spécifiques selon implémentation

## API Calls

**Opérations CRUD sur les liens de paiement** via `/api/liens-paiement` :

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/api/liens-paiement?statut=actif` | Liste tous les liens de paiement actifs |
| `POST` | `/api/liens-paiement` | Crée un nouveau lien de paiement |
| `PUT` | `/api/liens-paiement/:id` | Modifie un lien de paiement existant |
| `DELETE` | `/api/liens-paiement/:id` | Supprime un lien de paiement |

**Données échangées** :
- Body POST/PUT : `{ nom: string, url: string, actif: boolean }`
- Réponse : `{ id: string, nom: string, url: string, actif: boolean, created_at: date }`



## Organisation des fichiers

```
frontend/
└── app/
    └── sequences-relance-detail/
        ├── index.html
        ├── components/
        │   └── (composants partagés)
        └── js/
            └── open-liens-paiement.js
```

### Fichier principal
- **HTML** : `frontend/app/sequences-relance-detail/index.html`
- **Point d'entrée** : Initialise la page Alpine.js

### Fichier workflow
- **JS** : `frontend/app/sequences-relance-detail/js/open-liens-paiement.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/sequences-relance-detail/js/open-liens-paiement.js
export function openLiensPaiement() {
  // Implementation du workflow
}
```

## Implementation

```javascript
openModal(item) {
  // 1. Set selected item
  this.selectedItem = item;

  // 2. Show modal
  this.showModal = true;

  // 3. Load additional data if needed
  if (item?.id) {
    this.loadDetail(item.id);
  }
}
```

## Logs (console.log) - OBLIGATOIRE

Chaque étape du workflow doit être loguée avec `console.log()`:

| Checkpoint | Instruction console.log |
|------------|------------------------|
| `start` | `console.log('[WORKFLOW.sequences-relance-detail-open-liens-paiement] START: Ouverture du modal liens de paiement')` |
| `modal-shown` | `console.log('[WORKFLOW.sequences-relance-detail-open-liens-paiement] STEP: showLiensPaiementModal = true')` |
| `state-initialized` | `console.log('[WORKFLOW.sequences-relance-detail-open-liens-paiement] STEP: État initialisé avec selectedItem:', selectedItem)` |
| `data-loaded` | `console.log('[WORKFLOW.sequences-relance-detail-open-liens-paiement] STEP: Liens de paiement chargés depuis /api/liens-paiement')` |
| `state-applied` | `console.log('[WORKFLOW.sequences-relance-detail-open-liens-paiement] DATA: État après ouverture:', {showLiensPaiementModal, selectedItem, loading, error})` |
| `end` | `console.log('[WORKFLOW.sequences-relance-detail-open-liens-paiement] SUCCESS: Modal liens de paiement ouvert en', duree, 'ms')` |
| `error` | `console.error('[WORKFLOW.sequences-relance-detail-open-liens-paiement] ERROR:', error)` |
