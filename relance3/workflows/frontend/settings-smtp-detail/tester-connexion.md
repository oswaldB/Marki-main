# Workflow : Tester connexion SMTP (PouchDB + API Backend)

## Écran
`settings-smtp-detail.html`

## Élément déclencheur
Bouton avec `@click="testerConnexion()"`

## Action
Tester la connexion au serveur SMTP

## Description
- Récupère les données du profil depuis PouchDB
- Tente une connexion via le backend
- Affiche le résultat

**Note** : L'appel API backend est **conservé** car le test SMTP nécessite une connexion serveur avec `nodemailer`.

## Data Model
**Page Function:** `settingsSmtpDetailPage()`

**Stores Alpine.js:**
- $store.ui

**Données (depuis PouchDB):**
- `profil` - profil SMTP depuis PouchDB
- `testResult` - résultat du test
- `db` - instance PouchDB

**États UI:**
- `loading`
- `error`
- `saving`
- `editMode`
- `testing`

## State Changes

**Modifications:**
- `testing` passe à true/false
- `testResult` modifié

## PouchDB Operations

**Lecture uniquement** - Les données du profil sont lues depuis PouchDB et envoyées au backend pour le test.

**Note** : L'appel API est conservé car le test SMTP nécessite une connexion serveur.

## API Calls

**`POST /functions/testSmtpProfile`** - Appelle le workflow backend pour tester le profil SMTP

**Conservé** car le test SMTP nécessite:
- Une connexion au serveur SMTP
- Des credentials sécurisés
- Un traitement côté serveur avec `nodemailer`

**Payload:**
```json
{
  "profileId": "smtp-profile:abc123",
  "profileData": { ... } // Données du profil depuis PouchDB
}
```

**Response:**
```json
{
  "success": true,
  "message": "Connexion SMTP testée avec succès. Email envoyé."
}
```

**Note** : Même workflow backend que `settings-smtp/test-profil.md`.

## Organisation des fichiers

```
frontend/
└── app/
    └── settings-smtp-detail/
        ├── index.html
        ├── components/
        │   └── (composants partagés)
        └── js/
            └── tester-connexion.js
```

### Fichier principal
- **HTML** : `frontend/app/settings-smtp-detail/index.html`
- **Point d'entrée** : Initialise la page Alpine.js avec PouchDB

### Fichier workflow
- **JS** : `frontend/app/settings-smtp-detail/js/tester-connexion.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/settings-smtp-detail/js/tester-connexion.js
export async function testerConnexion() {
  // Implementation avec PouchDB + API backend
}
```

## Implementation (PouchDB + API)

```javascript
async testerConnexion() {
  // 1. Set testing state
  this.testing = true;
  this.testResult = null;
  
  try {
    // 2. Récupérer les données depuis PouchDB (pour avoir la dernière version)
    const doc = await db.get(this.profil._id);
    
    // 3. Call test API avec les données du profil
    const response = await fetch('/functions/testSmtpProfile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        profileId: this.profil._id,
        profileData: {
          host: doc.host,
          port: doc.port,
          secure: doc.secure,
          username: doc.username,
          password: doc.password,
          from_email: doc.from_email,
          from_name: doc.from_name
        }
      })
    });
    
    const data = await response.json();
    
    // 4. Store result
    this.testResult = {
      success: data.success,
      message: data.message || (data.success ? 'Test réussi' : data.error?.message)
    };
    
    // 5. Notify
    this.toast(
      this.testResult.message,
      data.success ? 'success' : 'error'
    );
    
  } catch (error) {
    this.testResult = { success: false, message: error.message };
    this.toast(error.message, 'error');
  } finally {
    this.testing = false;
  }
}
```

## Notes

- **API conservée** : Le test SMTP nécessite une connexion serveur avec `nodemailer`
- **Données depuis PouchDB** : Les données du profil sont lues localement avant le test
- **Pas de modification** : Ce workflow ne modifie pas PouchDB, il lit seulement

---

## Migration depuis l'ancienne architecture

| Aspect | Avant | Après (PouchDB + API) |
|--------|-------|----------------------|
| Source données | Props/Store | PouchDB local |
| Test SMTP | `POST /functions/testSmtpProfile` | **Conservé** - Nécessite backend |
| Latence | ~1-3s | ~10-50ms (lecture) + ~1-3s (test) |
| Offline | ❌ Impossible | ⚠️ Test nécessite connexion |
