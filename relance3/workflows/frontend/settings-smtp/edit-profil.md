# Workflow : Éditer profil SMTP (PouchDB)

## Écran
`settings-smtp.html`

## Élément déclencheur
Bouton avec `@click="editProfil(profil)"`

## Action
Ouvrir l'édition du profil

## Description
- Charge le profil dans le formulaire depuis PouchDB
- Permet de modifier les paramètres
- Sauvegarde via le workflow `create-profil.md` (partagé création/édition)

## Data Model
**Page Function:** `settingsSmtpPage()`

**Stores Alpine.js:**
- $store.ui

**Données (depuis PouchDB):**
- `profils` - profils SMTP depuis PouchDB
- `newProfil` - copie du profil à éditer
- `db` - instance PouchDB

**États UI:**
- `loading`
- `error`
- `showNewProfilForm`
- `testingProfil`
- `isEditing` - flag pour différencier création/édition

## State Changes

**Modifications:**
- `newProfil` ← copie du profil à éditer (avec `_id` et `_rev`)
- `showNewProfilForm` ← true
- `isEditing` ← true

## PouchDB Operations

**Lecture** - Récupérer le document depuis PouchDB pour édition (optionnel, peut utiliser la copie locale).

**Note** : La sauvegarde se fait via le workflow `create-profil.md` avec `db.put()`.

## Organisation des fichiers

```
frontend/
└── app/
    └── settings-smtp/
        ├── index.html
        ├── components/
        │   └── (composants partagés)
        └── js/
            └── edit-profil.js
```

### Fichier principal
- **HTML** : `frontend/app/settings-smtp/index.html`
- **Point d'entrée** : Initialise la page Alpine.js avec PouchDB

### Fichier workflow
- **JS** : `frontend/app/settings-smtp/js/edit-profil.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/settings-smtp/js/edit-profil.js
export async function editProfil(profil) {
  // Implementation avec PouchDB
}
```

## Implementation (PouchDB)

```javascript
async editProfil(profil) {
  try {
    // 1. Récupérer le document depuis PouchDB pour avoir la dernière révision
    const doc = await db.get(profil._id);
    
    // 2. Clone item to form avec toutes les données
    this.newProfil = { ...doc };
    
    // 3. Marquer comme mode édition
    this.isEditing = true;
    
    // 4. Show form (même modal que création)
    this.showNewProfilForm = true;
    
  } catch (error) {
    this.toast('Erreur lors du chargement du profil', 'error');
  }
}
```

## Notes

- **Récupération PouchDB** : On récupère le document pour avoir la dernière révision (`_rev`)
- **Mode édition** : Flag `isEditing` pour différencier création/édition dans le formulaire
- **Sauvegarde** : Partagée avec `create-profil.md` via `db.put()`

---

## Migration depuis l'ancienne architecture

| Aspect | Avant | Après (PouchDB) |
|--------|-------|-----------------|
| Chargement | Côté client (copie) | `db.get()` pour récupérer dernière révision |
| Persistance | Non persistante (préparation) | **Conservé** - Non persistante (préparation) |
| Sauvegarde | `PUT /api/smtp-profiles/:id` | `db.put()` (partagé avec création) |
| Latence | Instantanée | ~10-50ms (lecture PouchDB) |
| Offline | ❌ Impossible | ✅ Fonctionne offline |
