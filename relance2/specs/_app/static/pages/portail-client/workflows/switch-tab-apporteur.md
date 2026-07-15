# Workflow : Onglet Apporteur

## Écran
`portail-client.html`

## Élément déclencheur
Onglet avec `@click="activeTab = 'apporteur'"`

## Action
Afficher les apporteurs

## Description
- Liste des apporteurs affiliés
- Missions liées

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
            └── switch-tab-apporteur.js
```

### Fichier principal
- **HTML** : `frontend/app/portail-client/index.html`
- **Point d'entrée** : Initialise la page Alpine.js

### Fichier workflow
- **JS** : `frontend/app/portail-client/js/switch-tab-apporteur.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/portail-client/js/switch-tab-apporteur.js
export function switchTabApporteur() {
  // Implementation du workflow
}
```

## Implementation

```javascript
switchTab(tab) {
  this.activeTab = tab;
  // Affiche le contenu de l'onglet sélectionné
  // Pas de persistance - retour par défaut à l'onglet principal
}
```

## Logs (console.log) - OBLIGATOIRE

Chaque étape du workflow doit être loguée avec `console.log()`:

| Checkpoint | Instruction console.log |
|------------|------------------------|
| `start` | `console.log('[WORKFLOW.portail-client-switch-tab-apporteur] START: Basculement vers onglet Apporteur')` |
| `tab-changed` | `console.log('[WORKFLOW.portail-client-switch-tab-apporteur] STEP: activeTab = "apporteur"')` |
| `state-updated` | `console.log('[WORKFLOW.portail-client-switch-tab-apporteur] STEP: currentView et viewMode mis à jour')` |
| `data-loaded` | `console.log('[WORKFLOW.portail-client-switch-tab-apporteur] DATA: Apporteurs et missions chargés:', {nbApporteurs, nbMissions})` |
| `end` | `console.log('[WORKFLOW.portail-client-switch-tab-apporteur] SUCCESS: Onglet Apporteur affiché en', duree, 'ms')` |
| `error` | `console.error('[WORKFLOW.portail-client-switch-tab-apporteur] ERROR:', error)` |
