# Workflow : Supprimer profil SMTP - affichage confirmation (PouchDB)

## Écran
`settings-smtp.html`

## Élément déclencheur
Bouton avec `@click="confirmDeleteProfil(profil)"`

## Action
Afficher la modale de confirmation de suppression

## Description
- Stocke le profil à supprimer
- Affiche la modale de confirmation
- Le workflow `confirm-delete.md` s'occupe de la suppression effective dans PouchDB

## Data Model
**Page Function:** `settingsSmtpPage()`

**Stores Alpine.js:**
- $store.ui

**Données (en mémoire):**
- `deletingProfil` (profil en cours de suppression)
- `profils` - profils SMTP depuis PouchDB

**États UI:**
- `showDeleteModal`

## State Changes

**Modifications:**
- `deletingProfil` ← profil à supprimer
- `showDeleteModal` ← true

## PouchDB Operations

**Aucun** - Action UI uniquement (affichage de modale).

**Note** : La suppression effective est gérée par `confirm-delete.md` avec PouchDB.

## Organisation des fichiers

```
frontend/
└── app/
    └── settings-smtp/
        ├── index.html
        ├── components/
        │   └── (composants partagés)
        └── js/
            └── delete-profil.js
```

### Fichier principal
- **HTML** : `frontend/app/settings-smtp/index.html`
- **Point d'entrée** : Initialise la page Alpine.js avec PouchDB

### Fichier workflow
- **JS** : `frontend/app/settings-smtp/js/delete-profil.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/settings-smtp/js/delete-profil.js
export function confirmDeleteProfil(profil) {
  // Implementation avec PouchDB (action UI)
}
```

## Implementation (PouchDB)

```javascript
confirmDeleteProfil(profil) {
  // 1. Stocker le profil à supprimer
  this.deletingProfil = profil;
  
  // 2. Afficher modal confirmation
  this.showDeleteModal = true;
  
  // 3. Pas de modification PouchDB (action UI uniquement)
  // La suppression effective est gérée par confirmDeleteProfil() (confirm-delete.md)
}
```

## Notes

- Ce workflow ne fait que préparer et afficher la modale
- Le bouton "Confirmer" dans la modale déclenche `confirmDeleteProfil()` (confirm-delete.md)
- La suppression effective se fait dans PouchDB

---

## Migration depuis l'ancienne architecture

| Aspect | Avant | Après (PouchDB) |
|--------|-------|-----------------|
| Action | Côté client uniquement | **Conservé** - Côté client |
| Persistance | Non persistante | **Conservé** - Non persistante (affichage modale) |
| Latence | Instantanée | Instantanée |
| Offline | ✅ Oui | ✅ Oui |
