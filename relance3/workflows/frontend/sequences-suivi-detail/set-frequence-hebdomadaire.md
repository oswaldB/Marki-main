# Workflow : Fréquence hebdomadaire (PouchDB)

## Écran
`sequences-suivi-detail.html`

## Élément déclencheur
Bouton avec `@click="setFrequenceHebdomadaire(email)"`

## Action
Définir la fréquence à hebdomadaire

## Description
- Envoi une fois par semaine
- Jour et heure configurables
- Modification UI uniquement, persistance via PouchDB au moment de la sauvegarde

## Data Model
**Page Function:** `sequencesSuiviDetailPage()`

**Stores Alpine.js:**
- $store.ui

**Données (depuis PouchDB):**
- `sequence` - séquence depuis PouchDB
- `etapes` - emails de la séquence
- `typeRelanceOptions`
- `selectedType`
- `db` - instance PouchDB

**États UI:**
- `loading`
- `error`
- `saving`
- `hasChanges`

## State Changes

**Modifications:**
- `email.frequence` ← `'hebdomadaire'`
- `hasChanges` ← `true` (modification non sauvegardée)

**Note** : Cette action modifie uniquement l'état UI local. La persistance dans PouchDB se fait via le workflow `sauvegarder`.

## PouchDB Operations

**Aucun** - Action UI uniquement.

**Persistance** : Les modifications sont sauvegardées dans PouchDB lors de l'appel à `sauvegarder()` (workflow séparé).

## Organisation des fichiers

```
frontend/
└── app/
    └── sequences-suivi-detail/
        ├── index.html
        ├── components/
        │   └── (composants partagés)
        └── js/
            └── set-frequence-hebdomadaire.js
```

### Fichier principal
- **HTML** : `frontend/app/sequences-suivi-detail/index.html`
- **Point d'entrée** : Initialise la page Alpine.js avec PouchDB

### Fichier workflow
- **JS** : `frontend/app/sequences-suivi-detail/js/set-frequence-hebdomadaire.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/sequences-suivi-detail/js/set-frequence-hebdomadaire.js
export function setFrequenceHebdomadaire(email) {
  // Implementation avec PouchDB (action UI)
}
```

## Implementation (PouchDB)

```javascript
setFrequenceHebdomadaire(email) {
  // 1. Mettre à jour l'état UI local
  email.frequence = 'hebdomadaire';
  
  // 2. Valeurs par défaut pour hebdomadaire
  email.jour_semaine = email.jour_semaine || 1; // Lundi par défaut
  
  // 3. Marquer comme modifié
  this.hasChanges = true;
  
  // 4. Les modifications seront persistées dans PouchDB
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
