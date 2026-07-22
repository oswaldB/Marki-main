# Workflow : Tester email (PouchDB + API Backend)

## Écran
`sequences-relance-detail.html`

## Élément déclencheur
Bouton avec `@click="testerEmail(idx)"`

## Action
Envoyer un email de test

## Description

Envoie un email de test pour vérifier le rendu sans impact sur les destinataires réels.

**Workflow backend** : `test-single`
- Le frontend appelle le workflow backend `test-single`
- Le backend récupère les données depuis PouchDB (via réplication)
- Le backend génère l'email avec les variables du payeur sélectionné
- Le backend envoie l'email à l'adresse de test fournie
- Retour : confirmation d'envoi ou erreur

**Note** : L'appel API backend est **conservé** car l'envoi d'email nécessite un serveur SMTP et ne peut pas être fait côté client.

## Data Model
**Page Function:** `sequencesRelanceDetailPage()`

**Stores Alpine.js:**
- $store.ui

**Données (depuis PouchDB):**
- `sequence` - séquence depuis PouchDB
- `etapes`
- `modeles`
- `activeTab`
- `draggingEtape`
- `editingEtape`
- `editorInstance`
- `db` - instance PouchDB

**États UI:**
- `loading`
- `error`
- `saving`
- `hasChanges`
- `testResult`
- `showEtapeModal`
- `showModeleModal`
- `showDeleteEtapeModal`

## State Changes

**Modifications:**
- `testResult` modifié avec le résultat du test
- Toast de confirmation ou d'erreur affiché

## PouchDB Operations

**Lecture uniquement** - Les données de la séquence sont lues depuis PouchDB et envoyées au backend pour génération de l'email.

**Note** : L'appel API est conservé car l'envoi d'email nécessite un serveur SMTP.

## API Calls

**Workflow backend** : `test-single`

**Conservé** car l'envoi d'email nécessite:
- Un serveur SMTP
- Des credentials sécurisés
- Un traitement côté serveur

| Méthode | Endpoint | Body | Description |
|---------|----------|------|-------------|
| `POST` | `/api/workflows/test-single/execute` | `{ email_index: number, scenario: string, destinataire: string, payeur_id: string, sequence_data: object }` | Envoie un email de test avec le scénario sélectionné |

**Données envoyées** :
- `email_index` (number) : Index de l'email à tester dans la séquence
- `scenario` (string) : Format du scénario ('single', 'multiple', 'broker', 'both')
- `destinataire` (string) : Adresse email de test
- `payeur_id` (string) : ID du payeur pour récupérer les variables
- `sequence_data` (object) : Données complètes de la séquence depuis PouchDB

**Réponse** : `{ success: boolean, sent: boolean, preview?: object, error?: string }`

## Organisation des fichiers

```
frontend/
└── app/
    └── sequences-relance-detail/
        ├── index.html
        ├── components/
        │   └── (composants partagés)
        └── js/
            └── tester-email.js
```

### Fichier principal
- **HTML** : `frontend/app/sequences-relance-detail/index.html`
- **Point d'entrée** : Initialise la page Alpine.js avec PouchDB

### Fichier workflow
- **JS** : `frontend/app/sequences-relance-detail/js/tester-email.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/sequences-relance-detail/js/tester-email.js
export async function testerEmail() {
  // Implementation avec PouchDB + API backend
}
```

## Implementation (PouchDB + API)

```javascript
async testerEmail(idx) {
  this.testing = true;
  this.testResult = null;
  
  try {
    // 1. Récupérer les données depuis PouchDB
    const sequence = await db.get('sequence:' + this.sequenceId);
    const email = sequence.emails[idx];
    
    // 2. Préparer les données pour le backend
    const testData = {
      email_index: idx,
      scenario: email.activeScenario || 'single',
      destinataire: this.testEmailAddress,
      payeur_id: this.selectedPayeurId,
      sequence_data: {
        nom: sequence.nom,
        emails: sequence.emails,
        modeles_email: sequence.modeles_email
      }
    };
    
    // 3. Appeler le workflow backend (conservé - nécessite serveur SMTP)
    const response = await fetch('/api/workflows/test-single/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testData)
    });
    
    const data = await response.json();
    
    // 4. Store result
    this.testResult = {
      success: data.success,
      sent: data.sent,
      message: data.success ? 'Email de test envoyé' : data.error
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

- **API conservée** : L'envoi d'email nécessite un serveur SMTP côté backend
- **Données depuis PouchDB** : Les données de la séquence sont lues localement avant envoi
- **Pas de modification** : Ce workflow ne modifie pas PouchDB, il lit seulement

---

## Migration depuis l'ancienne architecture

| Aspect | Avant | Après (PouchDB + API) |
|--------|-------|----------------------|
| Source données | API backend | PouchDB local |
| Envoi email | `POST /api/workflows/test-single/execute` | **Conservé** - Nécessite backend |
| Latence | ~500ms-2s | ~10-50ms (lecture) + ~500ms-2s (envoi) |
| Offline | ❌ Impossible | ⚠️ Test nécessite connexion |
