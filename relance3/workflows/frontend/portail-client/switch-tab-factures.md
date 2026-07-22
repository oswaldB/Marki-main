# Workflow : Onglet Factures

## Écran
`portail-client.html`

## Élément déclencheur
Onglet avec `@click="activeTab = 'factures'"`

## Action
Afficher les factures du client

## Description
- Change l'onglet actif vers "factures"
- Affiche la liste des factures impayées du client
- Les données sont déjà chargées depuis PouchDB par `initial-load`

## Data Model
**Page Function:** `portailClientPage()`

**Données (depuis PouchDB):**
- `client` - données du client depuis PouchDB
- `factures` - liste des factures du client depuis PouchDB (déjà chargées)
- `documents` - documents associés
- `factureAPayer` - facture sélectionnée pour paiement
- `activeTab` - onglet actuellement sélectionné
- `db` - instance PouchDB

**États UI:**
- `loading`
- `error`
- `showPaiementModal`

## State Changes

**Modifications:**
- `currentView` modifié
- `activeTab` ← `'factures'`
- `viewMode` modifié

## PouchDB Operations

**Aucun** - Les factures sont déjà chargées depuis PouchDB par le workflow `initial-load`.

Ce workflow est purement une action UI qui affiche les données déjà présentes en mémoire.

## API Calls

**Pas d'appel API** - Action côté client uniquement avec données PouchDB déjà chargées

## Organisation des fichiers

```
frontend/
└── app/
    └── portail-client/
        ├── index.html
        ├── components/
        │   └── (composants partagés)
        └── js/
            └── switch-tab-factures.js
```

### Fichier principal
- **HTML** : `frontend/app/portail-client/index.html`
- **Point d'entrée** : Initialise la page Alpine.js avec PouchDB

### Fichier workflow
- **JS** : `frontend/app/portail-client/js/switch-tab-factures.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/portail-client/js/switch-tab-factures.js
export function switchTabFactures() {
  // Implementation avec données PouchDB déjà chargées
}
```

## Implementation

```javascript
switchTab(tab) {
  this.activeTab = tab;
  // Affiche le contenu de l'onglet Factures
  // Les factures sont déjà chargées depuis PouchDB dans initial-load
}

// Les factures sont accessibles depuis this.factures (chargé par initial-load)
// Format des données PouchDB:
// {
//   _id: "facture:550e8400-e29b-41d4-a716-446655440000",
//   _rev: "1-abc123...",
//   type: "facture",
//   nfacture: "F-2024-001",
//   montant_ttc: 1500.00,
//   reste_a_payer: 1500.00,
//   date_echeance: "2024-02-15",
//   statut: "impaye",
//   contact_id: "contact:..."
// }
```

## Notes

- **UI uniquement** : Ce workflow est purement un changement d'état UI
- **Données PouchDB** : Les factures sont chargées une fois par `initial-load` et restent en mémoire
- **Pas de requête** : Aucun appel PouchDB supplémentaire lors du changement d'onglet
- **Instantané** : Le changement est immédiat car les données sont déjà présentes

---

## Migration depuis l'ancienne architecture

| Aspect | Avant | Après (PouchDB) |
|--------|-------|-----------------|
| Changement onglet | Côté client | **Conservé** - Côté client |
| Source données | Props/Store | PouchDB (déjà chargé) |
| Latence | Instantanée | Instantanée |
| Offline | ✅ Oui | ✅ Oui |
