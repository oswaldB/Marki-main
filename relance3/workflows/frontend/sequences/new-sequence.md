# Workflow : Nouvelle séquence (PouchDB)

## Écran
`sequences.html`

## Élément déclencheur
Bouton avec `@click="showNewSequenceModal = true"`

## Action
Ouvrir le modal de création de séquence

## Description
- Affiche le formulaire de nouvelle séquence
- Demande le type (relance ou suivi)
- Permet de nommer la séquence
- Aucune opération PouchDB à ce stade

## Data Model
**Page Function:** `sequencesPage()`

**Stores Alpine.js:**
- $store.ui

**Données (en mémoire):**
- `sequences` - séquences depuis PouchDB
- `searchQuery`
- `filterType`
- `newSequence`

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
- `newSequence` ← initialisé avec valeurs par défaut
- `showNewSequenceModal` ← `true`

## PouchDB Operations

**Aucun** - Ce workflow est une action UI qui prépare la création. La persistence est effectuée par `create-sequence.md`.

## API Calls

**Pas d'appel API pour l'ouverture** - Le modal est purement côté client.

> **Note** : Le bouton "Créer" déclenche un workflow séparé `create-sequence.md` qui utilise PouchDB (`db.put()`).

## Organisation des fichiers

```
frontend/
└── app/
    └── sequences/
        ├── index.html
        ├── components/
        │   └── (composants partagés)
        └── js/
            └── new-sequence.js
```

### Fichier principal
- **HTML** : `frontend/app/sequences/index.html`
- **Point d'entrée** : Initialise la page Alpine.js avec PouchDB

### Fichier workflow
- **JS** : `frontend/app/sequences/js/new-sequence.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/sequences/js/new-sequence.js
export function newSequence() {
  // Implementation avec PouchDB (pas d'opération DB)
}
```

## Implementation

```javascript
newSequence() {
  // 1. Reset form
  this.newSequence = this.getInitialState();
  
  // 2. Show modal
  this.showNewSequenceModal = true;
  
  // 3. Focus first input
  this.$nextTick(() => {
    this.$refs.firstInput?.focus();
  });
}

getInitialState() {
  return {
    nom: '',
    type_sequence: 'relances', // default
    actif: true
  };
}
```

## Notes

- **Action UI uniquement** : Ce workflow prépare le formulaire mais ne crée pas encore dans PouchDB
- **Création effective** : Voir workflow `create-sequence.md` pour la persistence dans PouchDB
- **Instantané** : L'ouverture du modal est immédiate

---

## Migration depuis l'ancienne architecture

| Aspect | Avant | Après (PouchDB) |
|--------|-------|-----------------|
| Action | Côté client | **Conservé** - Côté client |
| Source données | Props/Store | PouchDB (déjà chargé) |
| Latence | Instantanée | Instantanée |
| Offline | ✅ Oui | ✅ Oui |
