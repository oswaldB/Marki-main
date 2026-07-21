# Workflow : Lancer attribution manuelle

## Écran
`sequences-relance-detail.html`

## Élément déclencheur
Bouton avec `@click="lancerAttribution()"`

## Action
Exécuter l'attribution des impayés

## Description

Déclenche l'attribution automatique des impayés en appelant le workflow backend `attribution-impayes`.
- Le backend parcourt les impayés non assignés
- Le backend applique les règles d'attribution
- Le backend assigne les impayés à cette séquence

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

**Modifications:**
- `processing` = `true` pendant l'exécution
- Toast 'Attribution en cours...' (info) au lancement
- Toast 'Attribution terminée' (succès) ou message d'erreur
- `processing` = `false` à la fin
## API Calls

**POST** `/api/workflows/attribution-impayes/execute`
- Body: `{ sequence_id: string }`
- Retour: `{ success: boolean, assigned_count: number }`



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
  // Appel au workflow backend attribution-impayes
}
```

## Implementation

```javascript
async lancerAttribution() {
  this.processing = true;
  Alpine.store('ui').addToast('Attribution en cours...', 'info');
  
  try {
    const response = await fetch('/api/workflows/attribution-impayes/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sequence_id: this.sequence.id })
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error?.message || 'Erreur lors de l\'attribution');
    }
    
    Alpine.store('ui').addToast(`${data.assigned_count} impayés attribués`, 'success');
    
  } catch (error) {
    Alpine.store('ui').addToast(error.message, 'error');
  } finally {
    this.processing = false;
  }
}
```
