# Workflow : Onglet Factures

## Écran
`portail-client.html`

## Élément déclencheur
Onglet avec `@click="activeTab = 'factures'"`

## Action
Afficher les factures

## Description
- Liste des factures du client
- Statuts et montants

## Data Model
**Page Function:** `portailClientPage()`

**Données:**
- `client`
- `factures`
- `documents`
- `factureAPayer`

**États UI:**
- `loading`
- `error`
- `showPaiementModal`

## State Changes

**Modifications:**
- `currentView` modifié
- `activeTab` modifié
- `viewMode` modifié

## API Calls

**Pas d'appel API** - Action côté client uniquement



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
- **Point d'entrée** : Initialise la page Alpine.js

### Fichier workflow
- **JS** : `frontend/app/portail-client/js/switch-tab-factures.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/portail-client/js/switch-tab-factures.js
export function switchTabFactures() {
  // Implementation du workflow
}
```

## Implementation

```javascript
switchTab(tab) {
  this.activeTab = tab;
  // Affiche le contenu de l'onglet Factures
  // Les factures sont déjà chargées dans initial-load
}
```
