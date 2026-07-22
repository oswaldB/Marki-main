# Workflow : Afficher/Masquer mot de passe (PouchDB)

## Écran
`settings-smtp-detail.html`

## Élément déclencheur
Bouton avec `@click="togglePassword()"`

## Action
Basculer la visibilité du mot de passe

## Description
- Affiche en clair ou masqué
- Icône œil
- Action UI uniquement (pas de modification PouchDB)

## Data Model
**Page Function:** `settingsSmtpDetailPage()`

**Stores Alpine.js:**
- $store.ui

**Données (en mémoire):**
- `profil` - profil SMTP depuis PouchDB
- `editedProfil` - profil en cours d'édition

**États UI:**
- `loading`
- `error`
- `saving`
- `editMode`
- `showPassword`

## State Changes

**Modifications:**
- `showPassword` ← toggled

**Note** : Cette action modifie uniquement l'état UI local. Aucune persistance nécessaire.

## PouchDB Operations

**Aucun** - Action UI uniquement (état d'affichage local).

## Organisation des fichiers

```
frontend/
└── app/
    └── settings-smtp-detail/
        ├── index.html
        ├── components/
        │   └── (composants partagés)
        └── js/
            └── toggle-password.js
```

### Fichier principal
- **HTML** : `frontend/app/settings-smtp-detail/index.html`
- **Point d'entrée** : Initialise la page Alpine.js avec PouchDB

### Fichier workflow
- **JS** : `frontend/app/settings-smtp-detail/js/toggle-password.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/settings-smtp-detail/js/toggle-password.js
export function togglePassword() {
  // Implementation avec PouchDB (action UI)
}
```

## Implementation (PouchDB)

```javascript
togglePassword() {
  // 1. Toggle l'état d'affichage
  this.showPassword = !this.showPassword;
  
  // 2. Pas de persistance nécessaire (état UI uniquement)
}
```

## Notes

- **Action UI uniquement** : Ce workflow ne touche pas à PouchDB
- **Pas de persistance** : L'état showPassword est temporaire et local
- **Offline** : ✅ Fonctionne offline

---

## Migration depuis l'ancienne architecture

| Aspect | Avant | Après (PouchDB) |
|--------|-------|-----------------|
| Action | Côté client uniquement | **Conservé** - Côté client |
| Persistance | Non persistante | **Conservé** - Non persistante |
| Latence | Instantanée | Instantanée |
| Offline | ✅ Oui | ✅ Oui |
