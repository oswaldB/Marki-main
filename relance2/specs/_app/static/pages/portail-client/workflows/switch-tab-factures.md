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

## Logs (console.log) - OBLIGATOIRE

Chaque étape du workflow doit être loguée avec `console.log()`:

| Checkpoint | Instruction console.log |
|------------|------------------------|
| `start` | `console.log('[WORKFLOW.portail-client-switch-tab-factures] START: Basculement vers onglet factures')` |
| `tab-changed` | `console.log('[WORKFLOW.portail-client-switch-tab-factures] STEP: activeTab modifié à "factures"')` |
| `data-loaded` | `console.log('[WORKFLOW.portail-client-switch-tab-factures] DATA: Factures récupérées depuis le state (déjà chargées par initial-load):', {count: this.factures.length, total: this.factures.reduce((sum, f) => sum + (f.montant || 0), 0)})` |
| `state-applied` | `console.log('[WORKFLOW.portail-client-switch-tab-factures] DATA: État après changement d''onglet:', {activeTab: this.activeTab, currentView: this.currentView, viewMode: this.viewMode, loading: this.loading})` |
| `end` | `console.log('[WORKFLOW.portail-client-switch-tab-factures] SUCCESS: Onglet factures affiché en', duree, 'ms')` |
| `error` | `console.error('[WORKFLOW.portail-client-switch-tab-factures] ERROR:', error)` |
