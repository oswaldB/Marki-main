# Workflow : Fermer insight (PouchDB)

## Écran
`smart-marki.html`

## Élément déclencheur
Bouton avec `@click="closeInsight()"`

## Action
Fermer le panneau détail insight

## Description
- Masque l'insight sélectionné
- Retour à la liste des suggestions
- Action UI uniquement (pas de modification PouchDB)

## Data Model
**Page Function:** `smartMarkiPage()`

**Stores Alpine.js:**
- $store.ui

**Données (en mémoire):**
- `suggestions` - suggestions IA depuis PouchDB
- `selectedInsight` - suggestion actuellement affichée

**États UI:**
- `loading`
- `error`
- `processing`
- `chatOpen`

## State Changes

**Modifications:**
- `selectedInsight` passe à null
- Panneau de détail fermé

## PouchDB Operations

**Aucun** - Action UI uniquement (fermeture de panneau).

## Organisation des fichiers

```
frontend/
└── app/
    └── smart-marki/
        ├── index.html
        ├── components/
        │   └── (composants partagés)
        └── js/
            └── close-insight.js
```

### Fichier principal
- **HTML** : `frontend/app/smart-marki/index.html`
- **Point d'entrée** : Initialise la page Alpine.js avec PouchDB

### Fichier workflow
- **JS** : `frontend/app/smart-marki/js/close-insight.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/smart-marki/js/close-insight.js
export function closeInsight() {
  // Implementation avec PouchDB (action UI)
}
```

## Implementation (PouchDB)

```javascript
closeInsight() {
  // 1. Hide insight detail
  this.selectedInsight = null;
  
  // 2. Clear any errors
  this.error = null;
  
  // 3. Pas de modification PouchDB (action UI uniquement)
}
```

## Notes

- **Action UI uniquement** : Ce workflow ne touche pas à PouchDB
- **Pas de persistance** : La fermeture du panneau est une action temporaire
- **Offline** : ✅ Fonctionne offline

---

## Migration depuis l'ancienne architecture

| Aspect | Avant | Après (PouchDB) |
|--------|-------|-----------------|
| Action | Côté client uniquement | **Conservé** - Côté client |
| Persistance | Non persistante | **Conservé** - Non persistante |
| Latence | Instantanée | Instantanée |
| Offline | ✅ Oui | ✅ Oui |
