# Workflow : Déplier/Replier un payeur (PouchDB)

## Écran
`relances.html`

## Élément déclencheur
Bouton avec `@click="togglePayeur(payeur.id)"`

## Action
Afficher/masquer les relances d'un payeur

## Description
- Déplie la section du payeur
- Affiche la liste de ses relances (données déjà chargées depuis PouchDB)
- Anime l'icône de toggle

## Data Model
**Page Function:** `relancesPage()`

**Stores Alpine.js:**
- $store.ui

**Données (depuis PouchDB, déjà chargées):**
- `payeurs` - payeurs depuis PouchDB (chargés par `initial-load`)
- `stats` - statistiques calculées côté client
- `sequences` - séquences depuis PouchDB
- `searchQuery`
- `filterStatut`
- `editorContent`
- `editorMode`

**États UI:**
- `loading`
- `error`
- `expandedPayeur` - état d'expansion du payeur
- `showNewRelanceModal`
- `showEditRelanceModal`
- `showSequenceModal`

## State Changes

**Modifications:**
- `expandedPayeur` ← ID du payeur déplié (ou null si tous repliés)
- États UI spécifiques selon implémentation

## PouchDB Operations

**Aucun** - Ce workflow est purement une action UI. Les données des relances sont déjà chargées depuis PouchDB par le workflow `initial-load` ou d'autres workflows.

Ce workflow se contente de basculer l'état d'affichage (expand/collapse) d'un payeur dans l'interface.

## API Calls

**Pas d'appel API** - Action côté client uniquement avec données PouchDB déjà chargées

## Organisation des fichiers

```
frontend/
└── app/
    └── relances/
        ├── index.html
        ├── components/
        │   └── (composants partagés)
        └── js/
            └── toggle-payeur.js
```

### Fichier principal
- **HTML** : `frontend/app/relances/index.html`
- **Point d'entrée** : Initialise la page Alpine.js avec PouchDB

### Fichier workflow
- **JS** : `frontend/app/relances/js/toggle-payeur.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/relances/js/toggle-payeur.js
export function togglePayeur() {
  // Implementation avec données PouchDB déjà chargées
}
```

## Implementation

```javascript
togglePayeur(payeurId) {
  // 1. Toggle l'état d'expansion
  if (this.expandedPayeur === payeurId) {
    // Replier si déjà déplié
    this.expandedPayeur = null;
  } else {
    // Déplier le payeur
    this.expandedPayeur = payeurId;
    
    // 2. Optionnel: charger les relances du payeur si pas déjà en mémoire
    // Les données proviennent de PouchDB (déjà chargées par initial-load)
    this.filterRelancesByPayeur(payeurId);
  }
}

// Filtrer les relances affichées pour un payeur spécifique
filterRelancesByPayeur(payeurId) {
  // Les relances sont déjà chargées depuis PouchDB
  this.relancesAffichees = this.relances.filter(
    r => r.contact_id === payeurId
  );
}

// Version avec animation
togglePayeurWithAnimation(payeurId) {
  const wasExpanded = this.expandedPayeur === payeurId;
  
  // Replier tous d'abord (optionnel - pour accordéon single-open)
  this.expandedPayeur = wasExpanded ? null : payeurId;
  
  // L'animation CSS gère le reste via transitions
}
```

## Notes

- **Action UI uniquement** : Ce workflow ne touche pas à PouchDB
- **Données PouchDB** : Les relances sont chargées depuis PouchDB par d'autres workflows
- **Instantané** : Le dépliage/repliage est immédiat
- **Performance** : Aucun chargement de données à ce moment, tout est déjà en mémoire

---

## Migration depuis l'ancienne architecture

| Aspect | Avant | Après (PouchDB) |
|--------|-------|-----------------|
| Action | Côté client | **Conservé** - Côté client |
| Source données | Props/Store | PouchDB (déjà chargé) |
| Latence | Instantanée | Instantanée |
| Offline | ✅ Oui | ✅ Oui |
