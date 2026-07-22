# Workflow : Déplier/Replier email (PouchDB)

## Écran
`sequences-suivi-detail.html`

## Élément déclencheur
Bouton avec `@click="toggleCollapse(email)"`

## Action
Basculer l'affichage d'un email

## Description
- Déplie pour éditer
- Replie pour compacter la vue
- Action UI uniquement (pas de persistance nécessaire)

## Data Model
**Page Function:** `sequencesSuiviDetailPage()`

**Stores Alpine.js:**
- $store.ui

**Données (en mémoire):**
- `sequence` - séquence depuis PouchDB
- `etapes` - emails de la séquence
- `typeRelanceOptions`
- `selectedType`

**États UI:**
- `loading`
- `error`
- `saving`
- `hasChanges`

## State Changes

**Modifications:**
- `email.collapsed` ← toggled

**Note** : Cette action modifie uniquement l'état UI local. Aucune persistance nécessaire car c'est juste un état d'affichage.

## PouchDB Operations

**Aucun** - Action UI uniquement (état d'affichage local).

## Organisation des fichiers

```
frontend/
└── app/
    └── sequences-suivi-detail/
        ├── index.html
        ├── components/
        │   └── (composants partagés)
        └── js/
            └── toggle-collapse.js
```

### Fichier principal
- **HTML** : `frontend/app/sequences-suivi-detail/index.html`
- **Point d'entrée** : Initialise la page Alpine.js avec PouchDB

### Fichier workflow
- **JS** : `frontend/app/sequences-suivi-detail/js/toggle-collapse.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/sequences-suivi-detail/js/toggle-collapse.js
export function toggleCollapse(email) {
  // Implementation avec PouchDB (action UI)
}
```

## Implementation (PouchDB)

```javascript
toggleCollapse(email) {
  // 1. Toggle l'état d'affichage
  email.collapsed = !email.collapsed;
  
  // 2. Pas de persistance nécessaire (état UI uniquement)
}
```

## Notes

- **Action UI uniquement** : Ce workflow ne touche pas à PouchDB
- **Pas de persistance** : L'état collapsed est temporaire et local
- **Offline** : ✅ Fonctionne offline

---

## Migration depuis l'ancienne architecture

| Aspect | Avant | Après (PouchDB) |
|--------|-------|-----------------|
| Action | Côté client uniquement | **Conservé** - Côté client |
| Persistance | Non persistante | **Conservé** - Non persistante |
| Latence | Instantanée | Instantanée |
| Offline | ✅ Oui | ✅ Oui |
