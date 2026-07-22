# Workflow : Scénario impayé unique (PouchDB)

## Écran
`sequences-relance-detail.html`

## Élément déclencheur
Onglet avec `@click="selectScenarioSingle(email)"`

## Action
Sélectionner le scénario "impayé unique"

## Description
- Pour un seul impayé
- Contenu personnalisé simple
- Modification UI uniquement, persistance via PouchDB au moment de la sauvegarde

## Data Model
**Page Function:** `sequencesRelanceDetailPage()`

**Stores Alpine.js:**
- $store.ui

**Données (depuis PouchDB):**
- `sequence` - séquence depuis PouchDB
- `etapes` - emails de la séquence
- `modeles`
- `activeTab`
- `draggingEtape`
- `editingEtape`
- `editorInstance`
- `db` - instance PouchDB

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
- `email.activeScenario` ← `'single'`
- `hasChanges` ← `true` (modification non sauvegardée)

**Note** : Cette action modifie uniquement l'état UI local. La persistance dans PouchDB se fait via le workflow `sauvegarder`.

## PouchDB Operations

**Aucun** - Action UI uniquement.

**Persistance** : Les modifications sont sauvegardées dans PouchDB lors de l'appel à `sauvegarder()` (workflow séparé).

## Organisation des fichiers

```
frontend/
└── app/
    └── sequences-relance-detail/
        ├── index.html
        ├── components/
        │   └── (composants partagés)
        └── js/
            └── select-scenario-single.js
```

### Fichier principal
- **HTML** : `frontend/app/sequences-relance-detail/index.html`
- **Point d'entrée** : Initialise la page Alpine.js avec PouchDB

### Fichier workflow
- **JS** : `frontend/app/sequences-relance-detail/js/select-scenario-single.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/sequences-relance-detail/js/select-scenario-single.js
export function selectScenarioSingle(email) {
  // Implementation avec PouchDB (action UI)
}
```

## Implementation (PouchDB)

```javascript
selectScenarioSingle(email) {
  // 1. Mettre à jour l'état UI local
  email.activeScenario = 'single';
  
  // 2. Marquer comme modifié
  this.hasChanges = true;
  
  // 3. Les modifications seront persistées dans PouchDB
  //    lors de l'appel à sauvegarder()
}
```

## Notes

- **Action UI uniquement** : Ce workflow ne touche pas directement à PouchDB
- **Persistance différée** : Les modifications sont sauvegardées via le workflow `sauvegarder`
- **Gestion des états** : `hasChanges` permet d'indiquer qu'une sauvegarde est nécessaire

---

## Migration depuis l'ancienne architecture

| Aspect | Avant | Après (PouchDB) |
|--------|-------|-----------------|
| Action | Côté client uniquement | **Conservé** - Côté client |
| Persistance | API `PUT /api/sequences/:id` (via sauvegarder) | `db.put()` via workflow `sauvegarder` |
| Latence | Instantanée UI | Instantanée UI |
| Offline | ✅ Oui | ✅ Oui (sauvegarde différée) |
