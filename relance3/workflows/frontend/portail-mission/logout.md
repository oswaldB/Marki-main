# Workflow : Déconnexion portail mission (PouchDB)

## Écran
`portail-mission.html`

## Élément déclencheur
Bouton avec `@click="logout()"`

## Action
Déconnecter l'utilisateur du portail mission

## Description
- Détruit la session côté client
- **Optionnel** : Ferme les connexions PouchDB actives
- Redirige vers la page de login ou accueil

## Data Model
**Page Function:** `portailMissionPage()`

**Données (PouchDB):**
- `db` - instance PouchDB (à fermer proprement)
- `mission`
- `documents`
- `paiements`

**États UI:**
- `loading`
- `error`
- `activeTab`

## State Changes

**Modifications:**
- Session vidée
- PouchDB sync arrêté (optionnel)

## PouchDB Operations (optionnel)

**Action:** Fermeture propre de la connexion PouchDB si nécessaire.

**Méthodes utilisées:**
- Pas de méthode spécifique - le portail mission utilise un lien temporaire, pas de session persistante

**Note** : Le portail mission fonctionne avec un **lien temporaire signé**, pas une session d'authentification classique. Le "logout" est principalement une action UI qui redirige l'utilisateur.

## API Calls

**Pas d'appel API** - Action côté client uniquement

## Organisation des fichiers

```
frontend/
└── app/
    └── portail-mission/
        ├── index.html
        ├── components/
        │   └── (composants partagés)
        └── js/
            └── logout.js
```

### Fichier principal
- **HTML** : `frontend/app/portail-mission/index.html`
- **Point d'entrée** : Initialise la page Alpine.js avec PouchDB

### Fichier workflow
- **JS** : `frontend/app/portail-mission/js/logout.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/portail-mission/js/logout.js
export function logout() {
  // Implementation avec gestion PouchDB
}
```

## Implementation

```javascript
logout() {
  // 1. Optionnel: Arrêter les sync PouchDB actives
  if (this.syncHandler) {
    this.syncHandler.cancel();
    this.syncHandler = null;
  }
  
  // 2. Clear les stores Alpine
  Alpine.store('auth').token = null;
  Alpine.store('auth').user = null;
  Alpine.store('auth').isAuthenticated = false;
  
  // 3. Clear localStorage (si données persistantes)
  localStorage.removeItem('marki:auth:token');
  localStorage.removeItem('marki:last_sync');
  
  // 4. Note: Les données PouchDB restent en local pour usage futur
  // Si besoin de vider complètement: await db.destroy();
  
  // 5. Redirect vers login ou page d'accueil
  window.location.href = '/login';
}

// Option: Vider complètement PouchDB (rarement nécessaire)
async logoutAndClearPouchDB() {
  // Arrêter le sync
  if (this.syncHandler) {
    this.syncHandler.cancel();
  }
  
  // Détruire les bases locales (attention: données perdues!)
  await db.destroy();
  await dbContacts.destroy();
  
  // Rediriger
  window.location.href = '/login';
}
```

## Notes

- **Portail temporaire** : Le portail mission fonctionne avec un lien signé à durée limitée, pas une session classique
- **PouchDB persistant** : Les données PouchDB restent en local après "logout" pour permettre un usage offline futur
- **Nettoyage optionnel** : La destruction de PouchDB (`db.destroy()`) est rarement nécessaire
- **Sync annulé** : Les handlers de sync actifs sont annulés pour éviter des erreurs

---

## Migration depuis l'ancienne architecture

| Aspect | Avant | Après (PouchDB) |
|--------|-------|-----------------|
| Session | localStorage | **Conservé** - localStorage |
| Données locales | Non applicable | PouchDB persiste après logout |
| Nettoyage | localStorage.clear() | Optionnel - `db.destroy()` |
| Redirection | `/login` | **Conservé** - `/login` |
