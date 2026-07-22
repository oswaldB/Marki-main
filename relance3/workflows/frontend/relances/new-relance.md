# Workflow : Nouvelle relance (PouchDB)

## Écran
`relances.html`

## Élément déclencheur
Bouton avec `@click="openNewRelanceModal(payeur)"`

## Action
Ouvrir le modal de création d'une relance

## Description
- Affiche le formulaire de nouvelle relance
- Pré-remplit avec les infos du payeur (depuis PouchDB)
- Permet de choisir type et contenu
- Les données de référence (séquences, templates) sont chargées depuis PouchDB

## Data Model
**Page Function:** `relancesPage()`

**Stores Alpine.js:**
- $store.ui

**Données (depuis PouchDB):**
- `payeurs` - payeurs depuis PouchDB
- `stats` - statistiques calculées côté client
- `sequences` - séquences depuis PouchDB
- `searchQuery`
- `filterStatut`
- `editorContent`
- `editorMode`
- `db` - instance PouchDB

**États UI:**
- `loading`
- `error`
- `expandedPayeur`
- `showNewRelanceModal`
- `showEditRelanceModal`
- `showSequenceModal`

## State Changes

**Modifications:**
- `newRelance` ← initialisé avec les données du payeur
- `showNewRelanceModal` ← `true`

## PouchDB Operations

**Aucun** - Ce workflow est une action UI qui prépare la création. Les données affichées (payeurs, séquences) proviennent de PouchDB (chargées par `initial-load`), mais ce workflow n'effectue aucune opération de base de données.

La création effective de la relance dans PouchDB est effectuée par le workflow `create-relance.md`.

## API Calls

**Pas d'appel API pour l'ouverture** - Le modal est purement côté client avec des données PouchDB déjà chargées.

> **Note** : Le bouton "Créer" déclenche un workflow séparé `create-relance.md` qui utilise PouchDB (`db.put()`).

## Organisation des fichiers

```
frontend/
└── app/
    └── relances/
        ├── index.html
        ├── components/
        │   └── (composants partagés)
        └── js/
            └── new-relance.js
```

### Fichier principal
- **HTML** : `frontend/app/relances/index.html`
- **Point d'entrée** : Initialise la page Alpine.js avec PouchDB

### Fichier workflow
- **JS** : `frontend/app/relances/js/new-relance.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/relances/js/new-relance.js
export function newRelance() {
  // Implementation avec données PouchDB
}
```

## Implementation

```javascript
newRelance(payeur) {
  // 1. Reset form avec les données du payeur depuis PouchDB
  this.newRelance = {
    ...this.getInitialState(),
    contact_id: payeur._id,
    contact_nom: payeur.nom,
    contact_email: payeur.email
  };
  
  // 2. Charger les séquences depuis PouchDB si pas déjà chargées
  if (!this.sequences?.length) {
    this.loadSequencesFromPouchDB();
  }
  
  // 3. Show modal
  this.showNewRelanceModal = true;
  
  // 4. Focus first input
  this.$nextTick(() => {
    this.$refs.firstInput?.focus();
  });
}

async loadSequencesFromPouchDB() {
  try {
    const result = await dbSequences.allDocs({
      startkey: 'sequence:',
      endkey: 'sequence:\ufff0',
      include_docs: true
    });
    this.sequences = result.rows.map(r => r.doc);
  } catch (error) {
    console.error('Erreur chargement séquences:', error);
  }
}

getInitialState() {
  return {
    contact_id: null,
    contact_nom: '',
    contact_email: '',
    sequence_id: null,
    impaye_ids: [],
    objet: '',
    corps: '',
    statut: 'brouillon'
  };
}
```

## Notes

- **Action UI uniquement** : Ce workflow prépare le formulaire mais ne crée pas encore la relance dans PouchDB
- **Données PouchDB** : Les payeurs et séquences sont chargés depuis PouchDB (par `initial-load` ou à la volée)
- **Création effective** : Voir workflow `create-relance.md` pour la persistence dans PouchDB
- **Instantané** : L'ouverture du modal est immédiate avec les données en mémoire

---

## Migration depuis l'ancienne architecture

| Aspect | Avant | Après (PouchDB) |
|--------|-------|-----------------|
| Action | Côté client | **Conservé** - Côté client |
| Source données payeur | Props/Store | PouchDB (déjà chargé) |
| Source séquences | API si besoin | PouchDB local |
| Pré-remplissage | Données API | Données PouchDB |
| Latence | Instantanée | Instantanée |
| Offline | ✅ Oui | ✅ Oui |
