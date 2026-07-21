---
id: sequences-set-type-pouchdb
type: frontend
folder: workflows/frontend/sequences/
description: Sélectionner le type de séquence avec PouchDB (draft local + vues Mango)
depends_on: [create-sequence-pouchdb]
screen: sequences
global: false
sync_mode: local-only
---

# set-type-relance-pouchdb : Sélection Type Séquence (Local-First)

## Description

Version PouchDB du workflow `set-type-relance`. Action côté client pure avec persistance optionnelle du brouillon en local PouchDB.

### Différences avec la version REST

| Aspect | Version REST | Version PouchDB |
|--------|--------------|-----------------|
| Appels API | Aucun | Aucun (local-only) |
| Persistance | Non | Oui (`_local/sequence_draft`) |
| Vues | N/A | Mango query sur `type_sequence` |
| Real-time | N/A | Changes feed pour sync type |

## Architecture

```
┌─────────────────┐     setType()    ┌─────────────────┐
│  Alpine.js UI   │ ─────────────────▶ │   État local    │
│                 │                  │   (reactive)    │
│  @click="      │                  └────────┬────────┘
│   setType()"  │                           │
└─────────────────┘                           │ saveDraft()
                         ┌──────────────────┘
                         ▼
                ┌─────────────────┐
                │   PouchDB       │
                │   (_local/draft)│
                │   Non sync      │
                └─────────────────┘
```

## Étapes du Workflow

```javascript
/**
 * @action Définir le type de séquence (côté client)
 * @checkpoint type-set-client-side
 * 
 * - Met à jour selectedType dans l'état Alpine
 * - Déclenche les watchers réactifs
 * - Applique la configuration associée (icon, couleur, etc.)
 */

/**
 * @action Sauvegarder le brouillon en local (auto)
 * @checkpoint draft-saved-locally
 * 
 * - Document `_local/sequence_draft` (pas de sync CouchDB)
 * - Permet de restaurer le formulaire après refresh
 * - Supprimé après création réussie
 */

/**
 * @action Charger les séquences filtrées par type
 * @checkpoint sequences-loaded-by-type
 * 
 * - Requête Mango avec selector.type_sequence
 * - Utilise l'index idx-type-active-date
 * - Instantané (lecture depuis IndexedDB)
 */
```

## Modèle de Données

### Brouillon (Document Local)

```json
{
  "_id": "_local/sequence_draft",
  "_rev": "1-xxx",
  "type": "draft",
  "type_sequence": "relances",
  "nom": "Brouillon...",
  "updated_at": "2026-07-21T14:00:00Z",
  "_local": true
}
```

**Important** : Les documents `_local/` ne sont **jamais synchronisés** avec CouchDB.

### Index Mango pour type_sequence

```javascript
// Créé dans create-sequence-pouchdb.js
db.createIndex({
  index: {
    fields: ['type_sequence', 'actif', 'created_at'],
    name: 'idx-type-active-date'
  }
});
```

## API

### Fonctions Exportées

| Fonction | Description |
|----------|-------------|
| `setTypeRelance()` | Retourne config pour type "relances" |
| `setTypeSuivi()` | Retourne config pour type "suivi" |
| `saveDraftToPouchDB(data)` | Persiste le brouillon |
| `loadDraftFromPouchDB()` | Charge le brouillon |
| `clearDraftFromPouchDB()` | Supprime le brouillon |
| `getSequencesByType(type)` | Query Mango par type |
| `countSequencesByType()` | Compte relances/suivis |

## Configuration des Types

```javascript
typeConfig: {
  relances: {
    label: "Relance d'impayés",
    description: "Envoi automatique d'emails de relance...",
    icon: 'mail-alert',
    color: 'red',
    maxEmails: 5
  },
  suivi: {
    label: 'Suivi client',
    description: 'Communication post-règlement...',
    icon: 'check-circle',
    color: 'green',
    maxEmails: 3
  }
}
```

## Utilisation dans HTML

```html
<div x-data="sequencesPageWithTypeSelector()" x-init="init()">
  
  <!-- Sélecteur de type -->
  <div class="type-selector">
    <button 
      @click="setType('relances')"
      :class="{ active: selectedType === 'relances' }"
    >
      <span x-text="typeConfig.relances.icon"></span>
      Relances
    </button>
    
    <button 
      @click="setType('suivi')"
      :class="{ active: selectedType === 'suivi' }"
    >
      <span x-text="typeConfig.suivi.icon"></span>
      Suivi
    </button>
  </div>
  
  <!-- Info du type sélectionné -->
  <div x-show="currentTypeConfig" class="type-info">
    <h3 x-text="currentTypeConfig.label"></h3>
    <p x-text="currentTypeConfig.description"></p>
  </div>
  
  <!-- Badge brouillon -->
  <div x-show="draftLoaded" class="draft-badge">
    Brouillon restauré
  </div>
  
</div>
```

## Fichiers

```
workflows/frontend/sequences/
├── set-type-relance-pouchdb.js    # Implémentation
├── set-type-relance-pouchdb.md     # Documentation
└── create-sequence-pouchdb.js      # Dépendance (index Mango)
```

## Dépendances

- `create-sequence-pouchdb.js` (pour l'initialisation PouchDB et les index)
- PouchDB avec plugin pouchdb-find

## Notes

- **Aucun appel réseau** : Cette action est 100% locale
- **Brouillon temporaire** : Supprimé après création réussie
- **Index requis** : L'index `idx-type-active-date` doit exister
- **Changes feed** : Optionnel, pour sync temps réel du type
