# Data Page - login

> **MAPPING DES DONNÉES - DOCUMENT DE RÉFÉRENCE**
> 
> Ce fichier définit le mapping entre les données CouchDB/PouchDB et l'interface Alpine.js.
> **À LIRE AVANT toute implémentation de la logique data.**

---

## Partie 1 : DataModel CouchDB

> **Source**: `datamodel-couchdb.json` (généré automatiquement depuis CouchDB)
> 
> **Note pour dev3.py**: Cette section doit contenir un document exemple complet avec toutes les clés définies.

### Document Exemple Complet

```json
{
  "_id": "login:uuid-v4-1234-5678",
  "_rev": "1-abc123def456",
  "type": "login",
  "name": "Nom du document",
  "description": "Description complète",
  "status": "active|inactive|draft",
  "priority": 1,
  "tags": ["tag1", "tag2"],
  "metadata": {
    "createdBy": "user-id-123",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T14:45:00Z",
    "version": 1
  },
  "relationships": {
    "parentId": null,
    "childIds": [],
    "relatedIds": ["other-doc-id"]
  },
  "content": {
    "title": "Titre principal",
    "body": "Contenu textuel",
    "attachments": []
  },
  "config": {
    "visible": true,
    "sortOrder": 0,
    "customSettings": {}
  },
  "_attachments": {}
}
```

### Schéma des Documents par Type

#### Document Type: `login`

| Champ | Type | Obligatoire | Description | Mapping Alpine |
|-------|------|-------------|-------------|----------------|
| `_id` | string | ✅ | ID unique du document (format: `{type}:{uuid}`) | `data.id` |
| `_rev` | string | ✅ | Révision CouchDB (auto-généré) | Géré par PouchDB |
| `type` | string | ✅ | Type du document (doit matcher `login`) | `data.type` |
| `name` | string | ✅ | Nom/label du document | `data.name` |
| `description` | string | ❌ | Description longue | `data.description` |
| `status` | enum | ✅ | État: `active`, `inactive`, `draft` | `data.status` |
| `priority` | number | ❌ | Niveau de priorité (1-10) | `data.priority` |
| `tags` | array | ❌ | Liste des tags | `data.tags` |
| `metadata` | object | ✅ | Métadonnées système | `data.metadata` |
| `metadata.createdBy` | string | ✅ | ID utilisateur créateur | `data.metadata.createdBy` |
| `metadata.createdAt` | string (ISO8601) | ✅ | Date de création | `data.metadata.createdAt` |
| `metadata.updatedAt` | string (ISO8601) | ✅ | Date de dernière modification | `data.metadata.updatedAt` |
| `metadata.version` | number | ✅ | Numéro de version | `data.metadata.version` |
| `relationships` | object | ❌ | Relations avec autres documents | `data.relationships` |
| `relationships.parentId` | string\|null | ❌ | ID du document parent | `data.relationships.parentId` |
| `relationships.childIds` | array | ❌ | IDs des documents enfants | `data.relationships.childIds` |
| `relationships.relatedIds` | array | ❌ | IDs des documents liés | `data.relationships.relatedIds` |
| `content` | object | ❌ | Contenu principal | `data.content` |
| `content.title` | string | ❌ | Titre principal | `data.content.title` |
| `content.body` | string | ❌ | Corps de texte | `data.content.body` |
| `content.attachments` | array | ❌ | Pièces jointes | `data.content.attachments` |
| `config` | object | ❌ | Configuration d'affichage | `data.config` |
| `config.visible` | boolean | ❌ | Visibilité | `data.config.visible` |
| `config.sortOrder` | number | ❌ | Ordre de tri | `data.config.sortOrder` |
| `config.customSettings` | object | ❌ | Paramètres personnalisés | `data.config.customSettings` |
| `_attachments` | object | ❌ | Attachments binaires (CouchDB) | Géré par PouchDB |

### Types de Documents Reconnus (Global)

```json
{
  "documentTypes": [
    {
      "type": "login",
      "description": "Description du type de document",
      "requiredFields": ["_id", "type", "name", "status"],
      "indexes": ["type", "status", "metadata.createdAt"]
    }
  ]
}
```

---

## Partie 2 : Structure des Données Alpine.js

> **⚠️ INSTRUCTION CRITIQUE POUR dev3.py**:
> 
> **AVANT** de générer cette section, lire impérativement:
> 1. **Les workflows frontend** (`workflows-frontend.md`) - pour comprendre les états et transitions
> 2. **Les mockups** (`mockups/` ou références UI) - pour identifier les champs interactifs et bindings
> 
> Les props Alpine.js dépendent DIRECTEMENT des workflows frontend et de l'UI. Ne pas générer de props génériques.

### Processus de Génération des Props

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Workflows      │     │   Mockups/UI     │     │  Props Alpine   │
│  Frontend       │  +  │   (bindings)     │  →  │  Générées       │
│                 │     │                  │     │                 │
│ - États UI      │     │ - x-model        │     │ - États réactifs│
│ - Transitions   │     │ - x-bind         │     │ - Computed      │
│ - Actions user  │     │ - @click         │     │ - Méthodes      │
│ - Events        │     │ - x-show/x-if    │     │ - Watchers      │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

### Structure Alpine.js Générée (Template)

```javascript
// Dans main.js - loginPage()
// GÉNÉRÉ APRÈS ANALYSE des workflows frontend + mockups

return {
    // ==========================================
    // ÉTAT GLOBAL (toujours présent)
    // ==========================================
    loading: false,           // État de chargement global
    error: null,              // Message d'erreur courant
    
    // ==========================================
    // ÉTAT UI (depuis workflows frontend)
    // ==========================================
    // TODO: Générer depuis les états définis dans workflows-frontend.md
    // Exemples:
    // isModalOpen: false,
    // activeTab: 'list',
    // selectedFilter: 'all',
    // viewMode: 'grid', // ou 'list'
    
    // ==========================================
    // DONNÉES PRINCIPALES (depuis CouchDB + UI)
    // ==========================================
    items: [],                // Liste des documents (sync PouchDB)
    currentItem: null,        // Document en cours d'édition/visualisation
    
    // TODO: Ajouter depuis l'analyse des mockups:
    // - Form data (champs du formulaire d'édition)
    // - Filter state (état des filtres)
    // - Sort config (configuration du tri)
    // - Pagination state (état pagination)
    
    // ==========================================
    // COMPUTED/DÉRIVÉS (depuis besoins UI)
    // ==========================================
    // TODO: Générer les computed properties:
    // get filteredItems() { ... }
    // get sortedItems() { ... }
    // get hasSelection() { ... }
    // get formIsValid() { ... }
    
    // ==========================================
    // MÉTHODES (depuis workflows frontend)
    // ==========================================
    async init() {
        // Workflow: initial-load
        await runWorkflow('initial-load');
    },
    
    // TODO: Générer depuis les workflows frontend:
    // async createItem() { ... }
    // async updateItem() { ... }
    // async deleteItem() { ... }
    // toggleSelection() { ... }
    // openModal() { ... }
    // closeModal() { ... }
    // applyFilter() { ... }
    // resetFilter() { ... }
    
    // ==========================================
    // SYNC POUCHDB (standard)
    // ==========================================
    syncFromPouch(doc) {
        // Mise à jour réactive depuis PouchDB
    }
}
```

### Mapping Détaillé (Template à Compléter)

> **Pour dev3.py**: Remplir ce tableau après analyse des workflows + mockups

| Source | Champ CouchDB | Variable Alpine | Binding HTML | Workflow Déclencheur |
|--------|---------------|-----------------|--------------|----------------------|
| Exemple | `_id` | `item.id` | `:key` | - |
| Exemple | `name` | `item.name` | `x-model` | `update-item` |
| Exemple | `status` | `item.status` | `:class` | `toggle-status` |
| TODO | - | - | - | - |

---

## Partie 3 : Workflows Data

### Workflow: `initial-load`

**Description**: Charge les données initiales depuis PouchDB

**Input**: Aucun

**Output**:
```javascript
{
    success: true,
    data: [
        { _id: "...", type: "login", ... },
        // ...
    ],
    meta: {
        total: 42,
        lastSync: "2024-01-15T10:30:00Z"
    }
}
```

**Mapping vers Alpine**:
- Les documents sont stockés dans `this.items`
- Les erreurs dans `this.error`
- Le timestamp dans `this.lastSync`

### Workflow: `save-item`

**Description**: Sauvegarde un document dans PouchDB

**Input**:
```javascript
{
    data: {
        _id: "optionnel",
        type: "login",
        name: "...",
        // ... autres champs du schéma
    },
    options: {
        validate: true,      // Valider avant sauvegarde
        generateId: true     // Générer ID si absent
    }
}
```

**Output**:
```javascript
{
    success: true,
    data: { _id: "...", _rev: "...", ... },
    operation: "create" | "update"
}
```

**Mapping vers Alpine**:
- Le document sauvegardé est ajouté/mis à jour dans `this.items`
- Le live sync met à jour automatiquement

### Workflow: `delete-item`

**Description**: Supprime un document de PouchDB

**Input**:
```javascript
{
    id: "document-id",
    confirm: true  // Nécessite confirmation
}
```

**Output**:
```javascript
{
    success: true,
    deleted: true,
    id: "document-id"
}
```

### Workflow: `sync-items`

**Description**: Synchronisation bidirectionnelle avec le serveur

**Input**:
```javascript
{
    direction: "pull" | "push" | "both",
    since: "last-seq"
}
```

---

## Partie 4 : Règles de Synchronisation

### Live Sync Configuration

```javascript
// Dans main.js - activation du live sync
this.syncHandler = db.changes({
    since: 'now',
    live: true,
    include_docs: true,
    filter: (doc) => doc.type === 'login'
}).on('change', (change) => {
    this.syncFromPouch(change.doc);
}).on('error', (err) => {
    this.error = `Sync error: ${err.message}`;
});
```

### Gestion des Conflits

```javascript
// Stratégie: "last-write-wins" avec warning
async resolveConflict(docId) {
    const doc = await db.get(docId, { conflicts: true });
    if (doc._conflicts) {
        // Log le conflit pour audit
        console.warn('Conflict detected:', docId, doc._conflicts);
        // Résolution automatique: garder la dernière révision
        // TODO: Implémenter stratégie métier si nécessaire
    }
}
```

### Validation des Données

Avant toute sauvegarde, valider:

1. **Type**: Vérifier que `type` correspond à `login`
2. **Champs requis**: Vérifier les champs marqués ✅ dans le schéma
3. **Types**: Vérifier que les valeurs correspondent aux types attendus
4. **Relations**: Vérifier l'existence des documents liés (si nécessaire)
5. **Unicité**: Vérifier les contraintes d'unicité (name, etc.)

```javascript
validateItem(data) {
    const errors = [];
    
    // Validation selon le schéma Partie 1
    if (!data.type || data.type !== 'login') {
        errors.push(`Type invalide: ${data.type}`);
    }
    if (!data.name || data.name.trim() === '') {
        errors.push('Le nom est obligatoire');
    }
    // ... autres validations
    
    return {
        valid: errors.length === 0,
        errors
    };
}
```

---

## Partie 5 : Règles de Binding (HTML → Alpine → PouchDB)

### ✅ À FAIRE

1. **Utiliser `x-model`** pour les formulaires avec validation
   ```html
   <input x-model="currentItem.name" @blur="validateField('name')">
   ```

2. **Toujours passer par un workflow** pour les modifications
   ```javascript
   // ❌ INTERDIT: modification directe
   this.items[0].name = 'Nouveau nom';
   
   // ✅ OBLIGATOIRE: via workflow
   await runWorkflow('update-item', { id, data: { name: 'Nouveau nom' }});
   ```

3. **Utiliser des clés stables** dans les boucles `x-for`
   ```html
   <template x-for="item in items" :key="item._id">
   ```

### ❌ À ÉVITER

1. **Jamais modifier `_id` ou `_rev`** manuellement
2. **Ne jamais stocker les documents PouchDB** directement dans des variables temporaires modifiables
3. **Éviter les bindings bidirectionnels directs** sur les données PouchDB (toujours via formulaire intermédiaire)

---

## Checklist pour dev3.py

- [ ] Lire et analyser `workflows-frontend.md` pour identifier les états UI
- [ ] Lire les mockups pour identifier les bindings et champs interactifs
- [ ] Générer le document exemple Partie 1 avec TOUTES les clés du schéma
- [ ] Générer les props Alpine Partie 2 basées sur l'analyse workflows+mockups
- [ ] Compléter le tableau de mapping Partie 2
- [ ] Valider la cohérence entre les 3 couches: CouchDB → PouchDB → Alpine
