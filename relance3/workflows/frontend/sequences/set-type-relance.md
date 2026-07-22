# Workflow : Sélectionner type Relance (PouchDB)

## Écran
`sequences.html`

## Élément déclencheur
Bouton avec `@click="newSequence.type = 'relance'"`

## Action
Définir le type de séquence à Relance

## Description
- Prépare une séquence de relance d'impayés
- Aucune opération PouchDB (action UI uniquement)

## Data Model
**Page Function:** `sequencesPage()`

**Stores Alpine.js:**
- $store.ui

**Données (en mémoire):**
- `sequences` - séquences depuis PouchDB
- `searchQuery`
- `filterType`
- `newSequence` - données du formulaire

**États UI:**
- `loading`
- `error`
- `showNewSequenceModal`
- `showEditSequenceModal`
- `showDeleteModal`
- `editingSequence`
- `deletingSequence`

## State Changes

**Modifications:**
- `newSequence.type_sequence` ← `'relances'`

## PouchDB Operations

**Aucun** - Ce workflow est une action UI. Il ne modifie pas PouchDB.

## API Calls

**Pas d'appel API** - Action côté client uniquement

## Organisation des fichiers

```
frontend/
└── app/
    └── sequences/
        ├── index.html
        ├── components/
        │   └── (composants partagés)
        └── js/
            └── set-type-relance.js
```

### Fichier principal
- **HTML** : `frontend/app/sequences/index.html`
- **Point d'entrée** : Initialise la page Alpine.js avec PouchDB

### Fichier workflow
- **JS** : `frontend/app/sequences/js/set-type-relance.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/sequences/js/set-type-relance.js
export function setTypeRelance() {
  // Implementation avec PouchDB (pas d'opération DB)
}
```

## Implementation

```javascript
setTypeRelance() {
  // Met à jour le type de la nouvelle séquence
  this.newSequence.type_sequence = 'relances';
}

// Alternative avec paramètre
setSequenceType(type) {
  this.newSequence.type_sequence = type;
}
```

## Notes

- **Action UI uniquement** : Ce workflow ne touche pas à PouchDB
- **Préparation** : Prépare le formulaire avant création dans PouchDB
- **Instantané** : La sélection est immédiate

---

## Migration depuis l'ancienne architecture

| Aspect | Avant | Après (PouchDB) |
|--------|-------|-----------------|
| Action | Côté client | **Conservé** - Côté client |
| Source données | Props/Store | PouchDB (déjà chargé) |
| Latence | Instantanée | Instantanée |
| Offline | ✅ Oui | ✅ Oui |
