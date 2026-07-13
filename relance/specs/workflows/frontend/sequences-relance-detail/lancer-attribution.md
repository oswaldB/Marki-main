# Workflow : Lancer attribution manuelle

## Écran
`sequences-relance-detail.html`

## Élément déclencheur
Bouton avec `@click="lancerAttribution()"`

## Action
Exécuter l'attribution des impayés

## Description
- Parcourt les impayés non assignés
- Applique les règles d'attribution
- Assigne à cette séquence

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
            └── lancer-attribution.js
```

### Fichier principal
- **HTML** : `frontend/app/sequences-relance-detail/index.html`
- **Point d'entrée** : Initialise la page Alpine.js

### Fichier workflow
- **JS** : `frontend/app/sequences-relance-detail/js/lancer-attribution.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/sequences-relance-detail/js/lancer-attribution.js
export function lancerAttribution() {
  // Implementation du workflow
}
```

## Implementation

```javascript
async lancerSequence() {
  // 1. Set processing
  this.processing = true;
  
  try {
    // 2. Call API
    const response = await fetch('/api/sequences-relance-detail/lancer', {
      method: 'POST'
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error?.message);
    }
    
    // 3. Reload
    await this.loadData();
    
    // 4. Notify
    Alpine.store('ui').addToast('Processus lancé', 'success');
    
  } catch (error) {
    Alpine.store('ui').addToast(error.message, 'error');
  } finally {
    this.processing = false;
  }
}
```