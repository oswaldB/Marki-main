# Workflow : Fermer le panneau édition (PouchDB)

## Écran
`relances-calendrier.html`

## Élément déclencheur
Bouton avec `@click="closeEditPanel()"`

## Action
Fermer le panneau d'édition de relance

## Description
- Ferme sans sauvegarder (aucune opération PouchDB)
- Retour au calendrier
- Réinitialise l'état d'édition

## Data Model
**Page Function:** `relancesCalendrierPage()`

**Stores Alpine.js:**
- $store.ui

**Données (en mémoire, provenant de PouchDB):**
- `relancesProgrammees` - relances programmées depuis PouchDB
- `currentDate`
- `viewMode`
- `selectedDate`
- `relancesDuJour`
- `selectedRelance` (relance en cours d'édition)
- `db` - instance PouchDB

**États UI:**
- `loading`
- `error`

## State Changes

**Modifications:**
- `selectedRelance` ← `null`
- `error` ← `null`
- `editingMode` ← `false` (si applicable)

## PouchDB Operations

**Aucun** - Ce workflow est purement une action UI. Il ne modifie pas PouchDB.

Si des modifications ont été faites dans le panneau d'édition sans sauvegarder, elles sont perdues à la fermeture. Pour sauvegarder, utiliser le workflow `save-relance.md` ou équivalent.

## API Calls

**Pas d'appel API** - Action côté client uniquement

## Organisation des fichiers

```
frontend/
└── app/
    └── relances-calendrier/
        ├── index.html
        ├── components/
        │   └── (composants partagés)
        └── js/
            └── close-edit-panel.js
```

### Fichier principal
- **HTML** : `frontend/app/relances-calendrier/index.html`
- **Point d'entrée** : Initialise la page Alpine.js avec PouchDB

### Fichier workflow
- **JS** : `frontend/app/relances-calendrier/js/close-edit-panel.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/relances-calendrier/js/close-edit-panel.js
export function closeEditPanel() {
  // Implementation avec PouchDB (pas d'opération DB)
}
```

## Implementation

```javascript
closeEditPanel() {
  // 1. Reset selected relance (ferme le panneau)
  this.selectedRelance = null;
  
  // 2. Clear any validation errors
  this.error = null;
  
  // 3. Reset editing mode
  this.editingMode = false;
  
  // 4. Clear temporary form data
  this.editFormData = null;
}

// Option: Fermer avec confirmation si modifications non sauvegardées
closeEditPanelWithConfirm() {
  if (this.hasUnsavedChanges) {
    if (!confirm('Des modifications non sauvegardées seront perdues. Continuer ?')) {
      return;
    }
  }
  this.closeEditPanel();
}
```

## Notes

- **Action UI uniquement** : Ce workflow ne touche pas à PouchDB
- **Données PouchDB** : Les relances affichées proviennent de PouchDB (chargées par `initial-load`)
- **Pas d'annulation** : Les modifications non sauvegardées sont perdues
- **Instantané** : La fermeture est immédiate

---

## Migration depuis l'ancienne architecture

| Aspect | Avant | Après (PouchDB) |
|--------|-------|-----------------|
| Action | Côté client | **Conservé** - Côté client |
| Source données | Props/Store | PouchDB (déjà chargé) |
| Sauvegarde | API si besoin | PouchDB (`db.put()`) dans workflow séparé |
| Latence | Instantanée | Instantanée |
| Offline | ✅ Oui | ✅ Oui |
