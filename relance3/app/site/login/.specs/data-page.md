# Data Page - login

> **MAPPING DES DONNÉES - DOCUMENT DE RÉFÉRENCE**
> 
> Ce fichier définit le mapping entre les données CouchDB/PouchDB et l'interface Alpine.js.
> **À LIRE AVANT toute implémentation de la logique data.**

## Partie 1 : DataModel CouchDB

> **Source**: `datamodel-couchdb.json` (généré automatiquement depuis CouchDB)

### Types de Documents Reconnus

```json
{
  "example": {
    "count": 0,
    "fields": [
      "type",
      "name",
      "createdAt",
      "updatedAt"
    ],
    "example": {
      "type": "example",
      "name": "Exemple"
    }
  }
}
```

### Schémas des Documents

#### Document Type: `login`

| Champ | Type | Description | Mapping Alpine |
|-------|------|-------------|----------------|
| `_id` | string | ID unique du document | `data.id` |
| `_rev` | string | Révision CouchDB | Géré par PouchDB |
| `type` | string | Type du document | `data.type` |
| ... | ... | ... | ... |

## Partie 2 : Mapping PouchDB → Alpine.js

### Structure des Données Alpine

```javascript
// Dans main.js - loginPage()
return {
    // === État local (non persisté) ===
    loading: false,
    error: null,
    
    // === Données synchronisées avec PouchDB ===
    items: [],           // Liste des documents
    currentItem: null, // Document en cours d'édition
    
    // === Méthodes ===
    async init() {
        // Chargement initial depuis PouchDB
        await runWorkflow('initial-load');
    },
    
    async saveItem(data) {
        // Sauvegarde via workflow
        await runWorkflow('save-item', { data });
    }
}
```

### Mapping des Champs

| Champ CouchDB | Champ PouchDB | Variable Alpine | Workflow |
|---------------|---------------|-----------------|----------|
| `_id` | `_id` | `item.id` | - |
| `name` | `name` | `item.name` | `update-item` |
| `status` | `status` | `item.status` | `toggle-status` |
| `createdAt` | `createdAt` | `item.createdAt` | `create-item` |

## Partie 3 : Workflows Data

### Workflow: `initial-load`

**Description**: Charge les données initiales depuis PouchDB

**Input**: Aucun

**Output**:
```javascript
{
    success: true,
    data: [
        { _id: "...", type: "...", ... },
        // ...
    ]
}
```

**Mapping**:
- Les documents sont stockés dans `this.items`
- Les erreurs dans `this.error`

### Workflow: `save-item`

**Description**: Sauvegarde un document dans PouchDB

**Input**:
```javascript
{
    data: {
        _id: "optionnel",
        type: "login",
        // ... champs du document
    }
}
```

**Output**:
```javascript
{
    success: true,
    data: { _id: "...", _rev: "...", ... }
}
```

**Mapping**:
- Le document sauvegardé est ajouté/mis à jour dans `this.items`
- Le live sync met à jour automatiquement

### Workflow: `delete-item`

**Description**: Supprime un document de PouchDB

**Input**:
```javascript
{
    id: "document-id"
}
```

**Output**:
```javascript
{
    success: true,
    deleted: true
}
```

## Partie 4 : Règles de Synchronisation

### Live Sync

```javascript
// Dans main.js - activation du live sync
db.changes({
    since: 'now',
    live: true,
    include_docs: true
}).on('change', (change) => {
    // Met à jour automatiquement this.items
    this.syncFromPouch(change.doc);
});
```

### Conflits

- Les conflits sont gérés par PouchDB
- En cas de conflit, afficher un message à l'utilisateur
- Workflow: `resolve-conflict`

### Validation des Données

Avant toute sauvegarde, valider:
1. **Type**: Vérifier que `type` correspond à un type connu
2. **Champs requis**: Vérifier les champs obligatoires du schéma
3. **Types**: Vérifier que les valeurs correspondent aux types attendus

## Partie 5 : HTML Bindings

### Exemple de Binding

```html
<!-- Liste des items -->
<template x-for="item in items" :key="item._id">
    <div>
        <span x-text="item.name"></span>
        <span x-text="item.status"></span>
        <button @click="runWorkflow('edit-item', { id: item._id })">
            Éditer
        </button>
    </div>
</template>

<!-- Formulaire -->
<form @submit.prevent="runWorkflow('save-item', { data: currentItem })">
    <input x-model="currentItem.name" placeholder="Nom">
    <button type="submit" id="btn-save">Sauvegarder</button>
</form>
```

### Règles de Binding

1. **Toujours utiliser `:key`** avec `_id` dans les boucles `x-for`
2. **Ne jamais modifier directement** les documents PouchDB dans le HTML
3. **Toujours passer par un workflow** pour les modifications
4. **Utiliser `x-model`** pour les formulaires avec validation
