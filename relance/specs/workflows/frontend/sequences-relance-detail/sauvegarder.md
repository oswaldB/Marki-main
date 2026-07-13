# Workflow : Sauvegarder séquence

## Écran
`sequences-relance-detail.html`

## Élément déclencheur
Bouton avec `@click="sauvegarder()"`

## Action
Enregistrer les modifications de la séquence

## Description
- Persiste tous les changements
- Envoie à l'API
- Affiche confirmation

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

**Pas d'appel API** - Action côté client uniquement



## Organisation des fichiers

```
frontend/
└── app/
    └── sequences-relance-detail/
        ├── index.html
        ├── components/
        │   └── (composants partagés)
        └── js/
            └── sauvegarder.js
```

### Fichier principal
- **HTML** : `frontend/app/sequences-relance-detail/index.html`
- **Point d'entrée** : Initialise la page Alpine.js

### Fichier workflow
- **JS** : `frontend/app/sequences-relance-detail/js/sauvegarder.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/sequences-relance-detail/js/sauvegarder.js
export function sauvegarder() {
  // Implementation du workflow
}
```

## Implementation

```javascript
// Implémentation personnalisée requise
// Page: sequences-relance-detail
// Entité: sequence

async functionName() {
  // 1. Set state
  this.loading = true;
  
  try {
    // 2. Call API
    const response = await fetch('/api/sequences-relance-detail/...');
    const data = await response.json();
    
    // 3. Handle response
    if (data.success) {
      // Update data
    }
    
  } catch (error) {
    // 4. Handle error
    this.error = error.message;
  } finally {
    // 5. Reset state
    this.loading = false;
  }
}
```