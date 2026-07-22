# Workflow : Tester profil SMTP (PouchDB + API Backend)

## Écran
`settings-smtp.html`

## Élément déclencheur
Lien avec `@click="testerProfil(profil)"`

## Action
Tester la connexion SMTP

## Description
- Récupère les données du profil depuis PouchDB
- Envoie un email de test via le backend
- Vérifie la configuration
- Affiche le résultat

**Note** : L'appel API backend est **conservé** car le test SMTP nécessite une connexion serveur et ne peut pas être fait côté client.

## Data Model
**Page Function:** `settingsSmtpPage()`

**Stores Alpine.js:**
- $store.ui

**Données (depuis PouchDB):**
- `profils` - profils SMTP depuis PouchDB
- `newProfil`
- `testingProfil` - profil en cours de test
- `testResult` - résultat du test
- `db` - instance PouchDB

**États UI:**
- `loading`
- `error`
- `showNewProfilForm`
- `testingProfil`

## State Changes

**Modifications:**
- `testingProfil` modifié
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

## Organisation des fichiers

```
frontend/
└── app/
    └── settings-smtp/
        ├── index.html
        ├── components/
        │   └── (composants partagés)
        └── js/
            └── test-profil.js
```

### Fichier principal
- **HTML** : `frontend/app/settings-smtp/index.html`
- **Point d'entrée** : Initialise la page Alpine.js avec PouchDB

### Fichier workflow
- **JS** : `frontend/app/settings-smtp/js/test-profil.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/settings-smtp/js/test-profil.js
export async function testerProfil() {
  // Implementation avec PouchDB + API backend
}
```

## Implementation (PouchDB + API)

```javascript
async testerProfil(profil) {
  // 1. Set testing state
  this.testingProfil = profil._id;
  this.testResult = null;
  
  try {
    // 2. Récupérer les données depuis PouchDB (pour avoir la dernière version)
    const doc = await db.get(profil._id);
    
    // 3. Call test API avec les données du profil
    const response = await fetch('/functions/testSmtpProfile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        profileId: profil._id,
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
      profilId: profil._id,
      success: data.success,
      message: data.message || (data.success ? 'Test réussi' : data.error?.message)
    };
    
    // 5. Notify
    this.toast(
      this.testResult.message,
      data.success ? 'success' : 'error'
    );
    
  } catch (error) {
    this.testResult = { profilId: profil._id, success: false, message: error.message };
    this.toast(error.message, 'error');
  } finally {
    this.testingProfil = null;
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
