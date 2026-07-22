# Workflow : Annuler suppression profil SMTP (PouchDB)

## Écran
`settings-smtp.html`

## Élément déclencheur
Bouton avec `@click="cancelDeleteProfil()"`

## Action
Annuler la suppression du profil

## Description
- Ferme le modal de confirmation global
- Réinitialise le profil en cours de suppression
- Action UI uniquement (pas de modification PouchDB)

## Data Model
**Page Function:** `settingsSmtpPage()`

**Stores Alpine.js:**
- $store.ui

**Données (en mémoire):**
- `profils` - profils SMTP depuis PouchDB
- `deletingProfil` - profil en cours de suppression

**États UI:**
- `loading`
- `error`
- `showDeleteModal`

## State Changes

**Modifications:**
- `deletingProfil` réinitialisé à null
- `showDeleteModal` ← false
- Modal confirmation global fermé

## PouchDB Operations

**Aucun** - Action UI uniquement (fermeture de modal).

## Organisation des fichiers

```
frontend/
└── app/
    └── settings-smtp/
        ├── index.html
        ├── components/
        │   └── (composants partagés)
        └── js/
            └── cancel-delete-profil.js
```

### Fichier principal
- **HTML** : `frontend/app/settings-smtp/index.html`
- **Point d'entrée** : Initialise la page Alpine.js avec PouchDB

### Fichier workflow
- **JS** : `frontend/app/settings-smtp/js/cancel-delete-profil.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/settings-smtp/js/cancel-delete-profil.js
export function cancelDeleteProfil() {
  // Implementation avec PouchDB (action UI)
}
```

## Implementation (PouchDB)

```javascript
cancelDeleteProfil() {
  // 1. Fermer modal confirmation global
  this.showDeleteModal = false;
  
  // 2. Reset deleting profil
  this.deletingProfil = null;
  
  // 3. Pas de modification PouchDB (action UI uniquement)
}
```

## Notes

- **Action UI uniquement** : Ce workflow ne touche pas à PouchDB
- **Pas de persistance** : L'annulation de suppression est une action temporaire
- **Offline** : ✅ Fonctionne offline

---

## Migration depuis l'ancienne architecture

| Aspect | Avant | Après (PouchDB) |
|--------|-------|-----------------|
| Action | Côté client uniquement | **Conservé** - Côté client |
| Persistance | Non persistante | **Conservé** - Non persistante |
| Latence | Instantanée | Instantanée |
| Offline | ✅ Oui | ✅ Oui |
